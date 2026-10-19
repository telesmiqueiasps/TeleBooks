import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKeyMixin


class Rabisco(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "rabiscos"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    background_style: Mapped[str] = mapped_column(
        String(50),
        default="gradient-blue",
        nullable=False,
    )
    font_style: Mapped[str] = mapped_column(
        String(30),
        default="sans",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # Relacionamentos
    author = relationship("Profile", foreign_keys=[user_id], lazy="joined")
    views = relationship(
        "RabiscoView",
        back_populates="rabisco",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RabiscoView(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "rabisco_views"

    rabisco_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rabiscos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    viewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relacionamentos
    rabisco = relationship("Rabisco", back_populates="views")
    viewer = relationship("Profile", foreign_keys=[viewer_id], lazy="joined")
