import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.catalog import Author, Book, BookAuthor, BookGenre, Genre
from app.models.shelf import (
    BookStatus,
    Collection,
    ReadingSession,
    UserBook,
    UserTag,
)
from app.models.social import UserNote, UserQuote
from app.schemas.shelf import (
    CollectionCreate,
    CollectionUpdate,
    ReadingSessionCreate,
    UserBookCreate,
    UserBookUpdate,
    UserNoteCreate,
    UserQuoteCreate,
    UserTagCreate,
    UserTagUpdate,
)


class ShelfService:
    @staticmethod
    def list_user_shelf(
        db: Session,
        user_id: uuid.UUID,
        status: BookStatus | None = None,
        favorite: bool | None = None,
        q: str | None = None,
        author_id: uuid.UUID | None = None,
        publisher_id: uuid.UUID | None = None,
        genre_id: uuid.UUID | None = None,
        collection_id: uuid.UUID | None = None,
        tag_id: uuid.UUID | None = None,
        personal_color: str | None = None,
        min_rating: Decimal | None = None,
        sort_by: str | None = "updated_at_desc",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[UserBook], int]:
        stmt = (
            select(UserBook)
            .join(UserBook.book)
            .options(
                selectinload(UserBook.book).selectinload(Book.publisher),
                selectinload(UserBook.book).selectinload(Book.authors),
                selectinload(UserBook.book).selectinload(Book.genres),
                selectinload(UserBook.tags),
                selectinload(UserBook.collections),
            )
            .where(UserBook.user_id == user_id)
        )

        count_stmt = (
            select(func.count(func.distinct(UserBook.id)))
            .select_from(UserBook)
            .join(UserBook.book)
            .where(UserBook.user_id == user_id)
        )

        if status:
            stmt = stmt.where(UserBook.status == status)
            count_stmt = count_stmt.where(UserBook.status == status)

        if favorite is not None:
            stmt = stmt.where(UserBook.favorite == favorite)
            count_stmt = count_stmt.where(UserBook.favorite == favorite)

        if min_rating is not None:
            stmt = stmt.where(UserBook.rating >= min_rating)
            count_stmt = count_stmt.where(UserBook.rating >= min_rating)

        if publisher_id:
            stmt = stmt.where(Book.publisher_id == publisher_id)
            count_stmt = count_stmt.where(Book.publisher_id == publisher_id)

        if author_id:
            stmt = stmt.where(Book.authors.any(Author.id == author_id))
            count_stmt = count_stmt.where(Book.authors.any(Author.id == author_id))

        if genre_id:
            stmt = stmt.where(Book.genres.any(Genre.id == genre_id))
            count_stmt = count_stmt.where(Book.genres.any(Genre.id == genre_id))

        if collection_id:
            stmt = stmt.where(UserBook.collections.any(Collection.id == collection_id))
            count_stmt = count_stmt.where(UserBook.collections.any(Collection.id == collection_id))

        if tag_id:
            stmt = stmt.where(UserBook.tags.any(UserTag.id == tag_id))
            count_stmt = count_stmt.where(UserBook.tags.any(UserTag.id == tag_id))

        if personal_color:
            stmt = stmt.where(UserBook.personal_color == personal_color)
            count_stmt = count_stmt.where(UserBook.personal_color == personal_color)

        if q and q.strip():
            clean_q = f"%{q.strip().lower()}%"
            search_filter = or_(
                func.lower(Book.title).like(clean_q),
                func.lower(Book.subtitle).like(clean_q),
                Book.isbn10.like(f"%{q.strip()}%"),
                Book.isbn13.like(f"%{q.strip()}%"),
                Book.authors.any(func.lower(Author.name).like(clean_q)),
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        # Ordenação
        if sort_by == "title_asc":
            stmt = stmt.order_by(Book.title.asc(), UserBook.updated_at.desc())
        elif sort_by == "title_desc":
            stmt = stmt.order_by(Book.title.desc(), UserBook.updated_at.desc())
        elif sort_by == "rating_desc":
            stmt = stmt.order_by(UserBook.rating.desc().nulls_last(), UserBook.updated_at.desc())
        elif sort_by == "rating_asc":
            stmt = stmt.order_by(UserBook.rating.asc().nulls_last(), UserBook.updated_at.desc())
        elif sort_by == "pages_desc":
            stmt = stmt.order_by(Book.page_count.desc().nulls_last(), UserBook.updated_at.desc())
        elif sort_by == "created_at_desc":
            stmt = stmt.order_by(UserBook.created_at.desc())
        elif sort_by == "progress_desc":
            stmt = stmt.order_by(UserBook.current_page.desc(), UserBook.updated_at.desc())
        else:
            stmt = stmt.order_by(UserBook.updated_at.desc())

        total = db.execute(count_stmt).scalar_one()

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        user_books = db.execute(stmt).scalars().all()
        return list(user_books), total

    @staticmethod
    def get_user_book(db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID) -> UserBook:
        stmt = (
            select(UserBook)
            .options(
                selectinload(UserBook.book).selectinload(Book.publisher),
                selectinload(UserBook.book).selectinload(Book.authors),
                selectinload(UserBook.book).selectinload(Book.genres),
                selectinload(UserBook.tags),
                selectinload(UserBook.collections),
            )
            .where(UserBook.id == user_book_id, UserBook.user_id == user_id)
        )
        user_book = db.execute(stmt).scalar_one_or_none()
        if not user_book:
            raise NotFoundError(
                f"Livro com ID '{user_book_id}' não encontrado na estante do usuário."
            )
        return user_book

    @staticmethod
    def get_user_book_by_book_id(
        db: Session, user_id: uuid.UUID, book_id: uuid.UUID
    ) -> UserBook | None:
        stmt = (
            select(UserBook)
            .options(
                selectinload(UserBook.book).selectinload(Book.publisher),
                selectinload(UserBook.book).selectinload(Book.authors),
                selectinload(UserBook.book).selectinload(Book.genres),
                selectinload(UserBook.tags),
                selectinload(UserBook.collections),
            )
            .where(UserBook.book_id == book_id, UserBook.user_id == user_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def add_to_shelf(db: Session, user_id: uuid.UUID, data: UserBookCreate) -> UserBook:
        # Verifica se o livro bibliográfico existe
        book = db.execute(select(Book).where(Book.id == data.book_id)).scalar_one_or_none()
        if not book:
            raise NotFoundError(f"Livro com ID '{data.book_id}' não existe no catálogo global.")

        # Verifica duplicidade
        existing = db.execute(
            select(UserBook).where(
                UserBook.user_id == user_id,
                UserBook.book_id == data.book_id,
            )
        ).scalar_one_or_none()
        if existing:
            raise ConflictError("Este livro já está cadastrado na sua estante.")

        user_book = UserBook(
            user_id=user_id,
            book_id=data.book_id,
            status=data.status,
            rating=data.rating,
            owned=data.owned,
            favorite=data.favorite,
            current_page=data.current_page,
            personal_color=data.personal_color,
            shelf_position=data.shelf_position,
            private_notes=data.private_notes,
            purchase_date=data.purchase_date,
            purchase_price=data.purchase_price,
            started_at=datetime.now(UTC) if data.status == BookStatus.READING else None,
            finished_at=datetime.now(UTC) if data.status == BookStatus.READ else None,
        )

        if data.tag_ids:
            tags = db.execute(
                select(UserTag).where(UserTag.user_id == user_id, UserTag.id.in_(data.tag_ids))
            ).scalars().all()
            user_book.tags = list(tags)

        if data.collection_ids:
            colls = db.execute(
                select(Collection).where(Collection.user_id == user_id, Collection.id.in_(data.collection_ids))
            ).scalars().all()
            user_book.collections = list(colls)

        db.add(user_book)
        db.commit()

        return ShelfService.get_user_book(db, user_id, user_book.id)

    @staticmethod
    def update_user_book(
        db: Session,
        user_id: uuid.UUID,
        user_book_id: uuid.UUID,
        update_data: UserBookUpdate,
    ) -> UserBook:
        user_book = ShelfService.get_user_book(db, user_id, user_book_id)

        update_dict = update_data.model_dump(exclude_unset=True)

        if "tag_ids" in update_dict:
            tag_ids = update_dict.pop("tag_ids")
            if tag_ids is not None:
                tags = db.execute(
                    select(UserTag).where(UserTag.user_id == user_id, UserTag.id.in_(tag_ids))
                ).scalars().all()
                user_book.tags = list(tags)
            else:
                user_book.tags = []

        if "collection_ids" in update_dict:
            col_ids = update_dict.pop("collection_ids")
            if col_ids is not None:
                colls = db.execute(
                    select(Collection).where(Collection.user_id == user_id, Collection.id.in_(col_ids))
                ).scalars().all()
                user_book.collections = list(colls)
            else:
                user_book.collections = []

        # Transição de status
        if "status" in update_dict and update_dict["status"] != user_book.status:
            new_status = update_dict["status"]
            if new_status == BookStatus.READING and not user_book.started_at:
                user_book.started_at = datetime.now(UTC)
            elif new_status == BookStatus.READ:
                if not user_book.finished_at:
                    user_book.finished_at = datetime.now(UTC)
                if user_book.book and user_book.book.page_count:
                    user_book.current_page = user_book.book.page_count

        # Atualiza campos restantes
        for field, value in update_dict.items():
            setattr(user_book, field, value)

        db.commit()
        db.refresh(user_book)
        return user_book

    @staticmethod
    def remove_from_shelf(db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID) -> None:
        user_book = ShelfService.get_user_book(db, user_id, user_book_id)
        db.delete(user_book)
        db.commit()

    @staticmethod
    def create_reading_session(
        db: Session,
        user_id: uuid.UUID,
        user_book_id: uuid.UUID,
        data: ReadingSessionCreate,
    ) -> ReadingSession:
        user_book = ShelfService.get_user_book(db, user_id, user_book_id)

        if data.end_page < data.start_page:
            raise ValidationError("A página final não pode ser menor que a página inicial.")

        session_start = data.started_at or datetime.now(UTC)

        session = ReadingSession(
            user_book_id=user_book.id,
            user_id=user_id,
            start_page=data.start_page,
            end_page=data.end_page,
            started_at=session_start,
            ended_at=data.ended_at,
            duration_seconds=data.duration_seconds,
            notes=data.notes,
        )
        db.add(session)

        # Atualiza a página atual do livro se avançou
        if data.end_page > user_book.current_page:
            user_book.current_page = data.end_page

        # Se o livro estava como quero ler ou pausado, e houve leitura, muda para lendo
        if user_book.status in (BookStatus.WANT_TO_READ, BookStatus.PAUSED):
            user_book.status = BookStatus.READING

        # Se started_at não foi registrado, define
        if not user_book.started_at:
            user_book.started_at = session_start

        # Se completou o livro
        if user_book.book and user_book.book.page_count and data.end_page >= user_book.book.page_count:
            user_book.status = BookStatus.READ
            if not user_book.finished_at:
                user_book.finished_at = data.ended_at or datetime.now(UTC)

        db.commit()
        db.refresh(session)

        # Enriquecimento com metadados do livro
        if user_book.book:
            session.book_title = user_book.book.title
            session.book_cover_url = user_book.book.cover_url or user_book.book.thumbnail_url
            session.book_total_pages = user_book.book.page_count

        return session

    @staticmethod
    def list_reading_sessions(
        db: Session,
        user_id: uuid.UUID,
        user_book_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[ReadingSession]:
        stmt = (
            select(ReadingSession)
            .options(
                selectinload(ReadingSession.user_book).selectinload(UserBook.book)
            )
            .where(ReadingSession.user_id == user_id)
        )

        if user_book_id:
            stmt = stmt.where(ReadingSession.user_book_id == user_book_id)

        stmt = stmt.order_by(ReadingSession.started_at.desc(), ReadingSession.created_at.desc()).limit(limit)
        sessions = list(db.execute(stmt).scalars().all())

        for s in sessions:
            if s.user_book and s.user_book.book:
                s.book_title = s.user_book.book.title
                s.book_cover_url = s.user_book.book.cover_url or s.user_book.book.thumbnail_url
                s.book_total_pages = s.user_book.book.page_count

        return sessions

    @staticmethod
    def delete_reading_session(
        db: Session,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> None:
        stmt = select(ReadingSession).where(
            ReadingSession.id == session_id,
            ReadingSession.user_id == user_id,
        )
        session = db.execute(stmt).scalar_one_or_none()
        if not session:
            raise NotFoundError("Sessão de leitura não encontrada.")

        db.delete(session)
        db.commit()

    @staticmethod
    def get_active_reading_books(
        db: Session,
        user_id: uuid.UUID,
    ) -> list[UserBook]:
        stmt = (
            select(UserBook)
            .options(
                selectinload(UserBook.book).selectinload(Book.publisher),
                selectinload(UserBook.book).selectinload(Book.authors),
                selectinload(UserBook.book).selectinload(Book.genres),
                selectinload(UserBook.tags),
                selectinload(UserBook.collections),
                selectinload(UserBook.reading_sessions),
            )
            .where(
                UserBook.user_id == user_id,
                UserBook.status.in_([BookStatus.READING, BookStatus.PAUSED]),
            )
            .order_by(
                case(
                    (UserBook.status == BookStatus.READING, 0),
                    (UserBook.status == BookStatus.PAUSED, 1),
                    else_=2,
                ),
                UserBook.updated_at.desc(),
            )
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_reading_overview(
        db: Session,
        user_id: uuid.UUID,
    ) -> dict:
        status_counts_stmt = (
            select(UserBook.status, func.count(UserBook.id))
            .where(UserBook.user_id == user_id)
            .group_by(UserBook.status)
        )
        status_rows = db.execute(status_counts_stmt).all()
        counts_map = {row[0]: row[1] for row in status_rows}

        session_stats_stmt = (
            select(
                func.count(ReadingSession.id),
                func.coalesce(func.sum(ReadingSession.end_page - ReadingSession.start_page), 0),
            )
            .where(ReadingSession.user_id == user_id)
        )
        session_stats_row = db.execute(session_stats_stmt).one()
        total_sessions = session_stats_row[0] or 0
        total_pages_read = int(session_stats_row[1] or 0)

        active_books = ShelfService.get_active_reading_books(db, user_id)
        recent_sessions = ShelfService.list_reading_sessions(db, user_id, limit=20)

        return {
            "currently_reading_count": counts_map.get(BookStatus.READING, 0),
            "paused_count": counts_map.get(BookStatus.PAUSED, 0),
            "read_count": counts_map.get(BookStatus.READ, 0),
            "want_to_read_count": counts_map.get(BookStatus.WANT_TO_READ, 0),
            "total_pages_read": total_pages_read,
            "total_sessions_count": total_sessions,
            "recent_sessions": recent_sessions,
            "active_books": active_books,
        }

    @staticmethod
    def get_dashboard_summary(db: Session, user_id: uuid.UUID) -> dict:
        # 1. Total de livros cadastrados na estante
        total_books = db.execute(
            select(func.count(UserBook.id)).where(UserBook.user_id == user_id)
        ).scalar_one() or 0

        # 2. Total de autores distintos presentes na estante
        total_authors = db.execute(
            select(func.count(func.distinct(BookAuthor.author_id)))
            .select_from(UserBook)
            .join(Book, UserBook.book_id == Book.id)
            .join(BookAuthor, Book.id == BookAuthor.book_id)
            .where(UserBook.user_id == user_id)
        ).scalar_one() or 0

        # 3. Total de editoras distintas presentes na estante
        total_publishers = db.execute(
            select(func.count(func.distinct(Book.publisher_id)))
            .select_from(UserBook)
            .join(Book, UserBook.book_id == Book.id)
            .where(UserBook.user_id == user_id, Book.publisher_id.is_not(None))
        ).scalar_one() or 0

        # 4. Contagem agregada por status
        status_stmt = (
            select(UserBook.status, func.count(UserBook.id))
            .where(UserBook.user_id == user_id)
            .group_by(UserBook.status)
        )
        status_map = dict(db.execute(status_stmt).all())
        read_books = status_map.get(BookStatus.READ, 0)
        reading_books = status_map.get(BookStatus.READING, 0)
        paused_books = status_map.get(BookStatus.PAUSED, 0)
        want_to_read_books = status_map.get(BookStatus.WANT_TO_READ, 0)
        abandoned_books = status_map.get(BookStatus.ABANDONED, 0)

        # 5. Total de páginas lidas e tempo a partir de sessões
        session_stats_stmt = select(
            func.count(ReadingSession.id),
            func.coalesce(func.sum(ReadingSession.end_page - ReadingSession.start_page), 0),
            func.coalesce(func.sum(ReadingSession.duration_seconds), 0),
        ).where(ReadingSession.user_id == user_id)
        session_stats_row = db.execute(session_stats_stmt).one()
        total_sessions = session_stats_row[0] or 0
        total_pages_read = int(session_stats_row[1] or 0)
        total_reading_minutes = int((session_stats_row[2] or 0) // 60)

        # 6. Avaliação média pessoal dos livros avaliados
        avg_rating_val = db.execute(
            select(func.avg(UserBook.rating)).where(
                UserBook.user_id == user_id, UserBook.rating.is_not(None)
            )
        ).scalar_one()
        average_rating = round(float(avg_rating_val), 1) if avg_rating_val is not None else None

        # 7. Taxa percentual de conclusão da estante
        completion_rate = (
            round((read_books / total_books) * 100, 1) if total_books > 0 else 0.0
        )

        # 8. Livros com leitura em andamento (leituras ativas / recentes)
        all_active = ShelfService.get_active_reading_books(db, user_id)
        active_readings = all_active[:4]

        # 9. Livros adicionados recentemente pelo usuário à estante (máx 6)
        recent_books_stmt = (
            select(UserBook)
            .options(
                selectinload(UserBook.book).selectinload(Book.authors),
                selectinload(UserBook.book).selectinload(Book.publisher),
                selectinload(UserBook.book).selectinload(Book.genres),
                selectinload(UserBook.tags),
                selectinload(UserBook.collections),
            )
            .where(UserBook.user_id == user_id)
            .order_by(UserBook.created_at.desc())
            .limit(6)
        )
        recently_added = list(db.execute(recent_books_stmt).scalars().all())

        # 10. Sessões de leitura mais recentes (máx 5)
        recent_sessions = ShelfService.list_reading_sessions(db, user_id, limit=5)

        # 11. Top gêneros mais frequentes na estante do usuário
        top_genres_stmt = (
            select(
                Genre.id,
                Genre.name,
                Genre.slug,
                func.count(UserBook.id).label("book_count"),
            )
            .select_from(UserBook)
            .join(Book, UserBook.book_id == Book.id)
            .join(BookGenre, Book.id == BookGenre.book_id)
            .join(Genre, BookGenre.genre_id == Genre.id)
            .where(UserBook.user_id == user_id)
            .group_by(Genre.id, Genre.name, Genre.slug)
            .order_by(func.count(UserBook.id).desc())
            .limit(5)
        )
        genre_rows = db.execute(top_genres_stmt).all()
        top_genres = [
            {"id": row[0], "name": row[1], "slug": row[2], "book_count": int(row[3])}
            for row in genre_rows
        ]

        return {
            "total_books": total_books,
            "total_authors": total_authors,
            "total_publishers": total_publishers,
            "read_books_count": read_books,
            "reading_books_count": reading_books,
            "paused_books_count": paused_books,
            "want_to_read_books_count": want_to_read_books,
            "abandoned_books_count": abandoned_books,
            "total_pages_read": total_pages_read,
            "total_sessions_count": total_sessions,
            "total_reading_minutes": total_reading_minutes,
            "average_rating": average_rating,
            "completion_rate_percent": completion_rate,
            "active_readings": active_readings,
            "recently_added_books": recently_added,
            "recent_sessions": recent_sessions,
            "top_genres": top_genres,
        }

    @staticmethod
    def list_user_notes(db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID) -> list[UserNote]:
        ShelfService.get_user_book(db, user_id, user_book_id)
        stmt = (
            select(UserNote)
            .where(UserNote.user_id == user_id, UserNote.user_book_id == user_book_id)
            .order_by(UserNote.created_at.desc())
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def create_user_note(
        db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID, data: UserNoteCreate
    ) -> UserNote:
        ShelfService.get_user_book(db, user_id, user_book_id)
        note = UserNote(
            user_id=user_id,
            user_book_id=user_book_id,
            content=data.content,
            page_number=data.page_number,
            chapter=data.chapter,
            is_spoiler=data.is_spoiler,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def delete_user_note(db: Session, user_id: uuid.UUID, note_id: uuid.UUID) -> None:
        stmt = select(UserNote).where(UserNote.id == note_id, UserNote.user_id == user_id)
        note = db.execute(stmt).scalar_one_or_none()
        if not note:
            raise NotFoundError("Nota não encontrada.")
        db.delete(note)
        db.commit()

    @staticmethod
    def list_user_quotes(db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID) -> list[UserQuote]:
        ShelfService.get_user_book(db, user_id, user_book_id)
        stmt = (
            select(UserQuote)
            .where(UserQuote.user_id == user_id, UserQuote.user_book_id == user_book_id)
            .order_by(UserQuote.created_at.desc())
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def create_user_quote(
        db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID, data: UserQuoteCreate
    ) -> UserQuote:
        ShelfService.get_user_book(db, user_id, user_book_id)
        quote = UserQuote(
            user_id=user_id,
            user_book_id=user_book_id,
            content=data.content,
            page_number=data.page_number,
            author_comment=data.author_comment,
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)
        return quote

    @staticmethod
    def delete_user_quote(db: Session, user_id: uuid.UUID, quote_id: uuid.UUID) -> None:
        stmt = select(UserQuote).where(UserQuote.id == quote_id, UserQuote.user_id == user_id)
        quote = db.execute(stmt).scalar_one_or_none()
        if not quote:
            raise NotFoundError("Citação não encontrada.")
        db.delete(quote)
        db.commit()

    # --------------------------------------------------------------------------
    # Gestão de Coleções (Collections)
    # --------------------------------------------------------------------------
    @staticmethod
    def list_collections(db: Session, user_id: uuid.UUID) -> list[Collection]:
        stmt = (
            select(Collection)
            .options(selectinload(Collection.user_books))
            .where(Collection.user_id == user_id)
            .order_by(Collection.position.asc(), Collection.created_at.asc())
        )
        colls = list(db.execute(stmt).scalars().all())
        for c in colls:
            c.book_count = len(c.user_books)
        return colls

    @staticmethod
    def get_collection(db: Session, user_id: uuid.UUID, collection_id: uuid.UUID) -> Collection:
        stmt = (
            select(Collection)
            .options(
                selectinload(Collection.user_books)
                .selectinload(UserBook.book)
                .selectinload(Book.authors)
            )
            .where(Collection.id == collection_id, Collection.user_id == user_id)
        )
        coll = db.execute(stmt).scalar_one_or_none()
        if not coll:
            raise NotFoundError(f"Coleção '{collection_id}' não encontrada.")
        coll.book_count = len(coll.user_books)
        return coll

    @staticmethod
    def create_collection(db: Session, user_id: uuid.UUID, data: CollectionCreate) -> Collection:
        max_pos = db.execute(
            select(func.coalesce(func.max(Collection.position), -1)).where(Collection.user_id == user_id)
        ).scalar_one()

        coll = Collection(
            user_id=user_id,
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            is_public=data.is_public,
            position=max_pos + 1,
        )
        db.add(coll)
        db.commit()
        db.refresh(coll)
        coll.book_count = 0
        return coll

    @staticmethod
    def update_collection(
        db: Session, user_id: uuid.UUID, collection_id: uuid.UUID, data: CollectionUpdate
    ) -> Collection:
        coll = ShelfService.get_collection(db, user_id, collection_id)
        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(coll, key, val)
        db.commit()
        db.refresh(coll)
        coll.book_count = len(coll.user_books)
        return coll

    @staticmethod
    def delete_collection(db: Session, user_id: uuid.UUID, collection_id: uuid.UUID) -> None:
        coll = ShelfService.get_collection(db, user_id, collection_id)
        db.delete(coll)
        db.commit()

    @staticmethod
    def reorder_collections(
        db: Session, user_id: uuid.UUID, collection_ids: list[uuid.UUID]
    ) -> list[Collection]:
        for idx, cid in enumerate(collection_ids):
            coll = db.execute(
                select(Collection).where(Collection.id == cid, Collection.user_id == user_id)
            ).scalar_one_or_none()
            if coll:
                coll.position = idx
        db.commit()
        return ShelfService.list_collections(db, user_id)

    @staticmethod
    def add_book_to_collection(
        db: Session, user_id: uuid.UUID, collection_id: uuid.UUID, user_book_id: uuid.UUID
    ) -> None:
        coll = ShelfService.get_collection(db, user_id, collection_id)
        ub = ShelfService.get_user_book(db, user_id, user_book_id)
        if ub not in coll.user_books:
            coll.user_books.append(ub)
            db.commit()

    @staticmethod
    def remove_book_from_collection(
        db: Session, user_id: uuid.UUID, collection_id: uuid.UUID, user_book_id: uuid.UUID
    ) -> None:
        coll = ShelfService.get_collection(db, user_id, collection_id)
        ub = ShelfService.get_user_book(db, user_id, user_book_id)
        if ub in coll.user_books:
            coll.user_books.remove(ub)
            db.commit()

    # --------------------------------------------------------------------------
    # Gestão de Tags Pessoais (User Tags)
    # --------------------------------------------------------------------------
    @staticmethod
    def list_tags(db: Session, user_id: uuid.UUID) -> list[UserTag]:
        stmt = (
            select(UserTag)
            .where(UserTag.user_id == user_id)
            .order_by(UserTag.name.asc())
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def create_tag(db: Session, user_id: uuid.UUID, data: UserTagCreate) -> UserTag:
        clean_name = data.name.strip().lstrip("#")
        existing = db.execute(
            select(UserTag).where(UserTag.user_id == user_id, func.lower(UserTag.name) == clean_name.lower())
        ).scalar_one_or_none()
        if existing:
            raise ConflictError(f"Tag '{clean_name}' já existe.")

        tag = UserTag(
            user_id=user_id,
            name=clean_name,
            color=data.color,
        )
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag

    @staticmethod
    def update_tag(
        db: Session, user_id: uuid.UUID, tag_id: uuid.UUID, data: UserTagUpdate
    ) -> UserTag:
        stmt = select(UserTag).where(UserTag.id == tag_id, UserTag.user_id == user_id)
        tag = db.execute(stmt).scalar_one_or_none()
        if not tag:
            raise NotFoundError("Tag não encontrada.")

        if data.name is not None:
            clean_name = data.name.strip().lstrip("#")
            existing = db.execute(
                select(UserTag).where(
                    UserTag.user_id == user_id,
                    UserTag.id != tag_id,
                    func.lower(UserTag.name) == clean_name.lower(),
                )
            ).scalar_one_or_none()
            if existing:
                raise ConflictError(f"Tag '{clean_name}' já existe.")
            tag.name = clean_name

        if data.color is not None:
            tag.color = data.color

        db.commit()
        db.refresh(tag)
        return tag

    @staticmethod
    def delete_tag(db: Session, user_id: uuid.UUID, tag_id: uuid.UUID) -> None:
        stmt = select(UserTag).where(UserTag.id == tag_id, UserTag.user_id == user_id)
        tag = db.execute(stmt).scalar_one_or_none()
        if not tag:
            raise NotFoundError("Tag não encontrada.")
        db.delete(tag)
        db.commit()

    @staticmethod
    def set_user_book_tags(
        db: Session, user_id: uuid.UUID, user_book_id: uuid.UUID, tag_ids: list[uuid.UUID]
    ) -> UserBook:
        user_book = ShelfService.get_user_book(db, user_id, user_book_id)
        tags = db.execute(
            select(UserTag).where(UserTag.user_id == user_id, UserTag.id.in_(tag_ids))
        ).scalars().all()
        user_book.tags = list(tags)
        db.commit()
        db.refresh(user_book)
        return user_book
