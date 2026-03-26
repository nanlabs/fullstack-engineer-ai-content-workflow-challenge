from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, SecretStr
from typing import Literal

from app.domain.enums import AISuggestionStatus, OperationType, ReviewActionType, ReviewState


class MetadataPayload(BaseModel):
    keywords: list[str] = Field(default_factory=list)
    tone: str
    sentiment: str
    audience: str
    goal: str
    campaign_theme: str
    channel_fit: str
    cta_strength: Literal["low", "medium", "high"]


class CampaignCreate(BaseModel):
    name: str
    description: str | None = None


class ContentPieceCreate(BaseModel):
    source_text: str
    current_text: str | None = None


class ContentPieceUpdate(BaseModel):
    type: str | None = None
    source_text: str | None = None
    current_text: str | None = None
    source_language: str | None = None
    target_language: str | None = None
    review_state: ReviewState | None = None


class GenerateDraftRequest(BaseModel):
    context: str | None = None


class TranslateRequest(BaseModel):
    source_language: str
    target_language: str
    context: str | None = None


class ProviderSettingsResponse(BaseModel):
    provider: Literal["gemini", "openai"] | None = None
    configured: bool
    has_api_key: bool
    source: Literal["database", "environment", "missing"]


class UpdateProviderSettingsRequest(BaseModel):
    provider: Literal["gemini", "openai"]
    api_key: SecretStr | None = None


class ReviewRequest(BaseModel):
    action: ReviewActionType
    comment: str | None = None
    edited_text: str | None = None
    ai_suggestion_id: str | None = None


class WorkflowCounts(BaseModel):
    draft: int = 0
    ai_suggested: int = 0
    in_review: int = 0
    approved: int = 0
    rejected: int = 0


class CampaignSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    content_piece_count: int
    workflow_counts: WorkflowCounts


class AISuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content_piece_id: str
    provider: str
    model: str
    operation_type: OperationType
    input_text: str
    output_text: str | None
    source_language: str | None = None
    target_language: str | None = None
    structured_output_json: dict[str, Any] | None
    status: AISuggestionStatus
    created_at: datetime


class TranslationVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    output_text: str | None
    source_language: str | None
    target_language: str | None
    status: AISuggestionStatus
    created_at: datetime


class DraftDecisionStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class DraftHistoryItemResponse(BaseModel):
    id: str
    provider: str
    model: str
    input_text: str
    output_text: str
    created_at: datetime
    decision_status: DraftDecisionStatus


class ReviewActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content_piece_id: str
    ai_suggestion_id: str | None
    action: ReviewActionType
    comment: str | None
    edited_text: str | None
    created_at: datetime


class ContentPieceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    campaign_id: str
    type: str
    source_text: str
    current_text: str
    source_language: str | None
    target_language: str | None
    review_state: ReviewState
    created_at: datetime
    updated_at: datetime
    latest_suggestion: AISuggestionResponse | None = None
    latest_reviewable_suggestion: AISuggestionResponse | None = None
    latest_review_action: ReviewActionResponse | None = None
    latest_metadata_attempt: AISuggestionResponse | None = None
    latest_metadata: MetadataPayload | None = None
    draft_history: list[DraftHistoryItemResponse] = Field(default_factory=list)
    translation_versions: list[TranslationVersionResponse] = Field(default_factory=list)
    ai_call_history: list[AISuggestionResponse] = Field(default_factory=list)


class CampaignDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    workflow_counts: WorkflowCounts
    content_pieces: list[ContentPieceResponse]


class AIActionResponse(BaseModel):
    suggestion: AISuggestionResponse
    content_piece: ContentPieceResponse


class ReviewResponse(BaseModel):
    review_action: ReviewActionResponse
    content_piece: ContentPieceResponse
