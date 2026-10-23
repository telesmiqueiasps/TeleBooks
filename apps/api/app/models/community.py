import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Community(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "communities"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    only_admins_can_post: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relacionamentos
    creator = relationship("Profile", foreign_keys=[created_by], lazy="joined")
    members = relationship(
        "CommunityMember",
        back_populates="community",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    messages = relationship(
        "CommunityMessage",
        back_populates="community",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CommunityMember(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "community_members"

    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relacionamentos
    community = relationship("Community", back_populates="members")
    user = relationship("Profile", foreign_keys=[user_id], lazy="joined")


class CommunityMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "community_messages"

    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    book_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_poll: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relacionamentos
    community = relationship("Community", back_populates="messages")
    author = relationship("Profile", foreign_keys=[user_id], lazy="joined")
    book = relationship("Book", foreign_keys=[book_id], lazy="joined")
    poll = relationship(
        "CommunityPoll",
        back_populates="message",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="joined",
    )
    likes = relationship(
        "CommunityMessageLike",
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CommunityPoll(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "community_polls"

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("community_messages.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    question: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relacionamentos
    message = relationship("CommunityMessage", back_populates="poll")
    options = relationship(
        "CommunityPollOption",
        back_populates="poll",
        order_by="CommunityPollOption.position",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    votes = relationship(
        "CommunityPollVote",
        back_populates="poll",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CommunityPollOption(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "community_poll_options"

    poll_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("community_polls.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_text: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relacionamentos
    poll = relationship("CommunityPoll", back_populates="options")
    votes = relationship(
        "CommunityPollVote",
        back_populates="option",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CommunityPollVote(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "community_poll_votes"

    poll_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("community_polls.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("community_poll_options.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    voted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relacionamentos
    poll = relationship("CommunityPoll", back_populates="votes")
    option = relationship("CommunityPollOption", back_populates="votes")
    user = relationship("Profile", foreign_keys=[user_id], lazy="joined")


class CommunityMessageLike(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "community_message_likes"

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("community_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relacionamentos
    message = relationship("CommunityMessage", back_populates="likes")
    user = relationship("Profile", foreign_keys=[user_id], lazy="joined")
