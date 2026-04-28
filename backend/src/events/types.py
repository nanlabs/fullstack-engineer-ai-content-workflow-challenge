from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel


class EventType(StrEnum):
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_NODE_STARTED = "workflow.node.started"
    WORKFLOW_NODE_COMPLETED = "workflow.node.completed"
    WORKFLOW_TOKENS = "workflow.tokens"
    WORKFLOW_DRAFT_CREATED = "workflow.draft.created"
    WORKFLOW_AWAITING_HUMAN = "workflow.awaiting_human"
    WORKFLOW_RESUMED = "workflow.resumed"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    DRAFT_UPDATED = "draft.updated"


class Event(BaseModel):
    type: EventType
    timestamp: datetime
    campaign_id: UUID | None = None
    content_piece_id: UUID | None = None
    thread_id: str | None = None
    payload: dict
