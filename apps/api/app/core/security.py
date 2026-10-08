import logging
from datetime import UTC, datetime
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.errors import AppException, UnauthorizedError

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CurrentUser(BaseModel):
    id: str = Field(description="UUID do usuário autenticado no Supabase")
    email: str | None = Field(default=None)
    role: str = Field(default="authenticated")
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)

    @property
    def username(self) -> str | None:
        return self.user_metadata.get("username")

    @property
    def full_name(self) -> str | None:
        return self.user_metadata.get("full_name")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodifica e valida o JWT de acesso gerado pelo Supabase Auth.
    """
    try:
        secret = settings.SUPABASE_JWT_SECRET

        if secret:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            # Em desenvolvimento local sem SUPABASE_JWT_SECRET definido,
            # decodificamos as claims verificando formato e expiração.
            if settings.is_development or settings.is_test:
                payload = jwt.get_unverified_claims(token)
            else:
                logger.error("SUPABASE_JWT_SECRET obrigatório em ambiente de produção.")
                raise UnauthorizedError("Configuração de autenticação incompleta no servidor.")

        # Validação de expiração manual se não foi verificada pelo jwt.decode
        exp = payload.get("exp")
        if exp:
            exp_date = datetime.fromtimestamp(exp, tz=UTC)
            if datetime.now(UTC) > exp_date:
                raise UnauthorizedError("Sessão expirada. Faça login novamente.")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Token inválido: identificador de usuário ausente.")

        return payload

    except JWTError as exc:
        logger.warning("Falha na decodificação de JWT: %s", str(exc))
        raise UnauthorizedError("Token de autenticação inválido ou corrompido.") from exc
    except AppException:
        raise
    except Exception as exc:
        logger.error("Erro inesperado ao validar token: %s", str(exc))
        raise UnauthorizedError("Falha na autenticação.") from exc
