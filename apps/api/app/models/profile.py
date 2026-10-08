import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.shelf import Collection, UserBook


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
    )
    username: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (CheckConstraint("char_length(username) >= 3", name="username_length"),)

    # Relacionamentos
    user_books: Mapped[list["UserBook"]] = relationship(
        "UserBook",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    collections: Mapped[list["Collection"]] = relationship(
        "Collection",
        back_populates="profile",
        cascade="all, delete-orphan",
    )
