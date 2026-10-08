import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PublisherBase(BaseModel):
    name: str
    website: str | None = None


class PublisherRead(PublisherBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)


class AuthorBase(BaseModel):
    name: str
    bio: str | None = None
    avatar_url: str | None = None


class AuthorRead(AuthorBase):
    id: uuid.UUID
    birth_date: date | None = None
    death_date: date | None = None
    model_config = ConfigDict(from_attributes=True)


class GenreBase(BaseModel):
    name: str
    slug: str


class GenreRead(GenreBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)


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
    author_ids: list[uuid.UUID] = Field(default_factory=list)
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


class BookRead(BookBase):
    id: uuid.UUID
    publisher: PublisherRead | None = None
    authors: list[AuthorRead] = Field(default_factory=list)
    genres: list[GenreRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
