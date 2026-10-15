import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BookSubmissionUserRead(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class BookSubmissionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="Título da obra")
    subtitle: str | None = Field(default=None, max_length=500, description="Subtítulo da obra")
    author_names: list[str] = Field(..., min_length=1, description="Lista com nomes dos autores")
    publisher_name: str | None = Field(default=None, max_length=255, description="Nome da editora")
    description: str | None = Field(default=None, description="Sinopse ou descrição do livro")
    isbn13: str | None = Field(default=None, max_length=13, description="Código ISBN-13")
    isbn10: str | None = Field(default=None, max_length=10, description="Código ISBN-10")
    page_count: int | None = Field(default=None, ge=1, description="Número total de páginas")
    cover_url: str | None = Field(default=None, description="URL da imagem da capa")
    initial_shelf_status: str = Field(
        default="want_to_read",
        description="Status inicial na estante do leitor caso aprovado ('want_to_read', 'reading', etc.)",
    )


class BookSubmissionReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$", description="Ação: 'approve' ou 'reject'")
    rejection_reason: str | None = Field(default=None, description="Motivo caso rejeitado")


class BookSubmissionRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    subtitle: str | None = None
    author_names: list[str]
    publisher_name: str | None = None
    description: str | None = None
    isbn13: str | None = None
    isbn10: str | None = None
    page_count: int | None = None
    cover_url: str | None = None
    initial_shelf_status: str
    status: str
    rejection_reason: str | None = None
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    created_book_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    user: BookSubmissionUserRead | None = None

    model_config = ConfigDict(from_attributes=True)
