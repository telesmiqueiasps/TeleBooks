import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.schemas.feed import (
    FeedCommentCreate,
    FeedCommentOut,
    FeedLikeResponse,
    FeedPostCreate,
    FeedPostOut,
)
from app.services.feed_service import FeedService

router = APIRouter()


@router.get(
    "",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Listar publicações do feed público",
)
def list_feed(
    page: Annotated[int, Query(ge=1, description="Número da página")] = 1,
    page_size: Annotated[int, Query(ge=1, le=50, description="Itens por página")] = 20,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    current_user_id = uuid.UUID(current_user.id)
    items, total = FeedService.list_feed_posts(
        db=db,
        current_user_id=current_user_id,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post(
    "",
    response_model=FeedPostOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar uma nova publicação no feed",
)
def create_feed_post(
    post_in: FeedPostCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return FeedService.create_post(db=db, user=current_user, post_in=post_in)


@router.get(
    "/{post_id}",
    response_model=FeedPostOut,
    status_code=status.HTTP_200_OK,
    summary="Obter uma publicação do feed pelo ID",
)
def get_feed_post(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    current_user_id = uuid.UUID(current_user.id)
    return FeedService.get_post_by_id(db=db, post_id=post_id, current_user_id=current_user_id)


@router.post(
    "/{post_id}/like",
    response_model=FeedLikeResponse,
    status_code=status.HTTP_200_OK,
    summary="Alternar curtida (curtir / descurtir) em uma publicação",
)
def toggle_post_like(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return FeedService.toggle_like(db=db, user=current_user, post_id=post_id)


@router.get(
    "/{post_id}/comments",
    response_model=list[FeedCommentOut],
    status_code=status.HTTP_200_OK,
    summary="Listar comentários de uma publicação",
)
def list_post_comments(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return FeedService.list_comments(db=db, post_id=post_id)


@router.post(
    "/{post_id}/comments",
    response_model=FeedCommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar comentário a uma publicação",
)
def create_post_comment(
    post_id: uuid.UUID,
    comment_in: FeedCommentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return FeedService.create_comment(
        db=db, user=current_user, post_id=post_id, comment_in=comment_in
    )


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir uma publicação do feed",
)
def delete_feed_post(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    FeedService.delete_post(db=db, user=current_user, post_id=post_id)
