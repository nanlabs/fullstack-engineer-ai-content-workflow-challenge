from __future__ import annotations

from operator import add
from typing import Annotated, Literal, TypedDict


class TranslationDraft(TypedDict):
    language: str
    content: str
    draft_id: str | None  # populated when persisted


class ContentMetadata(TypedDict):
    sentiment: Literal["positive", "neutral", "negative"]
    tone: str
    keywords: list[str]
    estimated_reading_time_seconds: int


class HumanFeedback(TypedDict):
    action: Literal["approve", "reject", "edit", "regenerate"]
    edited_content: str | None
    notes: str | None


class ContentWorkflowState(TypedDict):
    # Input
    content_piece_id: str
    campaign_id: str
    content_type: str  # headline | description | cta | body
    brief: str
    source_language: str
    target_languages: list[str]
    source_text: str | None  # optional extra brief from human

    # Working memory
    initial_draft: str | None
    metadata: ContentMetadata | None
    translations: Annotated[list[TranslationDraft], add]  # reducer: append

    # Human-in-the-loop
    pending_feedback: HumanFeedback | None
    iteration: int  # how many times went through refine

    # Output / control
    status: Literal[
        "initializing",
        "generating",
        "extracting",
        "translating",
        "awaiting_review",
        "refining",
        "approved",
        "rejected",
        "failed",
    ]
    error: str | None
