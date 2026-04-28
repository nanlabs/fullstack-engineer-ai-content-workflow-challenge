from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WorkflowEvent(BaseModel):
    type: str
    thread_id: str
    content_piece_id: UUID
    timestamp: datetime
    payload: dict


# Event type constants
WORKFLOW_STARTED = "workflow.started"
WORKFLOW_NODE_STARTED = "workflow.node.started"
WORKFLOW_NODE_COMPLETED = "workflow.node.completed"
WORKFLOW_TOKENS = "workflow.tokens"
WORKFLOW_DRAFT_CREATED = "workflow.draft.created"
WORKFLOW_AWAITING_HUMAN = "workflow.awaiting_human"
WORKFLOW_RESUMED = "workflow.resumed"
WORKFLOW_DRAFT_UPDATED = "workflow.draft.updated"
WORKFLOW_COMPLETED = "workflow.completed"
WORKFLOW_FAILED = "workflow.failed"
