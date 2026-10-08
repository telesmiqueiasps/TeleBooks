import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.models.shelf import BookStatus
from app.schemas.common import PaginatedResponse
from app.schemas.shelf import (
    ReadingSessionCreate,
    ReadingSessionRead,
    UserBookCreate,
    UserBookRead,
    UserBookUpdate,
)
from app.services.shelf_service import ShelfService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[UserBookRead],
    summary="Listar livros na estante do leitor autenticado",
)
def list_shelf_books(
    status: BookStatus | None = Query(default=None, description="Filtrar por status de leitura"),
    favorite: bool | None = Query(default=None, description="Filtrar por favoritos"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Itens por página"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    items, total = ShelfService.list_user_shelf(
        db=db,
        user_id=user_uuid,
        status=status,
        favorite=favorite,
        page=page,
        page_size=page_size,
    )
    user_book_reads = [UserBookRead.model_validate(ub) for ub in items]
    return PaginatedResponse.create(
        items=user_book_reads, total=total, page=page, page_size=page_size
    )


@router.post(
    "",
    response_model=UserBookRead,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar livro à estante pessoal",
)
def add_book_to_shelf(
    book_in: UserBookCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    user_book = ShelfService.add_to_shelf(db=db, user_id=user_uuid, data=book_in)
    return UserBookRead.model_validate(user_book)


@router.get(
    "/{user_book_id}",
    response_model=UserBookRead,
    summary="Detalhes do livro na estante do usuário",
)
def get_shelf_book(
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    user_book = ShelfService.get_user_book(db=db, user_id=user_uuid, user_book_id=user_book_id)
    return UserBookRead.model_validate(user_book)


@router.patch(
    "/{user_book_id}",
    response_model=UserBookRead,
    summary="Atualizar progresso, status ou avaliação do livro na estante",
)
def update_shelf_book(
    user_book_id: uuid.UUID,
    update_in: UserBookUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    updated = ShelfService.update_user_book(
        db=db,
        user_id=user_uuid,
        user_book_id=user_book_id,
        update_data=update_in,
    )
    return UserBookRead.model_validate(updated)


@router.delete(
    "/{user_book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover livro da estante pessoal",
)
def remove_book_from_shelf(
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.remove_from_shelf(db=db, user_id=user_uuid, user_book_id=user_book_id)
    return None


@router.post(
    "/{user_book_id}/sessions",
    response_model=ReadingSessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar sessão de leitura para um livro da estante",
)
def record_reading_session(
    user_book_id: uuid.UUID,
    session_in: ReadingSessionCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    session = ShelfService.create_reading_session(
        db=db,
        user_id=user_uuid,
        user_book_id=user_book_id,
        session_data=session_in,
    )
    return ReadingSessionRead.model_validate(session)
