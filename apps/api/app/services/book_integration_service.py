import logging
import re
import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import CurrentUser
from app.models.catalog import Author, Book, BookAuthor, BookGenre, Genre, Publisher
from app.models.shelf import BookStatus, UserBook
from app.schemas.book_search import (
    BookImportConfirmRequest,
    BookImportConfirmResponse,
    ExternalBookItem,
)
from app.schemas.catalog import BookRead, slugify
from app.services.book_cover_service import BookCoverService
from app.services.book_providers.base import BaseBookProvider
from app.services.book_providers.brasil_api import BrasilApiProvider
from app.services.book_providers.google_books import GoogleBooksProvider
from app.services.book_providers.open_library import OpenLibraryProvider

logger = logging.getLogger(__name__)


class BookIntegrationService:
    """
    Serviço central de integração bibliográfica externa.
    Isola a comunicação com provedores externos (BrasilAPI/CBL, Google Books, Open Library),
    implementa priorização de edições brasileiras, fallback transparente e gerencia
    a criação ou reaproveitamento seguro de livros.
    """

    def __init__(self) -> None:
        self._providers: dict[str, BaseBookProvider] = {
            "brasil_api": BrasilApiProvider(),
            "google_books": GoogleBooksProvider(),
            "open_library": OpenLibraryProvider(),
        }
        self._default_provider_name = "google_books"

    def get_provider(self, name: str | None = None) -> BaseBookProvider:
        if name and name in self._providers:
            return self._providers[name]
        return self._providers[self._default_provider_name]

    @staticmethod
    def normalize_isbn(isbn_raw: str | None) -> str | None:
        if not isbn_raw:
            return None
        clean = re.sub(r"[^0-9X]", "", isbn_raw.strip().upper())
        return clean if clean else None

    @staticmethod
    def parse_publication_date(raw: str | None) -> date | None:
        """
        Interpreta formatos de data bibliográfica (ex: '2021-05-12', '1997-06', '2005').
        Retorna um objeto date ou None se não for interpretável.
        """
        if not raw:
            return None
        raw_str = raw.strip()
        # YYYY-MM-DD
        try:
            return datetime.strptime(raw_str[:10], "%Y-%m-%d").date()
        except (ValueError, IndexError):
            pass
        # YYYY-MM
        try:
            return datetime.strptime(raw_str[:7], "%Y-%m").date()
        except (ValueError, IndexError):
            pass
        # Extrai ano de 4 dígitos (ex: '1997', 'c1984', '2005?')
        match = re.search(r"(?<!\d)(1[5-9]\d{2}|20\d{2})(?!\d)", raw_str)
        if match:
            try:
                year = int(match.group(1))
                return date(year, 1, 1)
            except ValueError:
                pass
        return None

    async def search_external_books(
        self,
        db: Session,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        isbn: str | None = None,
        provider_name: str | None = None,
        limit: int = 12,
        current_user: CurrentUser | None = None,
    ) -> list[ExternalBookItem]:
        """
        Pesquisa livros externamente e correlaciona com o catálogo local e a estante do leitor.
        Para buscas por ISBN, prioriza a BrasilAPI (CBL - Câmara Brasileira do Livro)
        para resgatar a edição brasileira oficial.
        Aplica fallback automático entre provedores em cascata se nada for localizado.
        """
        # 1. Identifica se a busca possui código ISBN válido (10 ou 13 dígitos)
        clean_isbn_target: str | None = None
        clean_raw_isbn = self.normalize_isbn(isbn)
        if clean_raw_isbn:
            if len(clean_raw_isbn) in (10, 13):
                clean_isbn_target = clean_raw_isbn
            else:
                # Código numérico não é um ISBN de 10 ou 13 dígitos (ex: UPC de 12 dígitos)
                # Não envia para filtro estrito de ISBN; se query não tiver sido fornecida, pesquisa como texto
                if not query:
                    query = isbn
        elif query:
            candidate = self.normalize_isbn(query)
            if candidate and len(candidate) in (10, 13):
                clean_isbn_target = candidate

        results: list[ExternalBookItem] = []

        # 2. Se houver ISBN válido (10 ou 13 dígitos), consulta primeiro a BrasilAPI
        if clean_isbn_target and (not provider_name or provider_name == "brasil_api"):
            brasil_provider = self._providers["brasil_api"]
            cbl_item = await brasil_provider.get_by_isbn(clean_isbn_target)
            if cbl_item:
                results.append(cbl_item)

        # 3. Se não houver resultados (ou a busca for por título/autor/termo textual):
        if not results:
            # Constrói sequência de consulta e fallback em cascata
            search_sequence: list[str] = []
            if provider_name and provider_name in self._providers:
                search_sequence.append(provider_name)
                for fallback in ("google_books", "open_library", "brasil_api"):
                    if fallback not in search_sequence:
                        search_sequence.append(fallback)
            else:
                search_sequence = ["google_books", "open_library"]

            for p_name in search_sequence:
                provider = self._providers[p_name]
                # A BrasilAPI só busca por ISBN; se não houver ISBN, pula para o próximo provedor
                if p_name == "brasil_api" and not clean_isbn_target:
                    continue

                try:
                    prov_results = await provider.search(
                        query=query,
                        title=title,
                        author=author,
                        isbn=clean_isbn_target,
                        limit=limit,
                    )
                    if prov_results:
                        results = prov_results
                        break
                except Exception as exc:
                    logger.warning("Falha ao consultar provedor bibliográfico '%s': %s", p_name, exc)
                    continue

        if not results:
            return []

        # Correlaciona com o catálogo local e estante
        return self._correlate_with_local_database(
            db=db,
            items=results,
            current_user=current_user,
        )

    def _correlate_with_local_database(
        self,
        db: Session,
        items: list[ExternalBookItem],
        current_user: CurrentUser | None,
    ) -> list[ExternalBookItem]:
        """
        Cruza os resultados com a tabela 'books' (por ISBN13, ISBN10 ou Título+Autor)
        e com 'user_books' para informar se o livro já existe no catálogo ou na estante.
        """
        user_id = current_user.id if current_user else None

        for item in items:
            clean_13 = self.normalize_isbn(item.isbn13)
            clean_10 = self.normalize_isbn(item.isbn10)

            matched_book: Book | None = None

            # 1. Busca local por ISBN13
            if clean_13:
                matched_book = db.execute(
                    select(Book).where(Book.isbn13 == clean_13)
                ).scalar_one_or_none()

            # 2. Busca local por ISBN10
            if not matched_book and clean_10:
                matched_book = db.execute(
                    select(Book).where(Book.isbn10 == clean_10)
                ).scalar_one_or_none()

            # 3. Busca por título exato + autor primário
            if not matched_book and item.title and item.authors:
                clean_title = item.title.strip()
                primary_author = item.authors[0].strip()
                stmt = (
                    select(Book)
                    .join(Book.authors)
                    .where(
                        func.lower(Book.title) == clean_title.lower(),
                        func.lower(Author.name) == primary_author.lower(),
                    )
                )
                matched_book = db.execute(stmt).scalars().first()

            if matched_book:
                item.is_already_in_catalog = True
                item.existing_book_id = matched_book.id

                # Verifica se está na estante do usuário
                if user_id:
                    user_book = db.execute(
                        select(UserBook).where(
                            UserBook.user_id == user_id,
                            UserBook.book_id == matched_book.id,
                        )
                    ).scalar_one_or_none()

                    if user_book:
                        item.is_on_user_shelf = True
                        item.user_book_id = user_book.id
                        item.user_book_status = user_book.status.value

        return items

    def confirm_or_reuse_book(
        self,
        db: Session,
        payload: BookImportConfirmRequest,
        current_user: CurrentUser | None = None,
    ) -> BookImportConfirmResponse:
        """
        Fluxo de confirmação:
        1. Verifica se o livro já existe no banco (por ISBN ou identificação confiável).
        2. Se existir, reutiliza sem criar duplicata.
        3. Se não existir, cadastra no catálogo global (com autores e editora resolvidos/criados).
        4. Opcionalmente, adiciona à estante pessoal do usuário autenticado.
        """
        clean_isbn13 = self.normalize_isbn(payload.isbn13)
        clean_isbn10 = self.normalize_isbn(payload.isbn10)

        # Garante integridade do tamanho dos ISBNs para armazenamento no banco
        if clean_isbn13 and len(clean_isbn13) != 13:
            if len(clean_isbn13) == 10 and not clean_isbn10:
                clean_isbn10 = clean_isbn13
            clean_isbn13 = None

        if clean_isbn10 and len(clean_isbn10) != 10:
            if len(clean_isbn10) == 13 and not clean_isbn13:
                clean_isbn13 = clean_isbn10
            clean_isbn10 = None

        # Resolve data de publicação estruturada
        parsed_pub_date = payload.publication_date or self.parse_publication_date(
            payload.published_date_raw
        )

        existing_book: Book | None = None

        # 1. Identificação por ISBN13
        if clean_isbn13:
            existing_book = (
                db.execute(
                    select(Book)
                    .options(
                        selectinload(Book.publisher),
                        selectinload(Book.authors),
                        selectinload(Book.genres),
                    )
                    .where(Book.isbn13 == clean_isbn13)
                )
                .scalars()
                .first()
            )

        # 2. Identificação por ISBN10
        if not existing_book and clean_isbn10:
            existing_book = (
                db.execute(
                    select(Book)
                    .options(
                        selectinload(Book.publisher),
                        selectinload(Book.authors),
                        selectinload(Book.genres),
                    )
                    .where(Book.isbn10 == clean_isbn10)
                )
                .scalars()
                .first()
            )

        # 3. Identificação por Título e Autor Primário
        if not existing_book and payload.title and payload.authors:
            primary_author = payload.authors[0].strip()
            existing_book = (
                db.execute(
                    select(Book)
                    .join(Book.authors)
                    .options(
                        selectinload(Book.publisher),
                        selectinload(Book.authors),
                        selectinload(Book.genres),
                    )
                    .where(
                        func.lower(Book.title) == payload.title.strip().lower(),
                        func.lower(Author.name) == primary_author.lower(),
                    )
                )
                .scalars()
                .first()
            )

        reused = False

        if existing_book:
            # REUTILIZA O LIVRO EXISTENTE!
            reused = True
            book = existing_book

            # Enriquecimento suave se o livro local estiver incompleto
            modified = False
            if not book.cover_url and payload.cover_url and "covers.openlibrary.org" not in payload.cover_url:
                book.cover_url = payload.cover_url
                book.thumbnail_url = payload.thumbnail_url or payload.cover_url
                modified = True
            elif not book.cover_url or "covers.openlibrary.org" in book.cover_url:
                resolved_cov, resolved_th = BookCoverService.resolve_best_cover_sync(
                    isbn13=book.isbn13 or clean_isbn13, isbn10=book.isbn10 or clean_isbn10
                )
                if resolved_cov:
                    book.cover_url = resolved_cov
                    book.thumbnail_url = resolved_th
                    modified = True
                elif book.cover_url and "covers.openlibrary.org" in book.cover_url:
                    book.cover_url = None
                    book.thumbnail_url = None
                    modified = True

            if not book.description and payload.description:
                book.description = payload.description
                modified = True
            if not book.page_count and payload.page_count and payload.page_count > 0:
                book.page_count = payload.page_count
                modified = True
            if not book.publication_date and parsed_pub_date:
                book.publication_date = parsed_pub_date
                modified = True
            if not book.isbn13 and clean_isbn13:
                book.isbn13 = clean_isbn13
                modified = True
            if not book.isbn10 and clean_isbn10:
                book.isbn10 = clean_isbn10
                modified = True

            if modified:
                db.commit()
                db.refresh(book)

            message = "Livro existente no catálogo reutilizado com sucesso sem duplicações."
        else:
            # CADASTRA NOVO LIVRO NO CATÁLOGO
            reused = False

            # Resolve ou cria Editora
            publisher_id = None
            if payload.publisher and payload.publisher.strip():
                pub_name = payload.publisher.strip()
                pub = db.execute(
                    select(Publisher).where(func.lower(Publisher.name) == pub_name.lower())
                ).scalar_one_or_none()
                if not pub:
                    pub = Publisher(name=pub_name)
                    db.add(pub)
                    db.flush()
                publisher_id = pub.id

            # Resolução e validação da capa (Google Books + Open Library com verificação real)
            final_cov = payload.cover_url
            final_th = payload.thumbnail_url or payload.cover_url
            if not final_cov or "covers.openlibrary.org" in final_cov:
                resolved_cov, resolved_th = BookCoverService.resolve_best_cover_sync(
                    isbn13=clean_isbn13, isbn10=clean_isbn10
                )
                if resolved_cov:
                    final_cov = resolved_cov
                    final_th = resolved_th
                elif final_cov and "covers.openlibrary.org" in final_cov:
                    final_cov = None
                    final_th = None

            # Cria a entidade Book
            book = Book(
                title=payload.title.strip(),
                subtitle=payload.subtitle.strip() if payload.subtitle else None,
                description=payload.description.strip() if payload.description else None,
                isbn10=clean_isbn10,
                isbn13=clean_isbn13,
                page_count=payload.page_count if payload.page_count and payload.page_count > 0 else None,
                publication_date=parsed_pub_date,
                language=payload.language or "pt-BR",
                cover_url=final_cov,
                thumbnail_url=final_th,
                publisher_id=publisher_id,
            )
            db.add(book)
            db.flush()

            # Resolve ou cria Autores (com deduplicação de instâncias para book_authors)
            if payload.authors:
                seen_author_ids: set[uuid.UUID] = set()
                for author_name_raw in payload.authors:
                    author_name = author_name_raw.strip()
                    if not author_name:
                        continue
                    author = db.execute(
                        select(Author).where(func.lower(Author.name) == author_name.lower())
                    ).scalar_one_or_none()
                    if not author:
                        author = Author(name=author_name)
                        db.add(author)
                        db.flush()

                    if author.id not in seen_author_ids:
                        is_primary = (len(seen_author_ids) == 0)
                        seen_author_ids.add(author.id)
                        db.add(
                            BookAuthor(
                                book_id=book.id,
                                author_id=author.id,
                                is_primary=is_primary,
                            )
                        )

            # Resolve ou cria Gêneros (com deduplicação estrita de IDs para book_genres)
            if payload.genres:
                seen_genre_ids: set[uuid.UUID] = set()
                for genre_raw in payload.genres:
                    genre_name = genre_raw.strip()
                    if not genre_name:
                        continue
                    genre_slug = slugify(genre_name)
                    genre = db.execute(
                        select(Genre).where(
                            or_(
                                Genre.slug == genre_slug,
                                func.lower(Genre.name) == genre_name.lower(),
                            )
                        )
                    ).scalar_one_or_none()
                    if not genre:
                        genre = Genre(name=genre_name, slug=genre_slug)
                        db.add(genre)
                        db.flush()

                    if genre.id not in seen_genre_ids:
                        seen_genre_ids.add(genre.id)
                        db.add(BookGenre(book_id=book.id, genre_id=genre.id))

            db.commit()

            # Recarrega relações
            stmt = (
                select(Book)
                .options(
                    selectinload(Book.publisher),
                    selectinload(Book.authors),
                    selectinload(Book.genres),
                )
                .where(Book.id == book.id)
            )
            book = db.execute(stmt).scalar_one()
            message = "Novo livro cadastrado com sucesso no catálogo global."

        # Ação opcional: Adicionar à estante do usuário
        already_on_shelf = False
        user_book_id: uuid.UUID | None = None

        if payload.add_to_shelf and current_user:
            user_id = current_user.id
            existing_user_book = db.execute(
                select(UserBook).where(
                    UserBook.user_id == user_id,
                    UserBook.book_id == book.id,
                )
            ).scalar_one_or_none()

            if existing_user_book:
                already_on_shelf = True
                user_book_id = existing_user_book.id
                message += " O livro já estava salvo na sua estante."
            else:
                target_status = BookStatus.WANT_TO_READ
                if payload.shelf_status:
                    try:
                        target_status = BookStatus(payload.shelf_status)
                    except ValueError:
                        target_status = BookStatus.WANT_TO_READ

                new_user_book = UserBook(
                    user_id=user_id,
                    book_id=book.id,
                    status=target_status,
                    started_at=datetime.now(UTC) if target_status == BookStatus.READING else None,
                    finished_at=datetime.now(UTC) if target_status == BookStatus.READ else None,
                )
                db.add(new_user_book)
                db.commit()
                db.refresh(new_user_book)
                user_book_id = new_user_book.id
                message += " Adicionado com sucesso à sua estante pessoal!"

        return BookImportConfirmResponse(
            book=BookRead.model_validate(book),
            reused=reused,
            already_on_shelf=already_on_shelf,
            user_book_id=user_book_id,
            message=message,
        )

    def sync_missing_covers(self, db: Session) -> dict[str, Any]:
        """
        Percorre todos os livros do catálogo sem capa ou com URL cega/inválida
        e recupera automaticamente a melhor capa do Google Books / Open Library.
        """
        books = (
            db.query(Book)
            .filter(
                or_(
                    Book.cover_url.is_(None),
                    Book.cover_url.like("%covers.openlibrary.org%"),
                )
            )
            .all()
        )

        total = len(books)
        updated_count = 0

        for book in books:
            target_13 = book.isbn13
            target_10 = book.isbn10
            if not target_13 and not target_10:
                continue

            rc, rt = BookCoverService.resolve_best_cover_sync(
                isbn13=target_13, isbn10=target_10
            )
            if rc:
                book.cover_url = rc
                book.thumbnail_url = rt
                updated_count += 1
            elif book.cover_url and "covers.openlibrary.org" in book.cover_url:
                book.cover_url = None
                book.thumbnail_url = None

        if updated_count > 0:
            db.commit()

        return {
            "total_checked": total,
            "updated": updated_count,
            "message": f"{updated_count} de {total} livro(s) atualizados com capas reais!",
        }


# Instância singleton do serviço
book_integration_service = BookIntegrationService()
