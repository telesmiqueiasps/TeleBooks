import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models.catalog import Book, BookAuthor, BookGenre, Genre
from app.schemas.catalog import BookCreate


class CatalogService:
    @staticmethod
    def get_book_by_id(db: Session, book_id: uuid.UUID) -> Book:
        stmt = (
            select(Book)
            .options(
                selectinload(Book.publisher),
                selectinload(Book.authors),
                selectinload(Book.genres),
                selectinload(Book.editions),
            )
            .where(Book.id == book_id)
        )
        book = db.execute(stmt).scalar_one_or_none()
        if not book:
            raise NotFoundError(f"Livro com ID '{book_id}' não encontrado.")
        return book

    @staticmethod
    def get_book_by_isbn(db: Session, isbn: str) -> Book:
        clean_isbn = isbn.replace("-", "").strip()
        stmt = (
            select(Book)
            .options(
                selectinload(Book.publisher),
                selectinload(Book.authors),
                selectinload(Book.genres),
            )
            .where(or_(Book.isbn13 == clean_isbn, Book.isbn10 == clean_isbn))
        )
        book = db.execute(stmt).scalar_one_or_none()
        if not book:
            raise NotFoundError(f"Nenhum livro encontrado com o ISBN '{isbn}'.")
        return book

    @staticmethod
    def list_books(
        db: Session,
        query: str | None = None,
        genre_slug: str | None = None,
        publisher_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Book], int]:
        stmt = (
            select(Book)
            .options(
                selectinload(Book.publisher),
                selectinload(Book.authors),
                selectinload(Book.genres),
            )
            .order_by(Book.title.asc())
        )

        if query:
            search = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Book.title.ilike(search),
                    Book.subtitle.ilike(search),
                    Book.isbn10.ilike(search),
                    Book.isbn13.ilike(search),
                )
            )

        if publisher_id:
            stmt = stmt.where(Book.publisher_id == publisher_id)

        if genre_slug:
            stmt = stmt.join(Book.genres).where(Genre.slug == genre_slug)

        # Contagem total
        total_stmt = select(Book.id)
        if query:
            total_stmt = total_stmt.where(
                or_(
                    Book.title.ilike(f"%{query.strip()}%"),
                    Book.subtitle.ilike(f"%{query.strip()}%"),
                )
            )
        total = len(db.execute(total_stmt).fetchall())

        # Paginação
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        books = db.execute(stmt).scalars().all()
        return list(books), total

    @staticmethod
    def create_book(db: Session, book_in: BookCreate) -> Book:
        # Verifica se ISBN já existe
        if book_in.isbn13:
            existing = db.execute(
                select(Book).where(Book.isbn13 == book_in.isbn13)
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(
                    f"Já existe um livro cadastrado com o ISBN13 '{book_in.isbn13}'."
                )

        book_data = book_in.model_dump(exclude={"author_ids", "genre_ids"})
        book = Book(**book_data)
        db.add(book)
        db.flush()

        # Vincula autores
        if book_in.author_ids:
            for i, author_id in enumerate(book_in.author_ids):
                db.add(BookAuthor(book_id=book.id, author_id=author_id, is_primary=(i == 0)))

        # Vincula gêneros
        if book_in.genre_ids:
            for genre_id in book_in.genre_ids:
                db.add(BookGenre(book_id=book.id, genre_id=genre_id))

        db.commit()
        return CatalogService.get_book_by_id(db, book.id)
