import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.shelf import UserBook


class Publisher(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "publishers"

    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)

    books: Mapped[list["Book"]] = relationship("Book", back_populates="publisher")
    editions: Mapped[list["BookEdition"]] = relationship("BookEdition", back_populates="publisher")


class Author(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "authors"

    name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    death_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    books: Mapped[list["Book"]] = relationship(
        "Book",
        secondary="book_authors",
        back_populates="authors",
    )


class Genre(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "genres"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    books: Mapped[list["Book"]] = relationship(
        "Book",
        secondary="book_genres",
        back_populates="genres",
    )


class BookAuthor(Base):
    __tablename__ = "book_authors"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("authors.id", ondelete="CASCADE"),
        primary_key=True,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BookGenre(Base):
    __tablename__ = "book_genres"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    genre_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("genres.id", ondelete="CASCADE"),
        primary_key=True,
    )


class Book(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "books"

    title: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    isbn10: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True, index=True)
    isbn13: Mapped[str | None] = mapped_column(String(13), unique=True, nullable=True, index=True)
    language: Mapped[str] = mapped_column(String(10), default="pt-BR", nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    publication_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    publisher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("publishers.id", ondelete="SET NULL"),
        nullable=True,
    )
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (CheckConstraint("page_count > 0", name="books_page_count_check"),)

    # Relacionamentos
    publisher: Mapped[Optional["Publisher"]] = relationship("Publisher", back_populates="books")
    authors: Mapped[list["Author"]] = relationship(
        "Author",
        secondary="book_authors",
        back_populates="books",
    )
    genres: Mapped[list["Genre"]] = relationship(
        "Genre",
        secondary="book_genres",
        back_populates="books",
    )
    editions: Mapped[list["BookEdition"]] = relationship(
        "BookEdition",
        back_populates="book",
        cascade="all, delete-orphan",
    )
    user_books: Mapped[list["UserBook"]] = relationship(
        "UserBook",
        back_populates="book",
        cascade="all, delete-orphan",
    )


class BookEdition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "book_editions"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    isbn10: Mapped[str | None] = mapped_column(String(10), nullable=True)
    isbn13: Mapped[str | None] = mapped_column(String(13), nullable=True)
    publisher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("publishers.id", ondelete="SET NULL"),
        nullable=True,
    )
    edition_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(Text, default="paperback", nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    published_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("page_count > 0", name="book_editions_page_count_check"),
        CheckConstraint(
            "format IN ('paperback', 'hardcover', 'ebook', 'audiobook', 'other')",
            name="book_editions_format_check",
        ),
    )

    book: Mapped["Book"] = relationship("Book", back_populates="editions")
    publisher: Mapped[Optional["Publisher"]] = relationship("Publisher", back_populates="editions")
