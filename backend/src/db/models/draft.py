from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base
from src.db.enums import DraftStatus


class Draft(Base):
    __tablename__ = "draft"
    __table_args__ = (
        Index(
            "ix_draft_content_piece_language_created",
            "content_piece_id",
            "language",
            "created_at",
        ),
        Index("ix_draft_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    content_piece_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_piece.id", ondelete="CASCADE"),
        nullable=False,
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[DraftStatus] = mapped_column(
        Enum(DraftStatus, name="draft_status"),
        nullable=False,
        server_default="draft",
        default=DraftStatus.draft,
    )
    ai_content: Mapped[str | None] = mapped_column(Text)
    edited_content: Mapped[str | None] = mapped_column(Text)
    model_used: Mapped[str | None] = mapped_column(String(100))
    provider: Mapped[str | None] = mapped_column(String(50))
    prompt_template_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("prompt_template.id"), nullable=True
    )
    # Column named 'metadata' in DB; renamed here to avoid shadowing DeclarativeBase.metadata
    content_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB)
    parent_draft_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("draft.id"), nullable=True
    )
    reviewed_by: Mapped[str | None] = mapped_column(String(100))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    content_piece: Mapped[ContentPiece] = relationship(back_populates="drafts")
    prompt_template: Mapped[PromptTemplate | None] = relationship()
    # Adjacency-list self-referential relationship for draft lineage (regenerations)
    parent_draft: Mapped[Draft | None] = relationship(
        "Draft",
        foreign_keys=[parent_draft_id],
        back_populates="child_drafts",
        remote_side=[id],
    )
    child_drafts: Mapped[list[Draft]] = relationship(
        "Draft",
        foreign_keys=[parent_draft_id],
        back_populates="parent_draft",
    )


from src.db.models.content_piece import ContentPiece  # noqa: E402 — resolve forward ref
from src.db.models.prompt_template import PromptTemplate  # noqa: E402 — resolve forward ref
