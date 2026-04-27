from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, model_validator

from src.db.enums import DraftStatus


class DraftRead(BaseModel):
    id: UUID
    content_piece_id: UUID
    language: str
    status: DraftStatus
    ai_content: str | None
    edited_content: str | None
    final_content: str | None = None
    model_used: str | None
    provider: str | None
    metadata: dict[str, Any] | None = None
    parent_draft_id: UUID | None
    reviewed_by: str | None
    reviewed_at: datetime | None
    review_notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_final_content(self) -> DraftRead:
        self.final_content = self.edited_content or self.ai_content
        return self


class DraftReviewAction(BaseModel):
    action: Literal["approve", "reject", "edit"]
    edited_content: str | None = None
    review_notes: str | None = None

    @model_validator(mode="after")
    def validate_action(self) -> DraftReviewAction:
        if self.action == "edit" and not self.edited_content:
            raise ValueError("edited_content is required when action is 'edit'")
        return self
