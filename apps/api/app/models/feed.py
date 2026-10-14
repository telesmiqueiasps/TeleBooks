import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FeedPost(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "feed_posts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    book_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        CheckConstraint("page_number >= 0", name="feed_posts_page_number_check"),
        CheckConstraint("likes_count >= 0", name="feed_posts_likes_count_check"),
        CheckConstraint("comments_count >= 0", name="feed_posts_comments_count_check"),
    )

    # Relacionamentos
    author = relationship("Profile", foreign_keys=[user_id], lazy="joined")
    book = relationship("Book", foreign_keys=[book_id], lazy="joined")
    comments = relationship("FeedPostComment", back_populates="post", cascade="all, delete-orphan", order_by="FeedPostComment.created_at.asc()")
    likes = relationship("FeedPostLike", back_populates="post", cascade="all, delete-orphan")


class FeedPostLike(Base):
    __tablename__ = "feed_post_likes"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("feed_posts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[str] = mapped_column(
        Text,
        server_default="now()",
        nullable=False,
    )

    post = relationship("FeedPost", back_populates="likes")
    user = relationship("Profile", foreign_keys=[user_id], lazy="joined")


class FeedPostComment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "feed_post_comments"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("feed_posts.id", ondelete="CASCADE"),
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

    post = relationship("FeedPost", back_populates="comments")
    author = relationship("Profile", foreign_keys=[user_id], lazy="joined")
