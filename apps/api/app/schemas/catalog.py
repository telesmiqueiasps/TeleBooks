import re
import unicodedata
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def slugify(text: str) -> str:
    """Converte texto para slug URL amigável."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


# ==============================================================================
# Editoras (Publishers)
# ==============================================================================
class PublisherBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website: str | None = None


class PublisherCreate(PublisherBase):
    pass


class PublisherUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    website: str | None = None


class PublisherRead(PublisherBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Autores (Authors)
# ==============================================================================
class AuthorBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    bio: str | None = None
    avatar_url: str | None = None
    birth_date: date | None = None
    death_date: date | None = None


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    bio: str | None = None
    avatar_url: str | None = None
    birth_date: date | None = None
    death_date: date | None = None


class AuthorRead(AuthorBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Gêneros (Genres)
# ==============================================================================
class GenreBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def set_slug(cls, v, info):
        if not v and "name" in info.data:
            return slugify(info.data["name"])
        return slugify(v) if v else v


class GenreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def set_slug(cls, v, info):
        if not v and "name" in info.data:
            return slugify(info.data["name"])
        return slugify(v) if v else v


class GenreUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = None


class GenreRead(GenreBase):
    id: uuid.UUID
    slug: str
    created_at: datetime | date
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Edições de Livro (Book Editions)
# ==============================================================================
class BookEditionRead(BaseModel):
    id: uuid.UUID
    title: str | None = None
    isbn10: str | None = None
    isbn13: str | None = None
    format: str
    page_count: int | None = None
    published_date: date | None = None
    cover_url: str | None = None
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Livros Bibliográficos Globais (Books)
# ==============================================================================
class BookBase(BaseModel):
    title: str = Field(min_length=1)
    subtitle: str | None = None
    description: str | None = None
    isbn10: str | None = Field(default=None, max_length=10)
    isbn13: str | None = Field(default=None, max_length=13)
    language: str = "pt-BR"
    page_count: int | None = Field(default=None, gt=0)
    publication_date: date | None = None
    cover_url: str | None = None
    thumbnail_url: str | None = None


class BookCreate(BookBase):
    publisher_id: uuid.UUID | None = None
    publisher_name: str | None = None
    author_ids: list[uuid.UUID] = Field(default_factory=list)
    author_names: list[str] = Field(default_factory=list)
    genre_ids: list[uuid.UUID] = Field(default_factory=list)


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    subtitle: str | None = None
    description: str | None = None
    isbn10: str | None = None
    isbn13: str | None = None
    language: str | None = None
    page_count: int | None = Field(default=None, gt=0)
    publication_date: date | None = None
    cover_url: str | None = None
    thumbnail_url: str | None = None
    publisher_id: uuid.UUID | None = None
    publisher_name: str | None = None
    author_ids: list[uuid.UUID] | None = None
    author_names: list[str] | None = None
    genre_ids: list[uuid.UUID] | None = None


class BookRead(BookBase):
    id: uuid.UUID
    publisher: PublisherRead | None = None
    authors: list[AuthorRead] = Field(default_factory=list)
    genres: list[GenreRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
