import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.shelf import BookStatus
from app.schemas.catalog import BookRead


class UserBookBase(BaseModel):
    status: BookStatus = BookStatus.WANT_TO_READ
    rating: Decimal | None = Field(default=None, ge=0, le=5)
    owned: bool = True
    favorite: bool = False
    current_page: int = Field(default=0, ge=0)
    personal_color: str | None = Field(default=None, max_length=7)
    shelf_position: int | None = None
    private_notes: str | None = None


class UserBookCreate(UserBookBase):
    book_id: uuid.UUID
    purchase_date: date | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    tag_ids: list[uuid.UUID] | None = None
    collection_ids: list[uuid.UUID] | None = None


class UserBookUpdate(BaseModel):
    status: BookStatus | None = None
    rating: Decimal | None = Field(default=None, ge=0, le=5)
    owned: bool | None = None
    favorite: bool | None = None
    current_page: int | None = Field(default=None, ge=0)
    personal_color: str | None = Field(default=None, max_length=7)
    shelf_position: int | None = None
    private_notes: str | None = None
    purchase_date: date | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    tag_ids: list[uuid.UUID] | None = None
    collection_ids: list[uuid.UUID] | None = None


# ==============================================================================
# Tags Personalizadas do Usuário (User Tags)
# ==============================================================================
class UserTagBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)


class UserTagCreate(UserTagBase):
    pass


class UserTagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)


class UserTagRead(UserTagBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Coleções do Usuário (Collections)
# ==============================================================================
class CollectionBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    is_public: bool = False


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    is_public: bool | None = None
    position: int | None = None


class CollectionReorder(BaseModel):
    collection_ids: list[uuid.UUID]


class CollectionRead(CollectionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    position: int = 0
    book_count: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserBookRead(UserBookBase):
    id: uuid.UUID
    user_id: uuid.UUID
    book_id: uuid.UUID
    book: BookRead
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    tags: list[UserTagRead] = Field(default_factory=list)
    collections: list[CollectionRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def progress_percent(self) -> float:
        if not self.book or not self.book.page_count or self.book.page_count <= 0:
            return 0.0
        return round(min(100.0, (self.current_page / self.book.page_count) * 100), 1)

    model_config = ConfigDict(from_attributes=True)


class ReadingSessionCreate(BaseModel):
    start_page: int = Field(ge=0)
    end_page: int = Field(ge=0)
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    notes: str | None = None


class ReadingSessionRead(BaseModel):
    id: uuid.UUID
    user_book_id: uuid.UUID
    user_id: uuid.UUID
    start_page: int
    end_page: int
    started_at: datetime
    ended_at: datetime | None = None
    duration_seconds: int | None = None
    notes: str | None = None
    book_title: str | None = None
    book_cover_url: str | None = None
    book_total_pages: int | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ReadingOverviewRead(BaseModel):
    currently_reading_count: int = 0
    paused_count: int = 0
    read_count: int = 0
    want_to_read_count: int = 0
    total_pages_read: int = 0
    total_sessions_count: int = 0
    recent_sessions: list[ReadingSessionRead] = Field(default_factory=list)
    active_books: list[UserBookRead] = Field(default_factory=list)


class GenreStatRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    book_count: int

    model_config = ConfigDict(from_attributes=True)


class DashboardRead(BaseModel):
    total_books: int = 0
    total_authors: int = 0
    total_publishers: int = 0
    read_books_count: int = 0
    reading_books_count: int = 0
    paused_books_count: int = 0
    want_to_read_books_count: int = 0
    abandoned_books_count: int = 0
    total_pages_read: int = 0
    total_sessions_count: int = 0
    total_reading_minutes: int = 0
    average_rating: float | None = None
    completion_rate_percent: float = 0.0
    active_readings: list[UserBookRead] = Field(default_factory=list)
    recently_added_books: list[UserBookRead] = Field(default_factory=list)
    recent_sessions: list[ReadingSessionRead] = Field(default_factory=list)
    top_genres: list[GenreStatRead] = Field(default_factory=list)


class UserNoteCreate(BaseModel):
    content: str = Field(min_length=1)
    page_number: int | None = Field(default=None, ge=0)
    chapter: str | None = None
    is_spoiler: bool = False


class UserNoteRead(BaseModel):
    id: uuid.UUID
    user_book_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    page_number: int | None = None
    chapter: str | None = None
    is_spoiler: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserQuoteCreate(BaseModel):
    content: str = Field(min_length=1)
    page_number: int | None = Field(default=None, ge=0)
    author_comment: str | None = None


class UserQuoteRead(BaseModel):
    id: uuid.UUID
    user_book_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    page_number: int | None = None
    author_comment: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
