import re
import unicodedata
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


def slugify(text: str) -> str:
    """Converte nome da comunidade para slug único amigável."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


# ==============================================================================
# Sub-Schemas (Autor, Livro Vinculado)
# ==============================================================================
class CommunityAuthor(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    model_config = ConfigDict(from_attributes=True)


class CommunityBookPreview(BaseModel):
    id: uuid.UUID
    title: str
    subtitle: str | None = None
    author_name: str | None = None
    cover_url: str | None = None
    page_count: int | None = None
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Membros
# ==============================================================================
class CommunityMemberRead(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    user_id: uuid.UUID
    role: str  # 'owner', 'admin', 'member'
    status: str  # 'active', 'pending'
    joined_at: datetime
    user: CommunityAuthor | None = None
    model_config = ConfigDict(from_attributes=True)


class CommunityMemberRoleUpdate(BaseModel):
    role: str = Field(description="'admin' ou 'member'")


class CommunityMemberInvite(BaseModel):
    user_id: uuid.UUID


# ==============================================================================
# Enquetes
# ==============================================================================
class CommunityPollOptionRead(BaseModel):
    id: uuid.UUID
    poll_id: uuid.UUID
    option_text: str
    position: int
    votes_count: int = 0
    percentage: float = 0.0
    model_config = ConfigDict(from_attributes=True)


class CommunityPollRead(BaseModel):
    id: uuid.UUID
    message_id: uuid.UUID
    question: str
    created_at: datetime
    options: list[CommunityPollOptionRead] = []
    total_votes: int = 0
    user_voted_option_id: uuid.UUID | None = None
    model_config = ConfigDict(from_attributes=True)


class CommunityPollVoteCreate(BaseModel):
    option_id: uuid.UUID


# ==============================================================================
# Mensagens
# ==============================================================================
class CommunityMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=3000)
    book_id: uuid.UUID | None = None
    poll_question: str | None = None
    poll_options: list[str] | None = None


class CommunityMessageRead(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    book_id: uuid.UUID | None = None
    book: CommunityBookPreview | None = None
    is_poll: bool = False
    poll: CommunityPollRead | None = None
    author: CommunityAuthor | None = None
    likes_count: int = 0
    has_liked: bool = False
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CommunityMessageLikeResponse(BaseModel):
    liked: bool
    likes_count: int


# ==============================================================================
# Comunidades
# ==============================================================================
class CommunityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    is_private: bool = False
    only_admins_can_post: bool = False
    avatar_url: str | None = None
    cover_url: str | None = None


class CommunityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    is_private: bool | None = None
    only_admins_can_post: bool | None = None
    avatar_url: str | None = None
    cover_url: str | None = None


class CommunityRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    is_private: bool
    only_admins_can_post: bool
    avatar_url: str | None = None
    cover_url: str | None = None
    created_by: uuid.UUID
    creator: CommunityAuthor | None = None
    members_count: int = 0
    pending_requests_count: int = 0
    my_role: str | None = None  # 'owner', 'admin', 'member' ou None
    my_status: str | None = None  # 'active', 'pending' ou None
    can_post: bool = True
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CommunityJoinResponse(BaseModel):
    success: bool
    status: str  # 'active' ou 'pending'
    message: str
