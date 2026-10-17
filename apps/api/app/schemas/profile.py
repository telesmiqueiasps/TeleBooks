import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileBase(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_public: bool = False


class ProfileCreate(ProfileBase):
    id: uuid.UUID


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=30)
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_public: bool | None = None


class ProfileRead(ProfileBase):
    id: uuid.UUID
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    books_count: int = 0
    follow_status: str = "none"  # "self", "following", "requested", "none"
    can_view_content: bool = True
    role: str = "user"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSearchItem(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_public: bool = False
    followers_count: int = 0
    follow_status: str = "none"

    model_config = ConfigDict(from_attributes=True)


class FollowActionResponse(BaseModel):
    success: bool
    follow_status: str  # "following", "requested", "none"
    message: str


class FollowUserItem(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_public: bool = False
    follow_status: str = "none"
    followed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FollowRequestItem(BaseModel):
    id: uuid.UUID  # follow relation id
    user: UserSearchItem
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
