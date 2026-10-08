from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import check_db_connection
from app.schemas.common import DatabaseHealth, HealthCheckResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    tags=["Health"],
    summary="Health check com status do PostgreSQL",
)
def health_check():
    """
    Verifica a saúde operacional da API e a integridade da conexão com o PostgreSQL.
    """
    is_db_healthy, latency_ms, db_msg = check_db_connection()

    db_health = DatabaseHealth(
        connected=is_db_healthy,
        latency_ms=latency_ms,
        message=db_msg,
    )

    overall_status = "healthy" if is_db_healthy else "degraded"
    status_code = status.HTTP_200_OK if is_db_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    response_data = HealthCheckResponse(
        status=overall_status,
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT.value,
        database=db_health,
    )

    return JSONResponse(
        status_code=status_code,
        content=response_data.model_dump(mode="json"),
    )
