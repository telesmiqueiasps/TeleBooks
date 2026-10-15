import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import BadRequestError, NotFoundError
from app.models.book_submission import BookSubmission
from app.models.notification import Notification
from app.models.profile import Profile
from app.models.shelf import BookStatus, UserBook
from app.schemas.book_submission import BookSubmissionCreate, BookSubmissionUpdate
from app.schemas.catalog import BookCreate
from app.services.catalog_service import CatalogService


class BookSubmissionService:
    @staticmethod
    def create_submission(
        db: Session,
        user_id: uuid.UUID,
        payload: BookSubmissionCreate,
    ) -> BookSubmission:
        """
        Registra uma submissão manual de livro para fila de análise do suporte.
        """
        clean_authors = [a.strip() for a in payload.author_names if a.strip()]
        if not clean_authors:
            raise BadRequestError("Informe ao menos um autor para o livro.")

        submission = BookSubmission(
            user_id=user_id,
            title=payload.title.strip(),
            subtitle=payload.subtitle.strip() if payload.subtitle else None,
            author_names=clean_authors,
            publisher_name=payload.publisher_name.strip() if payload.publisher_name else None,
            description=payload.description.strip() if payload.description else None,
            isbn13=payload.isbn13.strip() if payload.isbn13 else None,
            isbn10=payload.isbn10.strip() if payload.isbn10 else None,
            page_count=payload.page_count,
            cover_url=payload.cover_url.strip() if payload.cover_url else None,
            initial_shelf_status=payload.initial_shelf_status or "want_to_read",
            status="pending",
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        # Carrega dados do usuário submissor
        submission.user = db.get(Profile, user_id)
        return submission

    @staticmethod
    def list_submissions(
        db: Session,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[BookSubmission], int]:
        """
        Lista submissões com paginação e filtro opcional por status ('pending', 'approved', 'rejected').
        """
        stmt = (
            select(BookSubmission)
            .options(selectinload(BookSubmission.user))
            .order_by(BookSubmission.created_at.desc())
        )
        count_stmt = select(func.count(BookSubmission.id))

        if status_filter:
            stmt = stmt.where(BookSubmission.status == status_filter)
            count_stmt = count_stmt.where(BookSubmission.status == status_filter)

        total = db.execute(count_stmt).scalar_one()
        offset = (page - 1) * page_size
        items = list(db.execute(stmt.offset(offset).limit(page_size)).scalars().all())

        return items, total

    @staticmethod
    def list_my_submissions(
        db: Session,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[BookSubmission], int]:
        """
        Lista as submissões enviadas pelo usuário logado.
        """
        stmt = (
            select(BookSubmission)
            .options(selectinload(BookSubmission.user))
            .where(BookSubmission.user_id == user_id)
            .order_by(BookSubmission.created_at.desc())
        )
        count_stmt = select(func.count(BookSubmission.id)).where(BookSubmission.user_id == user_id)

        total = db.execute(count_stmt).scalar_one()
        offset = (page - 1) * page_size
        items = list(db.execute(stmt.offset(offset).limit(page_size)).scalars().all())

        return items, total

    @staticmethod
    def update_submission(
        db: Session,
        admin_id: uuid.UUID,
        submission_id: uuid.UUID,
        payload: BookSubmissionUpdate,
    ) -> BookSubmission:
        """
        Permite ao administrador fazer correções nos dados do livro submetido antes de aprová-lo.
        """
        submission = db.execute(
            select(BookSubmission)
            .options(selectinload(BookSubmission.user))
            .where(BookSubmission.id == submission_id)
        ).scalar_one_or_none()

        if not submission:
            raise NotFoundError("Submissão de livro não encontrada.")

        if payload.title is not None:
            clean_title = payload.title.strip()
            if not clean_title:
                raise BadRequestError("O título da obra não pode ser vazio.")
            submission.title = clean_title

        if payload.subtitle is not None:
            clean_subtitle = payload.subtitle.strip()
            submission.subtitle = clean_subtitle if clean_subtitle else None

        if payload.author_names is not None:
            clean_authors = [a.strip() for a in payload.author_names if a.strip()]
            if not clean_authors:
                raise BadRequestError("Informe ao menos um autor para o livro.")
            submission.author_names = clean_authors

        if payload.publisher_name is not None:
            clean_publisher = payload.publisher_name.strip()
            submission.publisher_name = clean_publisher if clean_publisher else None

        if payload.description is not None:
            clean_desc = payload.description.strip()
            submission.description = clean_desc if clean_desc else None

        if payload.isbn13 is not None:
            clean_isbn13 = payload.isbn13.strip()
            submission.isbn13 = clean_isbn13 if clean_isbn13 else None

        if payload.isbn10 is not None:
            clean_isbn10 = payload.isbn10.strip()
            submission.isbn10 = clean_isbn10 if clean_isbn10 else None

        if payload.page_count is not None:
            submission.page_count = payload.page_count

        if payload.cover_url is not None:
            clean_cover = payload.cover_url.strip()
            submission.cover_url = clean_cover if clean_cover else None

        if payload.initial_shelf_status is not None:
            submission.initial_shelf_status = payload.initial_shelf_status

        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def approve_submission(
        db: Session,
        admin_id: uuid.UUID,
        submission_id: uuid.UUID,
    ) -> BookSubmission:
        """
        Aprova uma submissão manual:
        1. Cria ou reutiliza o livro no catálogo global (com autores e editoras).
        2. Adiciona o livro à biblioteca pessoal de quem o submeteu.
        3. Dispara notificação informando que a obra foi aprovada.
        4. Atualiza a submissão para 'approved'.
        """
        submission = db.execute(
            select(BookSubmission)
            .options(selectinload(BookSubmission.user))
            .where(BookSubmission.id == submission_id)
        ).scalar_one_or_none()

        if not submission:
            raise NotFoundError("Submissão de livro não encontrada.")

        if submission.status != "pending":
            raise BadRequestError(f"Esta submissão já foi processada com status '{submission.status}'.")

        # 1. Cria livro no catálogo via CatalogService
        book_in = BookCreate(
            title=submission.title,
            subtitle=submission.subtitle,
            description=submission.description,
            isbn13=submission.isbn13,
            isbn10=submission.isbn10,
            page_count=submission.page_count,
            cover_url=submission.cover_url,
            publisher_name=submission.publisher_name,
            author_names=submission.author_names,
        )

        book = CatalogService.create_book(
            db=db,
            book_in=book_in,
            add_to_shelf=False,
        )

        # 2. Vincula à estante do usuário que submeteu
        initial_status = BookStatus.WANT_TO_READ
        try:
            initial_status = BookStatus(submission.initial_shelf_status)
        except Exception:
            pass

        existing_user_book = db.execute(
            select(UserBook).where(
                UserBook.user_id == submission.user_id,
                UserBook.book_id == book.id,
            )
        ).scalar_one_or_none()

        if not existing_user_book:
            user_book = UserBook(
                user_id=submission.user_id,
                book_id=book.id,
                status=initial_status,
            )
            db.add(user_book)

        # 3. Dispara notificação ao usuário
        notification = Notification(
            user_id=submission.user_id,
            actor_id=admin_id,
            type="book_approved",
            book_id=book.id,
            content=f'Seu livro "{book.title}" foi aprovado pelo suporte e já está disponível no catálogo e na sua biblioteca!',
        )
        db.add(notification)

        # 4. Atualiza registro de submissão
        submission.status = "approved"
        submission.reviewed_by = admin_id
        submission.reviewed_at = datetime.now(UTC)
        submission.created_book_id = book.id

        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def reject_submission(
        db: Session,
        admin_id: uuid.UUID,
        submission_id: uuid.UUID,
        reason: str | None = None,
    ) -> BookSubmission:
        """
        Rejeita uma submissão manual com motivo opcional e envia notificação ao usuário.
        """
        submission = db.execute(
            select(BookSubmission)
            .options(selectinload(BookSubmission.user))
            .where(BookSubmission.id == submission_id)
        ).scalar_one_or_none()

        if not submission:
            raise NotFoundError("Submissão de livro não encontrada.")

        if submission.status != "pending":
            raise BadRequestError(f"Esta submissão já foi processada com status '{submission.status}'.")

        clean_reason = reason.strip() if reason else None

        submission.status = "rejected"
        submission.rejection_reason = clean_reason
        submission.reviewed_by = admin_id
        submission.reviewed_at = datetime.now(UTC)

        reason_text = f" Motivo: {clean_reason}" if clean_reason else ""
        notification = Notification(
            user_id=submission.user_id,
            actor_id=admin_id,
            type="book_rejected",
            content=f'O cadastro manual do livro "{submission.title}" não foi aprovado pelo suporte.{reason_text}',
        )
        db.add(notification)

        db.commit()
        db.refresh(submission)
        return submission
