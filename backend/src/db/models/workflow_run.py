from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base
from src.db.enums import WorkflowStatus


class WorkflowRun(Base):
    __tablename__ = "workflow_run"
    __table_args__ = (
        Index("ix_workflow_run_content_piece_started", "content_piece_id", "started_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    content_piece_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_piece.id", ondelete="CASCADE"),
        nullable=False,
    )
    langgraph_thread_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[WorkflowStatus] = mapped_column(
        Enum(WorkflowStatus, name="workflow_status"),
        nullable=False,
        server_default="pending",
        default=WorkflowStatus.pending,
    )
    current_node: Mapped[str | None] = mapped_column(String(100))
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    content_piece: Mapped[ContentPiece] = relationship(back_populates="workflow_run")


from src.db.models.content_piece import ContentPiece  # noqa: E402 — resolve forward ref
