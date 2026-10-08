import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, UnauthorizedError
from app.core.security import CurrentUser, decode_access_token
from app.db.session import get_db
from app.models.profile import Profile

# O parâmetro auto_error=False permite que criemos rotas com autenticação opcional
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> CurrentUser:
    """
    Extrai o token JWT do cabeçalho 'Authorization: Bearer <token>'
    e valida as credenciais emitidas pelo Supabase Auth.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Cabeçalho de autenticação ausente ou malformado.")

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token não contém identificador válido de usuário.")

    return CurrentUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
        user_metadata=payload.get("user_metadata", {}),
        app_metadata=payload.get("app_metadata", {}),
    )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> CurrentUser | None:
    """
    Retorna o usuário autenticado caso o token esteja presente e válido,
    ou None para requisições anônimas.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return CurrentUser(
            id=user_id,
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
            user_metadata=payload.get("user_metadata", {}),
            app_metadata=payload.get("app_metadata", {}),
        )
    except Exception:
        return None


def get_current_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    """
    Busca o perfil completo do leitor logado no PostgreSQL.
    """
    user_uuid = uuid.UUID(current_user.id)
    profile = db.execute(select(Profile).where(Profile.id == user_uuid)).scalar_one_or_none()
    if not profile:
        raise NotFoundError("Perfil do usuário não encontrado no banco de dados.")
    return profile
