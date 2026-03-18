from datetime import datetime
from enum import Enum

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from .database import Base


class ReviewState(str, Enum):
    DRAFT = "draft"
    SUGGESTED = "suggested_by_ai"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    contents: Mapped[list["ContentPiece"]] = relationship(
        "ContentPiece", back_populates="campaign", cascade="all, delete-orphan"
    )


class ContentPiece(Base):
    __tablename__ = "content_pieces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="en-US")
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="headline")

    original_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_suggested_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    review_state: Mapped[ReviewState] = mapped_column(
        SAEnum(ReviewState), nullable=False, default=ReviewState.DRAFT
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    campaign: Mapped[Campaign] = relationship("Campaign", back_populates="contents")

