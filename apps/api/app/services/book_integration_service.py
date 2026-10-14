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

    def _search_local_database(
        self,
        db: Session,
        isbn: str | None = None,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        limit: int = 10,
    ) -> list[Book]:
        """
        Busca livros no catálogo interno do TeleBooks.
        Permite que livros criados manualmente por outros usuários ou salvos no sistema
        sejam imediatamente localizados por ISBN, título ou autor.
        """
        books: list[Book] = []
        clean_isbn = self.normalize_isbn(isbn)

        # 1. Busca por ISBN (10 ou 13 dígitos)
        if clean_isbn and len(clean_isbn) in (10, 13):
            stmt = (
                select(Book)
                .options(
                    selectinload(Book.publisher),
                    selectinload(Book.authors),
                    selectinload(Book.genres),
                )
                .where(or_(Book.isbn13 == clean_isbn, Book.isbn10 == clean_isbn))
            )
            found = db.execute(stmt).scalars().all()
            if found:
                books.extend(found)

        # 2. Busca por título / autor / query textual
        conditions = []
        if title and title.strip():
            clean_t = title.strip()
            conditions.append(Book.title.ilike(f"%{clean_t}%"))
        if query and query.strip():
            clean_q = query.strip()
            clean_q_isbn = self.normalize_isbn(clean_q)
            if clean_q_isbn and len(clean_q_isbn) in (10, 13):
                conditions.append(or_(Book.isbn13 == clean_q_isbn, Book.isbn10 == clean_q_isbn))
            else:
                conditions.append(
                    or_(
                        Book.title.ilike(f"%{clean_q}%"),
                        Book.description.ilike(f"%{clean_q}%"),
                        Book.author_name.ilike(f"%{clean_q}%"),
                    )
                )

        if conditions or (author and author.strip()):
            stmt = (
                select(Book)
                .options(
                    selectinload(Book.publisher),
                    selectinload(Book.authors),
                    selectinload(Book.genres),
                )
            )
            if author and author.strip():
                clean_a = author.strip()
                stmt = stmt.outerjoin(Book.authors).where(
                    or_(
                        Author.name.ilike(f"%{clean_a}%"),
                        Book.author_name.ilike(f"%{clean_a}%"),
                    )
                )
            if conditions:
                stmt = stmt.where(or_(*conditions))

            stmt = stmt.limit(limit)
            found = db.execute(stmt).scalars().all()
            for b in found:
                if b.id not in [x.id for x in books]:
                    books.append(b)

        return books

    def _book_to_external_item(
        self,
        book: Book,
        db: Session,
        current_user: CurrentUser | None = None,
    ) -> ExternalBookItem:
        authors = [a.name for a in book.authors] if book.authors else ([book.author_name] if book.author_name else [])
        genres = [g.name for g in book.genres] if book.genres else []
        candidate_covers: list[str] = []
        if book.cover_url:
            candidate_covers.append(book.cover_url)
        if book.thumbnail_url and book.thumbnail_url not in candidate_covers:
            candidate_covers.append(book.thumbnail_url)

        item = ExternalBookItem(
            provider="telebooks",
            external_id=str(book.id),
            title=book.title,
            subtitle=book.subtitle,
            authors=authors,
            publisher=book.publisher.name if book.publisher else None,
            published_date=str(book.publication_date) if book.publication_date else None,
            description=book.description,
            isbn10=book.isbn10,
            isbn13=book.isbn13,
            page_count=book.page_count,
            language="pt-BR",
            categories=genres,
            cover_url=book.cover_url,
            thumbnail_url=book.thumbnail_url or book.cover_url,
            candidate_covers=candidate_covers,
            is_already_in_catalog=True,
            existing_book_id=book.id,
        )

        if current_user:
            user_uuid = (
                uuid.UUID(str(current_user.id))
                if isinstance(current_user.id, str)
                else current_user.id
            )
            user_book = db.execute(
                select(UserBook).where(
                    UserBook.user_id == user_uuid,
                    UserBook.book_id == book.id,
                )
            ).scalar_one_or_none()
            if user_book:
                item.is_on_user_shelf = True
                item.user_book_id = user_book.id
                item.user_book_status = user_book.status.value

        return item

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
        Pesquisa livros no catálogo interno do TeleBooks e em provedores externos.
        Garante que livros cadastrados manualmente por qualquer usuário sejam imediatamente
        encontrados por ISBN, título ou autor por todos os usuários do sistema.
        """
        # 1. Identifica se a busca possui código ISBN válido (10 ou 13 dígitos)
        clean_isbn_target: str | None = None
        clean_raw_isbn = self.normalize_isbn(isbn)
        if clean_raw_isbn:
            if len(clean_raw_isbn) in (10, 13):
                clean_isbn_target = clean_raw_isbn
            else:
                if not query:
                    query = isbn
        elif query:
            candidate = self.normalize_isbn(query)
            if candidate and len(candidate) in (10, 13):
                clean_isbn_target = candidate

        results: list[ExternalBookItem] = []

        # 2. Busca prioritária no catálogo global do TeleBooks (incluindo manuais)
        local_books = self._search_local_database(
            db=db,
            isbn=clean_isbn_target or isbn,
            query=query,
            title=title,
            author=author,
            limit=limit,
        )
        for lb in local_books:
            results.append(self._book_to_external_item(lb, db=db, current_user=current_user))

        # Já temos ISBNs encontrados localmente para evitar duplicar
        found_isbns = {
            self.normalize_isbn(r.isbn13) for r in results if r.isbn13
        } | {
            self.normalize_isbn(r.isbn10) for r in results if r.isbn10
        }

        # 3. Se houver ISBN válido e ainda não encontrado localmente, consulta BrasilAPI
        if (
            clean_isbn_target
            and clean_isbn_target not in found_isbns
            and (not provider_name or provider_name == "brasil_api")
        ):
            brasil_provider = self._providers["brasil_api"]
            cbl_item = await brasil_provider.get_by_isbn(clean_isbn_target)
            if cbl_item:
                # Enriquecimento cruzado se a BrasilAPI não trouxe autores ou número de páginas
                if not cbl_item.authors or not cbl_item.page_count:
                    try:
                        gb_prov = self._providers.get("google_books")
                        if gb_prov:
                            gb_item = await gb_prov.get_by_isbn(clean_isbn_target)
                            if gb_item:
                                if not cbl_item.authors and gb_item.authors:
                                    cbl_item.authors = gb_item.authors
                                if not cbl_item.page_count and gb_item.page_count:
                                    cbl_item.page_count = gb_item.page_count
                                if not cbl_item.publisher and gb_item.publisher:
                                    cbl_item.publisher = gb_item.publisher
                                if not cbl_item.description and gb_item.description:
                                    cbl_item.description = gb_item.description
                                if not cbl_item.cover_url and gb_item.cover_url:
                                    cbl_item.cover_url = gb_item.cover_url
                                    cbl_item.thumbnail_url = gb_item.thumbnail_url
                    except Exception as enrich_err:
                        logger.warning("Falha ao enriquecer dados com Google Books: %s", enrich_err)

                results.append(cbl_item)
                if cbl_item.isbn13:
                    found_isbns.add(self.normalize_isbn(cbl_item.isbn13))

        # 4. Se ainda não atingiu o limite ou busca por termo textual/fallback externo:
        if len(results) < limit and not (clean_isbn_target and len(results) > 0):
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
                if p_name == "brasil_api" and not clean_isbn_target:
                    continue

                try:
                    prov_results = await provider.search(
                        query=query,
                        title=title,
                        author=author,
                        isbn=clean_isbn_target,
                        limit=limit - len(results),
                    )
                    if prov_results:
                        for pr in prov_results:
                            pr_13 = self.normalize_isbn(pr.isbn13)
                            pr_10 = self.normalize_isbn(pr.isbn10)
                            if (pr_13 and pr_13 in found_isbns) or (pr_10 and pr_10 in found_isbns):
                                continue
                            results.append(pr)
                            if pr_13:
                                found_isbns.add(pr_13)
                            if pr_10:
                                found_isbns.add(pr_10)
                        if len(results) >= limit:
                            break
                except Exception as exc:
                    logger.warning("Falha ao consultar provedor bibliográfico '%s': %s", p_name, exc)
                    continue

        if not results:
            return []

        # Correlaciona itens externos restantes com o catálogo local e estante
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
        user_uuid: uuid.UUID | None = None
        if current_user:
            user_uuid = (
                uuid.UUID(str(current_user.id))
                if isinstance(current_user.id, str)
                else current_user.id
            )

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
                if matched_book.cover_url:
                    item.cover_url = matched_book.cover_url
                    item.thumbnail_url = matched_book.thumbnail_url or matched_book.cover_url
                    if matched_book.cover_url not in item.candidate_covers:
                        item.candidate_covers.insert(0, matched_book.cover_url)

                # Verifica se está na estante do usuário
                if user_uuid:
                    user_book = db.execute(
                        select(UserBook).where(
                            UserBook.user_id == user_uuid,
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
            if not getattr(book, "author_name", None) and payload.authors:
                clean_auths = [a.strip() for a in payload.authors if a.strip()]
                if clean_auths:
                    book.author_name = ", ".join(clean_auths)
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

            # Monta nome de autor denormalizado
            denorm_author_name = (
                ", ".join([a.strip() for a in payload.authors if a.strip()])
                if payload.authors
                else None
            )

            # Cria a entidade Book
            book = Book(
                title=payload.title.strip(),
                subtitle=payload.subtitle.strip() if payload.subtitle else None,
                description=payload.description.strip() if payload.description else None,
                isbn10=clean_isbn10,
                isbn13=clean_isbn13,
                author_name=denorm_author_name,
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
            user_id = (
                uuid.UUID(str(current_user.id))
                if isinstance(current_user.id, str)
                else current_user.id
            )
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
