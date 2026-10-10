from enum import StrEnum
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnvironment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"


class Settings(BaseSettings):
    PROJECT_NAME: str = "TeleBooks API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Environment
    ENVIRONMENT: AppEnvironment = AppEnvironment.DEVELOPMENT
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/telebooks"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # Supabase Auth & Services (Backend only)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Cloudflare R2 Storage (S3-compatible)
    R2_BUCKET_NAME: str = "telebooks-storage"
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_ENDPOINT_URL: str = ""
    R2_PUBLIC_URL: str = ""

    # SMTP Email (Brevo)
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "telesystecnologia@gmail.com"
    EMAILS_FROM_NAME: str = "TeleBooks"
    FRONTEND_URL: str = "https://telebooks.netlify.app"

    # Observability
    SENTRY_DSN: str = ""

    # External APIs
    GOOGLE_BOOKS_API_KEY: str = ""

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == AppEnvironment.DEVELOPMENT

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == AppEnvironment.PRODUCTION

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT == AppEnvironment.TEST

    @property
    def sqlalchemy_database_uri(self) -> str:
        """
        Normaliza a URL do PostgreSQL para compatibilidade com SQLAlchemy 2.x e psycopg2/psycopg3.
        Converte prefixos 'postgres://' e 'postgresql://' para 'postgresql+psycopg2://'.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def r2_endpoint(self) -> str:
        if self.R2_ENDPOINT_URL:
            return self.R2_ENDPOINT_URL
        if self.R2_ACCOUNT_ID:
            return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return ""

    @property
    def r2_configured(self) -> bool:
        return bool(self.R2_ACCESS_KEY_ID and self.R2_SECRET_ACCESS_KEY and self.r2_endpoint)

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    model_config = SettingsConfigDict(
        env_file=(".env", "apps/api/.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
