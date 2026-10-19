import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.schemas.rabisco import (
    RabiscoCreate,
    RabiscoRead,
    RabiscoUserGroup,
)
from app.services.rabisco_service import RabiscoService

router = APIRouter()


@router.get(
    "/feed",
    response_model=list[RabiscoUserGroup],
    status_code=status.HTTP_200_OK,
    summary="Listar rabiscos ativos (últimas 24h) agrupados por autor",
)
def get_rabiscos_feed(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return RabiscoService.list_feed(db=db, current_user=current_user)


@router.post(
    "",
    response_model=RabiscoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Criar um novo rabisco efêmero (24h de duração)",
)
def create_rabisco(
    payload: RabiscoCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return RabiscoService.create_rabisco(db=db, user=current_user, payload=payload)


@router.post(
    "/{rabisco_id}/view",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Registrar visualização de um rabisco",
)
def view_rabisco(
    rabisco_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    RabiscoService.record_view(db=db, current_user=current_user, rabisco_id=rabisco_id)


@router.delete(
    "/{rabisco_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir um rabisco",
)
def delete_rabisco(
    rabisco_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    RabiscoService.delete_rabisco(db=db, current_user=current_user, rabisco_id=rabisco_id)
