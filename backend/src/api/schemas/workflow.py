from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, model_validator

from src.api.schemas.draft import DraftRead
from src.db.enums import WorkflowStatus


class ResumeRequest(BaseModel):
    action: Literal["approve", "reject", "edit", "regenerate"]
    draft_id: UUID
    edited_content: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_action_requirements(self) -> ResumeRequest:
        if self.action == "edit" and not self.edited_content:
            raise ValueError("edited_content is required when action is 'edit'")
        if self.action == "regenerate" and not self.notes:
            raise ValueError("notes is required when action is 'regenerate'")
        return self


class ResumeResponse(BaseModel):
    workflow_run_id: UUID
    thread_id: str
    new_status: WorkflowStatus
    draft: DraftRead


class WorkflowRunRead(BaseModel):
    thread_id: str
    content_piece_id: UUID
    status: WorkflowStatus
    current_node: str | None
    iteration: int
    started_at: datetime
    finished_at: datetime | None
    error: str | None
    drafts: list[DraftRead]


class WorkflowRunListItem(BaseModel):
    workflow_run_id: UUID
    thread_id: str
    content_piece_id: UUID
    status: WorkflowStatus
    started_at: datetime
    finished_at: datetime | None
