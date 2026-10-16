import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profile import Profile


class UserFollow(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "user_follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    following_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="accepted",
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="unique_follower_following"),
        CheckConstraint("follower_id <> following_id", name="no_self_follow"),
        CheckConstraint("status IN ('accepted', 'pending')", name="check_follow_status"),
    )

    # Relacionamentos
    follower: Mapped["Profile"] = relationship(
        "Profile",
        foreign_keys=[follower_id],
        back_populates="following_relations",
    )
    following: Mapped["Profile"] = relationship(
        "Profile",
        foreign_keys=[following_id],
        back_populates="follower_relations",
    )
