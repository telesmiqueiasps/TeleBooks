import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.catalog import Book
    from app.models.profile import Profile


class BookStatus(enum.StrEnum):
    WANT_TO_READ = "want_to_read"
    READING = "reading"
    READ = "read"
    PAUSED = "paused"
    ABANDONED = "abandoned"


class UserBook(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "user_books"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[BookStatus] = mapped_column(
        SQLEnum(
            BookStatus,
            name="book_status",
            values_callable=lambda x: [e.value for e in x],
            native_enum=True,
        ),
        default=BookStatus.WANT_TO_READ,
        nullable=False,
        index=True,
    )
    rating: Mapped[Decimal | None] = mapped_column(
        Numeric(2, 1),
        nullable=True,
    )
    owned: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    current_page: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    personal_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    shelf_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    private_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="unique_user_book"),
        CheckConstraint("rating >= 0 AND rating <= 5", name="user_books_rating_check"),
        CheckConstraint("purchase_price >= 0", name="user_books_price_check"),
        CheckConstraint("current_page >= 0", name="user_books_current_page_check"),
    )

    # Relacionamentos
    profile: Mapped["Profile"] = relationship("Profile", back_populates="user_books")
    book: Mapped["Book"] = relationship("Book", back_populates="user_books")
    reading_sessions: Mapped[list["ReadingSession"]] = relationship(
        "ReadingSession",
        back_populates="user_book",
        cascade="all, delete-orphan",
    )
    tags: Mapped[list["UserTag"]] = relationship(
        "UserTag",
        secondary="user_book_tags",
        back_populates="user_books",
    )


class Collection(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "collections"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    profile: Mapped["Profile"] = relationship("Profile", back_populates="collections")


class UserCollection(Base):
    __tablename__ = "user_collections"

    collection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("collections.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )


class UserTag(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "user_tags"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("user_id", "name", name="unique_user_tag"),)

    user_books: Mapped[list["UserBook"]] = relationship(
        "UserBook",
        secondary="user_book_tags",
        back_populates="tags",
    )


class UserBookTag(Base):
    __tablename__ = "user_book_tags"

    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_tags.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_books.id", ondelete="CASCADE"),
        primary_key=True,
    )


class ReadingSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "reading_sessions"

    user_book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_page: Mapped[int] = mapped_column(Integer, nullable=False)
    end_page: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("start_page >= 0", name="reading_sessions_start_page_check"),
        CheckConstraint("end_page >= start_page", name="reading_sessions_end_page_check"),
        CheckConstraint("duration_seconds >= 0", name="reading_sessions_duration_check"),
    )

    user_book: Mapped["UserBook"] = relationship("UserBook", back_populates="reading_sessions")
