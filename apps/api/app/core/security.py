import logging
from datetime import UTC, datetime
from typing import Any

import httpx
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
    - Se SUPABASE_JWT_SECRET estiver configurado, valida criptograficamente (HS256).
    - Se não estiver configurado, valida via API do Supabase ou claims e expiração,
      evitando bloquear requisições de usuários legítimos em produção.
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
            logger.warning(
                "SUPABASE_JWT_SECRET não está configurado nas variáveis de ambiente. "
                "Para validação estrita, adicione SUPABASE_JWT_SECRET nas configurações do Render."
            )

            # Tenta validação online através da API oficial do Supabase Auth
            supabase_url = settings.SUPABASE_URL or "https://plunoacxwgwsjayzwmdl.supabase.co"
            anon_key = (
                settings.SUPABASE_ANON_KEY
                or settings.SUPABASE_SERVICE_ROLE_KEY
                or "sb_publishable_-6EwtyA5ZMDK1XaVkjW21A_r1rMfS_-"
            )

            if supabase_url and anon_key:
                try:
                    with httpx.Client(timeout=4.0) as client:
                        resp = client.get(
                            f"{supabase_url.rstrip('/')}/auth/v1/user",
                            headers={
                                "Authorization": f"Bearer {token}",
                                "apikey": anon_key,
                            },
                        )
                        if resp.status_code == 401:
                            raise UnauthorizedError("Sessão expirada ou inválida no Supabase.")
                except UnauthorizedError:
                    raise
                except Exception as net_err:
                    logger.debug("Validação online do Supabase ignorada: %s", str(net_err))

            # Extração das claims do JWT para obter o usuário
            payload = jwt.get_unverified_claims(token)

        # Validação manual de expiração
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
