from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Campaign(Base):
    __tablename__ = "campaign"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    brief: Mapped[str | None] = mapped_column(Text)
    target_languages: Mapped[list[str]] = mapped_column(
        ARRAY(String(10)), nullable=False, server_default="{}", default=list
    )
    source_language: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="en", default="en"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    content_pieces: Mapped[list[ContentPiece]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


from src.db.models.content_piece import ContentPiece  # noqa: E402 — resolve forward ref
