import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.models.profile import Profile
from app.schemas.auth import UserMeResponse
from app.schemas.profile import ProfileRead

router = APIRouter()


@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Informações do usuário e perfil logado",
)
def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna os dados autenticados do usuário e seu respectivo perfil associado no banco.
    """
    user_uuid = uuid.UUID(current_user.id)
    profile = db.execute(select(Profile).where(Profile.id == user_uuid)).scalar_one_or_none()

    profile_read = ProfileRead.model_validate(profile) if profile else None

    return UserMeResponse(
        user=current_user,
        profile=profile_read,
    )


@router.get(
    "/check-username",
    summary="Verificar disponibilidade de nome de usuário",
    description="Permite que o formulário de cadastro verifique se o username já está em uso.",
)
def check_username(
    username: str,
    db: Session = Depends(get_db),
):
    clean = username.strip().lower()
    if len(clean) < 3:
        return {"username": clean, "available": False, "reason": "Mínimo 3 caracteres"}

    exists = db.execute(
        select(Profile.id).where(Profile.username == clean)
    ).scalar_one_or_none()

    return {"username": clean, "available": exists is None}

