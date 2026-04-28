from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ContentMetadataSchema(BaseModel):
    """Pydantic schema used for structured LLM output in extract_metadata node."""

    sentiment: Literal["positive", "neutral", "negative"]
    tone: str
    keywords: list[str] = Field(default_factory=list)
    estimated_reading_time_seconds: int


class GenerateRequest(BaseModel):
    provider: str = "anthropic"


class GenerateResponse(BaseModel):
    workflow_run_id: str
    thread_id: str
    status: str
