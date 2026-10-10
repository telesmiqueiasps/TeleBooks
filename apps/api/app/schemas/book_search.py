import re
import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.catalog import BookRead


class ExternalBookItem(BaseModel):
    provider: str = Field(description="Identificador do provedor externo, ex: 'google_books' ou 'open_library'")
    external_id: str = Field(description="ID do livro no provedor externo")
    title: str = Field(description="Título do livro")
    subtitle: str | None = Field(default=None, description="Subtítulo do livro")
    authors: list[str] = Field(default_factory=list, description="Lista de nomes dos autores")
    publisher: str | None = Field(default=None, description="Nome da editora")
    published_date: str | None = Field(default=None, description="Data de publicação bruta")
    description: str | None = Field(default=None, description="Sinopse ou descrição do livro")
    isbn10: str | None = Field(default=None, description="ISBN de 10 dígitos normalizado")
    isbn13: str | None = Field(default=None, description="ISBN de 13 dígitos normalizado")
    page_count: int | None = Field(default=None, description="Quantidade de páginas")
    language: str | None = Field(default="pt-BR", description="Idioma do livro")
    categories: list[str] = Field(default_factory=list, description="Categorias ou gêneros literários")
    cover_url: str | None = Field(default=None, description="URL da capa em alta resolução")
    thumbnail_url: str | None = Field(default=None, description="URL da miniatura da capa")

    # Metadados de integração com o catálogo do TeleBooks
    is_already_in_catalog: bool = Field(default=False, description="Indica se o livro já existe no catálogo local")
    existing_book_id: uuid.UUID | None = Field(default=None, description="ID do livro no catálogo se já existir")
    is_on_user_shelf: bool = Field(default=False, description="Indica se o livro já está na estante do usuário atual")
    user_book_id: uuid.UUID | None = Field(default=None, description="ID do UserBook na estante se já estiver salvo")
    user_book_status: str | None = Field(default=None, description="Status de leitura na estante do usuário")

    model_config = ConfigDict(from_attributes=True)


class BookSearchQueryParams(BaseModel):
    q: str | None = Field(default=None, description="Termo de busca genérico (título, autor ou ISBN)")
    title: str | None = Field(default=None, description="Filtro específico por título")
    author: str | None = Field(default=None, description="Filtro específico por autor")
    isbn: str | None = Field(default=None, description="Filtro específico por código ISBN")
    provider: str | None = Field(default=None, description="Provedor desejado ('google_books' ou 'open_library')")
    limit: int = Field(default=12, ge=1, le=40, description="Quantidade máxima de resultados")


class BookImportConfirmRequest(BaseModel):
    title: str = Field(min_length=1, description="Título do livro")
    subtitle: str | None = Field(default=None, description="Subtítulo do livro")
    authors: list[str] = Field(default_factory=list, description="Lista de nomes dos autores")
    publisher: str | None = Field(default=None, description="Nome da editora")
    description: str | None = Field(default=None, description="Sinopse do livro")
    isbn10: str | None = Field(default=None, max_length=10, description="ISBN de 10 dígitos")
    isbn13: str | None = Field(default=None, max_length=13, description="ISBN de 13 dígitos")
    page_count: int | None = Field(default=None, gt=0, description="Número de páginas")
    publication_date: date | None = Field(default=None, description="Data de publicação estruturada")
    published_date_raw: str | None = Field(default=None, description="Data em formato texto original")
    language: str = Field(default="pt-BR", description="Idioma do livro")
    cover_url: str | None = Field(default=None, description="URL da capa")
    thumbnail_url: str | None = Field(default=None, description="URL da miniatura")
    genres: list[str] = Field(default_factory=list, description="Gêneros ou categorias")

    @field_validator("isbn10", "isbn13", mode="before")
    @classmethod
    def clean_isbn_field(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            clean = re.sub(r"[^0-9X]", "", v.strip().upper())
            return clean if clean else None
        return v

    # Ação opcional de estante
    add_to_shelf: bool = Field(default=False, description="Se True, insere diretamente na estante do leitor")
    shelf_status: str | None = Field(
        default="want_to_read",
        description="Status inicial na estante ('want_to_read', 'reading', 'read', 'paused', 'abandoned')",
    )


class BookImportConfirmResponse(BaseModel):
    book: BookRead = Field(description="Livro criado ou reutilizado no catálogo global")
    reused: bool = Field(description="True se o livro já existia e foi reutilizado, False se foi criado agora")
    already_on_shelf: bool = Field(default=False, description="True se o livro já estava na estante do usuário")
    user_book_id: uuid.UUID | None = Field(default=None, description="ID do UserBook associado na estante")
    message: str = Field(description="Mensagem descritiva da operação")

    model_config = ConfigDict(from_attributes=True)
