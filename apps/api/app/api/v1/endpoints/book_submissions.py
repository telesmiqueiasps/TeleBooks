import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.security import CurrentUser
from app.schemas.book_submission import (
    BookSubmissionCreate,
    BookSubmissionRead,
    BookSubmissionReview,
    BookSubmissionUpdate,
)
from app.schemas.common import PaginatedResponse
from app.services.book_submission_service import BookSubmissionService

router = APIRouter()


@router.post(
    "",
    response_model=BookSubmissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter livro manual para fila de moderação do suporte",
)
def create_book_submission(
    payload: BookSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Submete uma obra para aprovação prévia. Não entra imediatamente no catálogo
    nem na biblioteca do usuário até ser aprovada por um administrador.
    """
    submission = BookSubmissionService.create_submission(
        db=db,
        user_id=uuid.UUID(current_user.id),
        payload=payload,
    )
    return BookSubmissionRead.model_validate(submission)


@router.get(
    "/my",
    response_model=PaginatedResponse[BookSubmissionRead],
    summary="Listar livros submetidos pelo usuário logado",
)
def list_my_submissions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items, total = BookSubmissionService.list_my_submissions(
        db=db,
        user_id=uuid.UUID(current_user.id),
        page=page,
        page_size=page_size,
    )
    validated_items = [BookSubmissionRead.model_validate(item) for item in items]
    return PaginatedResponse.create(items=validated_items, total=total, page=page, page_size=page_size)


@router.get(
    "",
    response_model=PaginatedResponse[BookSubmissionRead],
    summary="Listar fila de moderação de livros submetidos (Apenas Admin)",
)
def list_admin_submissions(
    status_filter: str | None = Query(default=None, alias="status", description="'pending', 'approved', 'rejected'"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(get_current_admin),
):
    """
    Permite aos administradores consultarem os livros manuais submetidos para análise.
    """
    items, total = BookSubmissionService.list_submissions(
        db=db,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    validated_items = [BookSubmissionRead.model_validate(item) for item in items]
    return PaginatedResponse.create(items=validated_items, total=total, page=page, page_size=page_size)


@router.patch(
    "/{submission_id}",
    response_model=BookSubmissionRead,
    summary="Editar dados de um livro submetido antes de aprovar (Apenas Admin)",
)
def update_book_submission(
    submission_id: uuid.UUID,
    payload: BookSubmissionUpdate,
    db: Session = Depends(get_db),
    admin: CurrentUser = Depends(get_current_admin),
):
    """
    Permite ao administrador corrigir dados bibliográficos da obra
    (título, subtítulo, autores, editora, páginas, ISBN, capa) antes de aprová-la.
    """
    submission = BookSubmissionService.update_submission(
        db=db,
        admin_id=uuid.UUID(admin.id),
        submission_id=submission_id,
        payload=payload,
    )
    return BookSubmissionRead.model_validate(submission)


@router.post(
    "/{submission_id}/approve",
    response_model=BookSubmissionRead,
    summary="Aprovar submissão de livro e inserir no catálogo (Apenas Admin)",
)
def approve_book_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: CurrentUser = Depends(get_current_admin),
):
    submission = BookSubmissionService.approve_submission(
        db=db,
        admin_id=uuid.UUID(admin.id),
        submission_id=submission_id,
    )
    return BookSubmissionRead.model_validate(submission)


@router.post(
    "/{submission_id}/reject",
    response_model=BookSubmissionRead,
    summary="Rejeitar submissão de livro (Apenas Admin)",
)
def reject_book_submission(
    submission_id: uuid.UUID,
    payload: BookSubmissionReview,
    db: Session = Depends(get_db),
    admin: CurrentUser = Depends(get_current_admin),
):
    submission = BookSubmissionService.reject_submission(
        db=db,
        admin_id=uuid.UUID(admin.id),
        submission_id=submission_id,
        reason=payload.rejection_reason,
    )
    return BookSubmissionRead.model_validate(submission)
