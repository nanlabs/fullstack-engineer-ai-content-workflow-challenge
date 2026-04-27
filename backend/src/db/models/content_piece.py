from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base
from src.db.enums import ContentPieceType


class ContentPiece(Base):
    __tablename__ = "content_piece"
    __table_args__ = (Index("ix_content_piece_campaign_created", "campaign_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    campaign_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("campaign.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[ContentPieceType] = mapped_column(
        Enum(ContentPieceType, name="content_piece_type"), nullable=False
    )
    source_text: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    campaign: Mapped[Campaign] = relationship(back_populates="content_pieces")
    drafts: Mapped[list[Draft]] = relationship(
        back_populates="content_piece", cascade="all, delete-orphan"
    )
    workflow_run: Mapped[WorkflowRun | None] = relationship(
        back_populates="content_piece", cascade="all, delete-orphan"
    )


from src.db.models.campaign import Campaign  # noqa: E402 — resolve forward ref
from src.db.models.draft import Draft  # noqa: E402 — resolve forward ref
from src.db.models.workflow_run import WorkflowRun  # noqa: E402 — resolve forward ref
