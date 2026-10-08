from datetime import UTC, datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    """Envelope padronizado para respostas de sucesso."""

    success: bool = True
    data: T
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PaginatedResponse(BaseModel, Generic[T]):
    """Envelope padronizado para listagens paginadas."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, page_size: int):
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


class DatabaseHealth(BaseModel):
    connected: bool
    latency_ms: float
    message: str


class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    service: str
    version: str
    environment: str
    database: DatabaseHealth
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
