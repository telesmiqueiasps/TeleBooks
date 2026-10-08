import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.catalog import Book
from app.models.shelf import BookStatus, ReadingSession, UserBook
from app.schemas.shelf import ReadingSessionCreate, UserBookCreate, UserBookUpdate


class ShelfService:
    @staticmethod
    def list_user_shelf(
        db: Session,
        user_id: uuid.UUID,
        status: BookStatus | None = None,
        favorite: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[UserBook], int]:
        stmt = (
            select(UserBook)
            .options(
                selectinload(UserBook.book).selectinload(Book.publisher),
                selectinload(UserBook.book).selectinload(Book.authors),
                selectinload(UserBook.book).selectinload(Book.genres),
            )
            .where(UserBook.user_id == user_id)
            .order_by(UserBook.updated_at.desc())
        )

        if status:
            stmt = stmt.where(UserBook.status == status)

        if favorite is not None:
            stmt = stmt.where(UserBook.favorite == favorite)

        # Contagem total
        count_stmt = select(func.count()).select_from(UserBook).where(UserBook.user_id == user_id)
        if status:
            count_stmt = count_stmt.where(UserBook.status == status)
        if favorite is not None:
            count_stmt = count_stmt.where(UserBook.favorite == favorite)
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

        session = ReadingSession(
            user_book_id=user_book.id,
            user_id=user_id,
            start_page=data.start_page,
            end_page=data.end_page,
            duration_seconds=data.duration_seconds,
            notes=data.notes,
        )
        db.add(session)

        # Atualiza a página atual do livro
        if data.end_page > user_book.current_page:
            user_book.current_page = data.end_page
            if user_book.status == BookStatus.WANT_TO_READ:
                user_book.status = BookStatus.READING
                user_book.started_at = datetime.now(UTC)

        db.commit()
        db.refresh(session)
        return session
