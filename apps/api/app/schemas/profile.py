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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
