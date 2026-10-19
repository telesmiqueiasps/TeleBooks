import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RabiscoAuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None


class RabiscoCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=300, description="Texto do rabisco (máx 300 caracteres)")
    background_style: str = Field(default="gradient-blue", max_length=50, description="Tema/gradiente de fundo")
    font_style: str = Field(default="sans", max_length=30, description="Estilo de fonte tipográfica")


class RabiscoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    background_style: str = "gradient-blue"
    font_style: str = "sans"
    created_at: datetime
    expires_at: datetime
    author: RabiscoAuthorOut
    views_count: int = 0
    has_viewed: bool = False


class RabiscoUserGroup(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    has_unseen: bool = False
    latest_created_at: datetime
    rabiscos: list[RabiscoRead] = []
