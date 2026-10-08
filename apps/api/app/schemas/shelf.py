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


class UserBookRead(UserBookBase):
    id: uuid.UUID
    user_id: uuid.UUID
    book_id: uuid.UUID
    book: BookRead
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
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

    model_config = ConfigDict(from_attributes=True)
