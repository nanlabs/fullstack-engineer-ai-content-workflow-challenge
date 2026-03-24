from enum import StrEnum


class ReviewState(StrEnum):
    DRAFT = "draft"
    AI_SUGGESTED = "ai_suggested"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class OperationType(StrEnum):
    GENERATE_DRAFT = "generate_draft"
    TRANSLATE = "translate"
    EXTRACT_METADATA = "extract_metadata"


class AISuggestionStatus(StrEnum):
    SUCCESS = "success"
    FAILED = "failed"


class ReviewActionType(StrEnum):
    START_REVIEW = "start_review"
    ACCEPT = "accept"
    EDIT = "edit"
    REJECT = "reject"
