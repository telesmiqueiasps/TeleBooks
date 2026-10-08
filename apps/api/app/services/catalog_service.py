import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models.catalog import Author, Book, BookAuthor, BookGenre, Genre, Publisher
from app.schemas.catalog import (
    AuthorCreate,
    AuthorUpdate,
    BookCreate,
    BookUpdate,
    GenreCreate,
    GenreUpdate,
    PublisherCreate,
    PublisherUpdate,
)


class CatalogService:
    # ==========================================================================
    # Livros (Books)
    # ==========================================================================
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
        author_id: uuid.UUID | None = None,
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

        if author_id:
            stmt = stmt.join(Book.authors).where(Author.id == author_id)

        # Contagem total
        count_stmt = select(func.count(func.distinct(Book.id)))
        if query:
            search = f"%{query.strip()}%"
            count_stmt = count_stmt.where(
                or_(
                    Book.title.ilike(search),
                    Book.subtitle.ilike(search),
                    Book.isbn10.ilike(search),
                    Book.isbn13.ilike(search),
                )
            )
        if publisher_id:
            count_stmt = count_stmt.where(Book.publisher_id == publisher_id)
        if genre_slug:
            count_stmt = count_stmt.join(Book.genres).where(Genre.slug == genre_slug)
        if author_id:
            count_stmt = count_stmt.join(Book.authors).where(Author.id == author_id)

        total = db.execute(count_stmt).scalar_one()

        # Paginação
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        books = db.execute(stmt).scalars().all()
        return list(books), total

    @staticmethod
    def create_book(db: Session, book_in: BookCreate) -> Book:
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

        if book_in.author_ids:
            for i, author_id in enumerate(book_in.author_ids):
                db.add(BookAuthor(book_id=book.id, author_id=author_id, is_primary=(i == 0)))

        if book_in.genre_ids:
            for genre_id in book_in.genre_ids:
                db.add(BookGenre(book_id=book.id, genre_id=genre_id))

        db.commit()
        return CatalogService.get_book_by_id(db, book.id)

    @staticmethod
    def update_book(db: Session, book_id: uuid.UUID, book_update: BookUpdate) -> Book:
        book = CatalogService.get_book_by_id(db, book_id)

        update_dict = book_update.model_dump(exclude_unset=True)

        if (
            "isbn13" in update_dict
            and update_dict["isbn13"]
            and update_dict["isbn13"] != book.isbn13
        ):
            existing = db.execute(
                select(Book).where(Book.isbn13 == update_dict["isbn13"], Book.id != book_id)
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(
                    f"Já existe outro livro com o ISBN13 '{update_dict['isbn13']}'."
                )

        # Atualiza relações N:N se fornecidas
        if "author_ids" in update_dict:
            author_ids = update_dict.pop("author_ids")
            if author_ids is not None:
                # Remove relações antigas
                db.query(BookAuthor).filter(BookAuthor.book_id == book_id).delete()
                for i, author_id in enumerate(author_ids):
                    db.add(BookAuthor(book_id=book.id, author_id=author_id, is_primary=(i == 0)))

        if "genre_ids" in update_dict:
            genre_ids = update_dict.pop("genre_ids")
            if genre_ids is not None:
                db.query(BookGenre).filter(BookGenre.book_id == book_id).delete()
                for genre_id in genre_ids:
                    db.add(BookGenre(book_id=book.id, genre_id=genre_id))

        for field, value in update_dict.items():
            setattr(book, field, value)

        db.commit()
        return CatalogService.get_book_by_id(db, book.id)

    @staticmethod
    def delete_book(db: Session, book_id: uuid.UUID) -> None:
        book = CatalogService.get_book_by_id(db, book_id)
        db.delete(book)
        db.commit()

    # ==========================================================================
    # Autores (Authors)
    # ==========================================================================
    @staticmethod
    def get_author_by_id(db: Session, author_id: uuid.UUID) -> Author:
        author = db.execute(select(Author).where(Author.id == author_id)).scalar_one_or_none()
        if not author:
            raise NotFoundError(f"Autor com ID '{author_id}' não encontrado.")
        return author

    @staticmethod
    def list_authors(
        db: Session,
        query: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Author], int]:
        stmt = select(Author).order_by(Author.name.asc())
        count_stmt = select(func.count()).select_from(Author)

        if query:
            search = f"%{query.strip()}%"
            stmt = stmt.where(Author.name.ilike(search))
            count_stmt = count_stmt.where(Author.name.ilike(search))

        total = db.execute(count_stmt).scalar_one()
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        authors = db.execute(stmt).scalars().all()
        return list(authors), total

    @staticmethod
    def create_author(db: Session, author_in: AuthorCreate) -> Author:
        author = Author(**author_in.model_dump())
        db.add(author)
        db.commit()
        db.refresh(author)
        return author

    @staticmethod
    def update_author(db: Session, author_id: uuid.UUID, author_update: AuthorUpdate) -> Author:
        author = CatalogService.get_author_by_id(db, author_id)
        for field, value in author_update.model_dump(exclude_unset=True).items():
            setattr(author, field, value)
        db.commit()
        db.refresh(author)
        return author

    @staticmethod
    def delete_author(db: Session, author_id: uuid.UUID) -> None:
        author = CatalogService.get_author_by_id(db, author_id)
        db.delete(author)
        db.commit()

    # ==========================================================================
    # Editoras (Publishers)
    # ==========================================================================
    @staticmethod
    def get_publisher_by_id(db: Session, publisher_id: uuid.UUID) -> Publisher:
        publisher = db.execute(
            select(Publisher).where(Publisher.id == publisher_id)
        ).scalar_one_or_none()
        if not publisher:
            raise NotFoundError(f"Editora com ID '{publisher_id}' não encontrada.")
        return publisher

    @staticmethod
    def list_publishers(
        db: Session,
        query: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Publisher], int]:
        stmt = select(Publisher).order_by(Publisher.name.asc())
        count_stmt = select(func.count()).select_from(Publisher)

        if query:
            search = f"%{query.strip()}%"
            stmt = stmt.where(Publisher.name.ilike(search))
            count_stmt = count_stmt.where(Publisher.name.ilike(search))

        total = db.execute(count_stmt).scalar_one()
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        publishers = db.execute(stmt).scalars().all()
        return list(publishers), total

    @staticmethod
    def create_publisher(db: Session, pub_in: PublisherCreate) -> Publisher:
        existing = db.execute(
            select(Publisher).where(Publisher.name == pub_in.name)
        ).scalar_one_or_none()
        if existing:
            raise ConflictError(f"A editora '{pub_in.name}' já está cadastrada.")

        publisher = Publisher(**pub_in.model_dump())
        db.add(publisher)
        db.commit()
        db.refresh(publisher)
        return publisher

    @staticmethod
    def update_publisher(
        db: Session, publisher_id: uuid.UUID, pub_update: PublisherUpdate
    ) -> Publisher:
        publisher = CatalogService.get_publisher_by_id(db, publisher_id)
        update_dict = pub_update.model_dump(exclude_unset=True)

        if "name" in update_dict and update_dict["name"] != publisher.name:
            existing = db.execute(
                select(Publisher).where(
                    Publisher.name == update_dict["name"], Publisher.id != publisher_id
                )
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(
                    f"Já existe uma editora cadastrada com o nome '{update_dict['name']}'."
                )

        for field, value in update_dict.items():
            setattr(publisher, field, value)

        db.commit()
        db.refresh(publisher)
        return publisher

    @staticmethod
    def delete_publisher(db: Session, publisher_id: uuid.UUID) -> None:
        publisher = CatalogService.get_publisher_by_id(db, publisher_id)
        db.delete(publisher)
        db.commit()

    # ==========================================================================
    # Gêneros (Genres)
    # ==========================================================================
    @staticmethod
    def get_genre_by_id(db: Session, genre_id: uuid.UUID) -> Genre:
        genre = db.execute(select(Genre).where(Genre.id == genre_id)).scalar_one_or_none()
        if not genre:
            raise NotFoundError(f"Gênero literário com ID '{genre_id}' não encontrado.")
        return genre

    @staticmethod
    def list_genres(
        db: Session,
        query: str | None = None,
        page: int = 1,
        page_size: int = 100,
    ) -> tuple[list[Genre], int]:
        stmt = select(Genre).order_by(Genre.name.asc())
        count_stmt = select(func.count()).select_from(Genre)

        if query:
            search = f"%{query.strip()}%"
            stmt = stmt.where(or_(Genre.name.ilike(search), Genre.slug.ilike(search)))
            count_stmt = count_stmt.where(or_(Genre.name.ilike(search), Genre.slug.ilike(search)))

        total = db.execute(count_stmt).scalar_one()
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        genres = db.execute(stmt).scalars().all()
        return list(genres), total

    @staticmethod
    def create_genre(db: Session, genre_in: GenreCreate) -> Genre:
        existing = db.execute(select(Genre).where(Genre.slug == genre_in.slug)).scalar_one_or_none()
        if existing:
            raise ConflictError(f"Gênero com o slug '{genre_in.slug}' já cadastrado.")

        genre = Genre(name=genre_in.name, slug=genre_in.slug)
        db.add(genre)
        db.commit()
        db.refresh(genre)
        return genre

    @staticmethod
    def update_genre(db: Session, genre_id: uuid.UUID, genre_update: GenreUpdate) -> Genre:
        genre = CatalogService.get_genre_by_id(db, genre_id)
        update_dict = genre_update.model_dump(exclude_unset=True)

        if "slug" in update_dict and update_dict["slug"] != genre.slug:
            existing = db.execute(
                select(Genre).where(Genre.slug == update_dict["slug"], Genre.id != genre_id)
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(f"Gênero com slug '{update_dict['slug']}' já cadastrado.")

        for field, value in update_dict.items():
            setattr(genre, field, value)

        db.commit()
        db.refresh(genre)
        return genre

    @staticmethod
    def delete_genre(db: Session, genre_id: uuid.UUID) -> None:
        genre = CatalogService.get_genre_by_id(db, genre_id)
        db.delete(genre)
        db.commit()
