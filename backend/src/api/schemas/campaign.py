from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brief: str | None = None
    target_languages: list[str] = Field(default_factory=list, max_length=10)
    source_language: str = "en"

    @field_validator("target_languages")
    @classmethod
    def validate_languages(cls, v: list[str]) -> list[str]:
        for lang in v:
            if not re.match(r"^[a-z]{2}(-[A-Z]{2})?$", lang):
                raise ValueError(f"Invalid language code: {lang}")
        return v

    @field_validator("source_language")
    @classmethod
    def validate_source_language(cls, v: str) -> str:
        if not re.match(r"^[a-z]{2}(-[A-Z]{2})?$", v):
            raise ValueError(f"Invalid language code: {v}")
        return v


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    brief: str | None = None
    target_languages: list[str] | None = None

    @field_validator("target_languages")
    @classmethod
    def validate_languages(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        for lang in v:
            if not re.match(r"^[a-z]{2}(-[A-Z]{2})?$", lang):
                raise ValueError(f"Invalid language code: {lang}")
        return v


class CampaignRead(BaseModel):
    id: UUID
    name: str
    brief: str | None
    target_languages: list[str]
    source_language: str
    created_at: datetime
    updated_at: datetime
    content_pieces_count: int = 0

    model_config = {"from_attributes": True}


class CampaignDetail(CampaignRead):
    content_pieces: list[ContentPieceSummary]

    model_config = {"from_attributes": True}


from src.api.schemas.content_piece import ContentPieceSummary  # noqa: E402 — resolve forward ref

CampaignDetail.model_rebuild()
