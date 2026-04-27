from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.db.enums import ContentPieceType, DraftStatus


class ContentPieceCreate(BaseModel):
    type: ContentPieceType
    title: str | None = None
    source_text: str | None = None


class ContentPieceUpdate(BaseModel):
    title: str | None = None
    source_text: str | None = None


class ContentPieceSummary(BaseModel):
    id: UUID
    type: ContentPieceType
    title: str | None
    has_drafts: bool
    latest_status: DraftStatus | None

    model_config = {"from_attributes": True}


class ContentPieceDetail(ContentPieceSummary):
    campaign_id: UUID
    source_text: str | None
    drafts: list[DraftRead]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


from src.api.schemas.draft import DraftRead  # noqa: E402 — resolve forward ref

ContentPieceDetail.model_rebuild()
