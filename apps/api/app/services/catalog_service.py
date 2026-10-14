import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.core.security import CurrentUser
from app.models.catalog import Author, Book, BookAuthor, BookGenre, Genre, Publisher
from app.models.shelf import BookStatus, UserBook
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
    def create_book(
        db: Session,
        book_in: BookCreate,
        current_user: CurrentUser | None = None,
        add_to_shelf: bool = True,
        shelf_status: BookStatus = BookStatus.WANT_TO_READ,
    ) -> Book:
        clean_isbn13 = book_in.isbn13.replace("-", "").strip() if book_in.isbn13 else None
        clean_isbn10 = book_in.isbn10.replace("-", "").strip() if book_in.isbn10 else None

        if clean_isbn13 and len(clean_isbn13) != 13:
            if len(clean_isbn13) == 10 and not clean_isbn10:
                clean_isbn10 = clean_isbn13
            clean_isbn13 = None

        if clean_isbn10 and len(clean_isbn10) != 10:
            if len(clean_isbn10) == 13 and not clean_isbn13:
                clean_isbn13 = clean_isbn10
            clean_isbn10 = None

        existing: Book | None = None
        if clean_isbn13:
            existing = db.execute(
                select(Book)
                .options(
                    selectinload(Book.publisher),
                    selectinload(Book.authors),
                    selectinload(Book.genres),
                )
                .where(Book.isbn13 == clean_isbn13)
            ).scalar_one_or_none()
        if not existing and clean_isbn10:
            existing = db.execute(
                select(Book)
                .options(
                    selectinload(Book.publisher),
                    selectinload(Book.authors),
                    selectinload(Book.genres),
                )
                .where(Book.isbn10 == clean_isbn10)
            ).scalar_one_or_none()

        if existing:
            # Reutiliza o livro existente no catálogo global e enriquece campos vazios
            book = existing
            modified = False
            if not book.cover_url and book_in.cover_url:
                book.cover_url = book_in.cover_url
                book.thumbnail_url = book_in.thumbnail_url or book_in.cover_url
                modified = True
            if not book.description and book_in.description:
                book.description = book_in.description
                modified = True
            if not book.page_count and book_in.page_count:
                book.page_count = book_in.page_count
                modified = True
            if not book.publication_date and book_in.publication_date:
                book.publication_date = book_in.publication_date
                modified = True
            if not book.isbn13 and clean_isbn13:
                book.isbn13 = clean_isbn13
                modified = True
            if not book.isbn10 and clean_isbn10:
                book.isbn10 = clean_isbn10
                modified = True
            if modified:
                db.flush()
        else:
            book_data = book_in.model_dump(
                exclude={"author_ids", "author_names", "genre_ids", "publisher_name"}
            )
            if clean_isbn13:
                book_data["isbn13"] = clean_isbn13
            if clean_isbn10:
                book_data["isbn10"] = clean_isbn10

            # Resolução de Editora por nome se não fornecido publisher_id
            if not book_data.get("publisher_id") and book_in.publisher_name:
                pub_name = book_in.publisher_name.strip()
                if pub_name:
                    pub = db.execute(
                        select(Publisher).where(func.lower(Publisher.name) == pub_name.lower())
                    ).scalar_one_or_none()
                    if not pub:
                        pub = Publisher(name=pub_name)
                        db.add(pub)
                        db.flush()
                    book_data["publisher_id"] = pub.id

            # Resolução de autor textual denormalizado
            if not book_data.get("author_name") and book_in.author_names:
                clean_authors = [a.strip() for a in book_in.author_names if a.strip()]
                if clean_authors:
                    book_data["author_name"] = ", ".join(clean_authors)

            book = Book(**book_data)
            db.add(book)
            db.flush()

            # Resolução de Autores (por ID e/ou por Nome)
            resolved_author_ids: list[uuid.UUID] = (
                list(book_in.author_ids) if book_in.author_ids else []
            )
            if book_in.author_names:
                for a_name in book_in.author_names:
                    cleaned_name = a_name.strip()
                    if not cleaned_name:
                        continue
                    author = db.execute(
                        select(Author).where(func.lower(Author.name) == cleaned_name.lower())
                    ).scalar_one_or_none()
                    if not author:
                        author = Author(name=cleaned_name)
                        db.add(author)
                        db.flush()
                    if author.id not in resolved_author_ids:
                        resolved_author_ids.append(author.id)

            if resolved_author_ids:
                for i, author_id in enumerate(resolved_author_ids):
                    db.add(BookAuthor(book_id=book.id, author_id=author_id, is_primary=(i == 0)))

            if book_in.genre_ids:
                seen_genre_ids: set[uuid.UUID] = set()
                for genre_id in book_in.genre_ids:
                    if genre_id not in seen_genre_ids:
                        seen_genre_ids.add(genre_id)
                        db.add(BookGenre(book_id=book.id, genre_id=genre_id))

        # Adiciona à estante pessoal do usuário se solicitado e usuário logado
        if add_to_shelf and current_user:
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

            if not existing_user_book:
                target_status = BookStatus.WANT_TO_READ
                if shelf_status:
                    if isinstance(shelf_status, BookStatus):
                        target_status = shelf_status
                    else:
                        try:
                            target_status = BookStatus(str(shelf_status))
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

        # Resolução de Editora se publisher_name foi enviado
        if "publisher_name" in update_dict:
            pub_name = update_dict.pop("publisher_name")
            if pub_name is not None:
                cleaned_pub = pub_name.strip()
                if cleaned_pub:
                    pub = db.execute(
                        select(Publisher).where(func.lower(Publisher.name) == cleaned_pub.lower())
                    ).scalar_one_or_none()
                    if not pub:
                        pub = Publisher(name=cleaned_pub)
                        db.add(pub)
                        db.flush()
                    update_dict["publisher_id"] = pub.id
                else:
                    update_dict["publisher_id"] = None

        # Atualiza relações de autores N:N se fornecidas por IDs ou nomes
        author_ids = update_dict.pop("author_ids", None)
        author_names = update_dict.pop("author_names", None)
        if author_ids is not None or author_names is not None:
            resolved_author_ids: list[uuid.UUID] = (
                list(author_ids) if author_ids is not None else []
            )
            if author_names:
                for a_name in author_names:
                    cleaned_name = a_name.strip()
                    if not cleaned_name:
                        continue
                    author = db.execute(
                        select(Author).where(func.lower(Author.name) == cleaned_name.lower())
                    ).scalar_one_or_none()
                    if not author:
                        author = Author(name=cleaned_name)
                        db.add(author)
                        db.flush()
                    if author.id not in resolved_author_ids:
                        resolved_author_ids.append(author.id)

            # Remove relações antigas e insere novas
            db.query(BookAuthor).filter(BookAuthor.book_id == book_id).delete()
            for i, author_id in enumerate(resolved_author_ids):
                db.add(BookAuthor(book_id=book.id, author_id=author_id, is_primary=(i == 0)))

            if author_names:
                clean_authors = [a.strip() for a in author_names if a.strip()]
                if clean_authors:
                    book.author_name = ", ".join(clean_authors)

        if "genre_ids" in update_dict:
            genre_ids = update_dict.pop("genre_ids")
            if genre_ids is not None:
                db.query(BookGenre).filter(BookGenre.book_id == book_id).delete()
                seen_genre_ids: set[uuid.UUID] = set()
                for genre_id in genre_ids:
                    if genre_id not in seen_genre_ids:
                        seen_genre_ids.add(genre_id)
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
        norm_name = author_in.name.strip()
        existing = db.execute(
            select(Author).where(func.lower(func.trim(Author.name)) == norm_name.lower())
        ).scalar_one_or_none()
        if existing:
            raise ConflictError(f"O autor '{author_in.name}' já está cadastrado.")

        author_data = author_in.model_dump()
        author_data["name"] = norm_name
        author = Author(**author_data)
        db.add(author)
        db.commit()
        db.refresh(author)
        return author

    @staticmethod
    def update_author(db: Session, author_id: uuid.UUID, author_update: AuthorUpdate) -> Author:
        author = CatalogService.get_author_by_id(db, author_id)
        update_dict = author_update.model_dump(exclude_unset=True)

        if "name" in update_dict:
            norm_name = update_dict["name"].strip()
            existing = db.execute(
                select(Author).where(
                    func.lower(func.trim(Author.name)) == norm_name.lower(),
                    Author.id != author_id,
                )
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(
                    f"Já existe um autor cadastrado com o nome '{update_dict['name']}'."
                )
            update_dict["name"] = norm_name

        for field, value in update_dict.items():
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
        norm_name = pub_in.name.strip()
        existing = db.execute(
            select(Publisher).where(func.lower(func.trim(Publisher.name)) == norm_name.lower())
        ).scalar_one_or_none()
        if existing:
            raise ConflictError(f"A editora '{pub_in.name}' já está cadastrada.")

        pub_data = pub_in.model_dump()
        pub_data["name"] = norm_name
        publisher = Publisher(**pub_data)
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

        if "name" in update_dict:
            norm_name = update_dict["name"].strip()
            existing = db.execute(
                select(Publisher).where(
                    func.lower(func.trim(Publisher.name)) == norm_name.lower(),
                    Publisher.id != publisher_id,
                )
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(
                    f"Já existe uma editora cadastrada com o nome '{update_dict['name']}'."
                )
            update_dict["name"] = norm_name

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
