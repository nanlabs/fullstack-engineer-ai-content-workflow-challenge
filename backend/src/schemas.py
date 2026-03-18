from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from .models import ReviewState


class ContentPieceBase(BaseModel):
    locale: str = "en-US"
    type: str = "headline"
    original_text: Optional[str] = None


class ContentPieceCreate(ContentPieceBase):
    pass

class ContentPieceUpdate(BaseModel):
    ai_suggested_text: Optional[str] = None
    final_text: Optional[str] = None
    review_state: Optional[ReviewState] = None


class ContentPieceRead(ContentPieceBase):
    id: int
    ai_suggested_text: Optional[str] = None
    final_text: Optional[str] = None
    review_state: ReviewState
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None


class CampaignCreate(CampaignBase):
    contents: Optional[List[ContentPieceCreate]] = None


class CampaignRead(CampaignBase):
    id: int
    created_at: datetime
    contents: List[ContentPieceRead] = []

    class Config:
        from_attributes = True


class GenerateDraftRequest(BaseModel):
    content_id: int
    tone: str | None = None
    language: str | None = None


class GenerateDraftResponse(BaseModel):
    content_id: int
    suggested_text: str


class TranslateRequest(BaseModel):
    content_id: int
    target_locale: str = "es-ES"


class TranslateResponse(BaseModel):
    content_id: int
    translated_text: str


class CompareModelsRequest(BaseModel):
    content_id: int
    target_locale: str | None = None
    tone: str | None = None


class CompareModelsResponse(BaseModel):
    content_id: int
    openai_text: str | None = None
    anthropic_text: str | None = None

class RunPipelineRequest(BaseModel):
    content_id: int
    tone: Optional[str]
    target_locales: Optional[List[str]] = []
