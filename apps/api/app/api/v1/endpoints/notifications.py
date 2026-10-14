from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.schemas.notification import (
    NotificationListOut,
    NotificationMarkReadRequest,
    NotificationUnreadCountOut,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get(
    "",
    response_model=NotificationListOut,
    status_code=status.HTTP_200_OK,
    summary="Listar notificações do usuário",
)
def list_notifications(
    limit: Annotated[int, Query(ge=1, le=100, description="Quantidade máxima")] = 50,
    offset: Annotated[int, Query(ge=0, description="Offset de paginação")] = 0,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return NotificationService.list_notifications(
        db=db, user=current_user, limit=limit, offset=offset
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountOut,
    status_code=status.HTTP_200_OK,
    summary="Obter contador de notificações não lidas",
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    count = NotificationService.get_unread_count(db=db, user=current_user)
    return NotificationUnreadCountOut(unread_count=count)


@router.post(
    "/mark-read",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Marcar notificações como lidas",
)
def mark_notifications_read(
    payload: NotificationMarkReadRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    updated = NotificationService.mark_as_read(db=db, user=current_user, payload=payload)
    return {"success": True, "updated_count": updated}
