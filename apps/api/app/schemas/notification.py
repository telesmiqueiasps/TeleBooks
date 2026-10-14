import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationActorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    actor_id: uuid.UUID
    type: str  # 'post_like' | 'post_comment'
    post_id: uuid.UUID | None = None
    comment_id: uuid.UUID | None = None
    content: str | None = None
    is_read: bool = False
    created_at: datetime
    actor: NotificationActorOut | None = None


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    unread_count: int
    total: int


class NotificationMarkReadRequest(BaseModel):
    notification_ids: list[uuid.UUID] | None = None
    mark_all: bool = False


class NotificationUnreadCountOut(BaseModel):
    unread_count: int
