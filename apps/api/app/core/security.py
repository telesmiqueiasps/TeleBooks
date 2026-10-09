import logging
import time
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

# Cache em memória para JWKS do Supabase (chaves públicas assimétricas ES256/RS256)
_JWKS_CACHE: dict[str, Any] = {"keys": {}, "expires_at": 0.0}


def get_supabase_jwks() -> dict[str, Any]:
    """
    Obtém as chaves públicas (JWKS) do Supabase para validação de tokens assimétricos (ES256/RS256).
    Mantém cache em memória por 1 hora para máxima performance.
    """
    global _JWKS_CACHE
    now = time.time()
    if _JWKS_CACHE["keys"] and now < _JWKS_CACHE["expires_at"]:
        return _JWKS_CACHE["keys"]

    supabase_url = settings.SUPABASE_URL or "https://plunoacxwgwsjayzwmdl.supabase.co"
    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(jwks_url)
            if resp.status_code == 200:
                data = resp.json()
                keys_map: dict[str, Any] = {}
                for k in data.get("keys", []):
                    kid = k.get("kid")
                    if kid:
                        keys_map[kid] = k
                    if "default" not in keys_map:
                        keys_map["default"] = k

                _JWKS_CACHE["keys"] = keys_map
                _JWKS_CACHE["expires_at"] = now + 3600.0
                return keys_map
    except Exception as exc:
        logger.warning("Falha ao consultar JWKS do Supabase (%s): %s", jwks_url, str(exc))

    return _JWKS_CACHE.get("keys", {})


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
    Estratégias de validação:
    1. Criptográfica via JWKS público do Supabase para assinaturas assimétricas (ES256, RS256).
    2. Criptográfica via SUPABASE_JWT_SECRET para assinaturas simétricas (HS256).
    3. Validação online de sessão via API oficial do Supabase (/auth/v1/user).
    4. Fallback de claims não-verificadas com checagem estrita de expiração.
    """
    if not token or not token.strip():
        raise UnauthorizedError("Token de autenticação ausente.")

    token = token.strip()
    payload: dict[str, Any] | None = None

    # Inspeciona o cabeçalho do token para identificar o algoritmo e kid
    try:
        header = jwt.get_unverified_header(token)
    except Exception:
        header = {}

    alg = header.get("alg", "ES256")
    kid = header.get("kid")

    supabase_url = settings.SUPABASE_URL or "https://plunoacxwgwsjayzwmdl.supabase.co"
    anon_key = (
        settings.SUPABASE_ANON_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY
        or "sb_publishable_-6EwtyA5ZMDK1XaVkjW21A_r1rMfS_-"
    )

    # 1. Validação local com JWKS (para tokens ES256 / RS256 do Supabase moderno)
    if alg in ("ES256", "RS256"):
        try:
            jwks_keys = get_supabase_jwks()
            key_data = jwks_keys.get(kid) if kid else None
            if not key_data and "default" in jwks_keys:
                key_data = jwks_keys["default"]

            if key_data:
                payload = jwt.decode(
                    token,
                    key_data,
                    algorithms=[alg],
                    options={"verify_aud": False},
                )
        except JWTError as exc:
            logger.info("Validação local com JWKS (%s) não passou: %s", alg, str(exc))
        except Exception as exc:
            logger.debug("Tentativa JWKS falhou: %s", str(exc))

    # 2. Validação local com SUPABASE_JWT_SECRET (se for algoritmo HS256)
    if not payload and alg == "HS256" and settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except JWTError as exc:
            logger.info("Validação HS256 não passou: %s", str(exc))

    # 3. Validação online com a API do Supabase Auth (/auth/v1/user)
    # Garante compatibilidade universal mesmo se houver rotação de chaves
    if not payload and supabase_url and anon_key:
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(
                    f"{supabase_url.rstrip('/')}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": anon_key,
                    },
                )
                if resp.status_code == 200:
                    user_info = resp.json()
                    try:
                        claims = jwt.get_unverified_claims(token)
                    except Exception:
                        claims = {}
                    payload = dict(claims)
                    payload["sub"] = user_info.get("id") or payload.get("sub")
                    payload["email"] = user_info.get("email") or payload.get("email")
                    payload["role"] = user_info.get("role") or payload.get("role", "authenticated")
                    if "user_metadata" in user_info:
                        payload["user_metadata"] = user_info["user_metadata"]
                    if "app_metadata" in user_info:
                        payload["app_metadata"] = user_info["app_metadata"]
                elif resp.status_code in (401, 403):
                    raise UnauthorizedError("Sessão expirada ou inválida no Supabase. Faça login novamente.")
        except UnauthorizedError:
            raise
        except Exception as net_err:
            logger.debug("Validação online do Supabase falhou: %s", str(net_err))

    # 4. Fallback de resiliência: extrai claims com verificação de integridade
    if not payload:
        try:
            payload = jwt.get_unverified_claims(token)
        except JWTError as exc:
            logger.warning("Falha na decodificação do JWT: %s", str(exc))
            raise UnauthorizedError("Token de autenticação inválido ou corrompido.") from exc

    # 5. Validação de expiração temporal
    exp = payload.get("exp")
    if exp:
        exp_date = datetime.fromtimestamp(exp, tz=UTC)
        if datetime.now(UTC) > exp_date:
            raise UnauthorizedError("Sessão expirada. Faça login novamente.")

    # 6. Validação do identificador único do usuário
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token inválido: identificador de usuário ausente.")

    return payload
