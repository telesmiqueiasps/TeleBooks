import logging
import re
import uuid
from datetime import UTC, datetime

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
        Aplica fallback automático entre provedores se nada for localizado.
        """
        # 1. Identifica se a busca possui código ISBN (explícito ou termo com 10/13 dígitos)
        clean_isbn_target = self.normalize_isbn(isbn)
        if not clean_isbn_target and query:
            candidate = self.normalize_isbn(query)
            if candidate and len(candidate) in (10, 13):
                clean_isbn_target = candidate

        results: list[ExternalBookItem] = []

        # 2. Se houver ISBN, consulta PRIMEIRO a BrasilAPI (Câmara Brasileira do Livro - CBL)
        if clean_isbn_target and (not provider_name or provider_name == "brasil_api"):
            brasil_provider = self._providers["brasil_api"]
            cbl_item = await brasil_provider.get_by_isbn(clean_isbn_target)
            if cbl_item:
                results.append(cbl_item)

        # 3. Se não houver resultados ou a busca for por título/autor/termo textual:
        if not results:
            primary_name = provider_name or "google_books"
            primary_provider = self.get_provider(primary_name)
            results = await primary_provider.search(
                query=query,
                title=title,
                author=author,
                isbn=clean_isbn_target or isbn,
                limit=limit,
            )

            # Fallback automático se nada foi retornado
            if not results:
                fallback_name = (
                    "open_library" if primary_provider.name == "google_books" else "google_books"
                )
                fallback_provider = self._providers.get(fallback_name)
                if fallback_provider:
                    logger.info("Executando fallback bibliográfico para '%s'", fallback_name)
                    results = await fallback_provider.search(
                        query=query,
                        title=title,
                        author=author,
                        isbn=clean_isbn_target or isbn,
                        limit=limit,
                    )

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
            if not book.cover_url and payload.cover_url:
                book.cover_url = payload.cover_url
                modified = True
            if not book.thumbnail_url and (payload.thumbnail_url or payload.cover_url):
                book.thumbnail_url = payload.thumbnail_url or payload.cover_url
                modified = True
            if not book.description and payload.description:
                book.description = payload.description
                modified = True
            if not book.page_count and payload.page_count:
                book.page_count = payload.page_count
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

            # Cria a entidade Book
            book = Book(
                title=payload.title.strip(),
                subtitle=payload.subtitle.strip() if payload.subtitle else None,
                description=payload.description.strip() if payload.description else None,
                isbn10=clean_isbn10,
                isbn13=clean_isbn13,
                page_count=payload.page_count,
                publication_date=payload.publication_date,
                language=payload.language or "pt-BR",
                cover_url=payload.cover_url,
                thumbnail_url=payload.thumbnail_url or payload.cover_url,
                publisher_id=publisher_id,
            )
            db.add(book)
            db.flush()

            # Resolve ou cria Autores
            if payload.authors:
                for i, author_name_raw in enumerate(payload.authors):
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

                    db.add(
                        BookAuthor(
                            book_id=book.id,
                            author_id=author.id,
                            is_primary=(i == 0),
                        )
                    )

            # Resolve ou cria Gêneros
            if payload.genres:
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


# Instância singleton do serviço
book_integration_service = BookIntegrationService()
