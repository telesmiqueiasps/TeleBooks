import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FeedAuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    is_public: bool = False


class FeedBookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    author_name: str | None = None
    cover_url: str | None = None
    page_count: int | None = None


class FeedCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime
    author: FeedAuthorOut | None = None


class FeedCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class FeedPostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    book_id: uuid.UUID | None = None
    page_number: int | None = Field(default=None, ge=0)


class FeedPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    book_id: uuid.UUID | None = None
    content: str
    page_number: int | None = None
    likes_count: int = 0
    comments_count: int = 0
    has_liked: bool = False
    created_at: datetime
    updated_at: datetime
    author: FeedAuthorOut
    book: FeedBookOut | None = None
    comments: list[FeedCommentOut] = []


class FeedLikeResponse(BaseModel):
    post_id: uuid.UUID
    has_liked: bool
    likes_count: int
