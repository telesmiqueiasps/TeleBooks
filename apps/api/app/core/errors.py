import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Exceção base customizada para a aplicação."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Any | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Recurso não encontrado", details: Any | None = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class UnauthorizedError(AppException):
    def __init__(
        self,
        message: str = "Não autenticado ou credenciais inválidas",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenError(AppException):
    def __init__(
        self,
        message: str = "Acesso negado para este recurso",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ConflictError(AppException):
    def __init__(
        self,
        message: str = "Conflito de integridade com recurso existente",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ValidationError(AppException):
    def __init__(
        self,
        message: str = "Dados fornecidos são inválidos",
        details: Any | None = None,
    ):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


def _format_error_response(
    code: str,
    message: str,
    details: Any | None = None,
    path: str | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "path": path,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    }


def register_exception_handlers(app: FastAPI) -> None:
    """Registra os interceptadores globais de erro no FastAPI."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(
            "AppException capturada [%s]: %s (path: %s)",
            exc.code,
            exc.message,
            request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_format_error_response(
                code=exc.code,
                message=exc.message,
                details=exc.details,
                path=request.url.path,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.info("Erro de validação Pydantic na rota %s: %s", request.url.path, exc.errors())
        formatted_errors: list[dict[str, Any]] = []
        for error in exc.errors():
            loc = " -> ".join([str(p) for p in error.get("loc", []) if p != "body"])
            formatted_errors.append(
                {
                    "field": loc or "corpo_requisicao",
                    "message": error.get("msg", "Valor inválido"),
                    "type": error.get("type", "valor_invalido"),
                }
            )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_format_error_response(
                code="VALIDATION_ERROR",
                message="Um ou mais campos contêm valores inválidos.",
                details=formatted_errors,
                path=request.url.path,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            429: "TOO_MANY_REQUESTS",
        }
        code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
        message = str(exc.detail) if exc.detail else "Erro HTTP na requisição"
        return JSONResponse(
            status_code=exc.status_code,
            content=_format_error_response(
                code=code,
                message=message,
                details=None,
                path=request.url.path,
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.error(
            "Erro no banco de dados na rota %s: %s",
            request.url.path,
            str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_format_error_response(
                code="DATABASE_ERROR",
                message="Erro interno ao consultar ou persistir dados.",
                details=None,
                path=request.url.path,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.critical(
            "Exceção não tratada na rota %s: %s",
            request.url.path,
            str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_format_error_response(
                code="INTERNAL_SERVER_ERROR",
                message="Ocorreu um erro interno no servidor.",
                details=None,
                path=request.url.path,
            ),
        )
