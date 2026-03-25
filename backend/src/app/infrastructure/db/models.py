from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    content_pieces: Mapped[list[ContentPiece]] = relationship(back_populates="campaign")


class ContentPiece(Base):
    __tablename__ = "content_pieces"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(Text, nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    current_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_language: Mapped[str | None] = mapped_column(Text)
    target_language: Mapped[str | None] = mapped_column(Text)
    review_state: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    campaign: Mapped[Campaign] = relationship(back_populates="content_pieces")
    ai_suggestions: Mapped[list[AISuggestion]] = relationship(back_populates="content_piece")
    review_actions: Mapped[list[ReviewAction]] = relationship(back_populates="content_piece")


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    content_piece_id: Mapped[str] = mapped_column(
        ForeignKey("content_pieces.id", ondelete="CASCADE")
    )
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    operation_type: Mapped[str] = mapped_column(Text, nullable=False)
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_text: Mapped[str | None] = mapped_column(Text)
    structured_output_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    content_piece: Mapped[ContentPiece] = relationship(back_populates="ai_suggestions")
    review_actions: Mapped[list[ReviewAction]] = relationship(back_populates="ai_suggestion")


class ReviewAction(Base):
    __tablename__ = "review_actions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    content_piece_id: Mapped[str] = mapped_column(
        ForeignKey("content_pieces.id", ondelete="CASCADE")
    )
    ai_suggestion_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_suggestions.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    edited_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    content_piece: Mapped[ContentPiece] = relationship(back_populates="review_actions")
    ai_suggestion: Mapped[AISuggestion | None] = relationship(back_populates="review_actions")
