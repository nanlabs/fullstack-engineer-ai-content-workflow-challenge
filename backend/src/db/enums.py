import enum


class ContentPieceType(enum.StrEnum):
    headline = "headline"
    description = "description"
    cta = "cta"
    body = "body"


class DraftStatus(enum.StrEnum):
    draft = "draft"
    suggested = "suggested"
    reviewed = "reviewed"
    approved = "approved"
    rejected = "rejected"


class WorkflowStatus(enum.StrEnum):
    pending = "pending"
    running = "running"
    awaiting_human = "awaiting_human"
    completed = "completed"
    failed = "failed"
