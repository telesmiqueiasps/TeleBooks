from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "TeleBooks API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Environment & Database
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = (
        "postgresql://postgres:postgres@localhost:5432/telebooks"
    )

    # Supabase (Backend only)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Observability
    SENTRY_DSN: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
