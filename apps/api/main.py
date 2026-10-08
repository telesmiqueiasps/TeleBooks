import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.session import check_db_connection, engine

# Configuração de logging estruturado
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("telebooks.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia ciclo de vida da aplicação (startup e shutdown)."""
    logger.info(
        "Iniciando %s v%s (ambiente: %s)...",
        settings.PROJECT_NAME,
        settings.VERSION,
        settings.ENVIRONMENT.value,
    )

    # Verificação de conectividade com PostgreSQL no startup
    is_healthy, latency, msg = check_db_connection()
    if is_healthy:
        logger.info("PostgreSQL conectado com sucesso (%sms).", latency)
    else:
        logger.warning("Aviso de conexão com o banco de dados: %s", msg)

    yield

    logger.info("Encerrando conexões com o banco de dados...")
    engine.dispose()
    logger.info("API encerrada.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST modular do TeleBooks - Plataforma para leitores",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Registro de tratamento global de exceções
register_exception_handlers(app)

# Configuração do Middleware de CORS
origins = settings.cors_origins_list
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get(
    "/health",
    tags=["Health"],
    summary="Health check simplificado para orquestradores (Render/Docker)",
)
def root_health_check():
    """Health check de nível raiz utilizado pelo Render e balanceadores de carga."""
    is_db_healthy, latency, _ = check_db_connection()
    return {
        "status": "healthy" if is_db_healthy else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT.value,
        "database_connected": is_db_healthy,
        "latency_ms": latency,
    }


# Inclusão de todas as rotas versionadas da API v1
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
