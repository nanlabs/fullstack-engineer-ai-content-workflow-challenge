from __future__ import annotations

from typing import Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import (
    AIActionResponse,
    CampaignCreate,
    CampaignDetailResponse,
    CampaignSummary,
    ContentPieceCreate,
    ContentPieceResponse,
    ContentPieceUpdate,
    GenerateDraftRequest,
    ProviderSettingsResponse,
    ReviewRequest,
    ReviewResponse,
    TranslateRequest,
    UpdateProviderSettingsRequest,
)
from app.application.ai_workflow_service import AIWorkflowService
from app.application.campaign_service import CampaignService
from app.application.content_piece_service import ContentPieceService
from app.application.events import WorkflowEventPublisher
from app.application.provider_settings_service import ProviderSettingsService
from app.application.review_service import ReviewService
from app.application.serializers import WorkflowSerializer
from app.config import Settings
from app.infrastructure.ai.base import AIProvider
from app.infrastructure.events.bus import EventBus


class WorkflowService:
    def __init__(
        self,
        event_bus: EventBus,
        ai_provider: AIProvider | None = None,
        settings: Settings | None = None,
        provider_builder: Callable[[str, str], AIProvider] | None = None,
    ) -> None:
        self.event_bus = event_bus
        self.ai_provider = ai_provider
        self.settings = settings
        self.provider_builder = provider_builder

        self.serializer = WorkflowSerializer()
        self.events = WorkflowEventPublisher(event_bus)
        self.provider_settings = ProviderSettingsService(
            settings=settings,
            ai_provider=ai_provider,
            provider_builder=provider_builder,
        )
        self.content_pieces = ContentPieceService(serializer=self.serializer, events=self.events)
        self.campaigns = CampaignService(serializer=self.serializer)
        self.ai_workflow = AIWorkflowService(
            provider_settings=self.provider_settings,
            content_pieces=self.content_pieces,
            serializer=self.serializer,
            events=self.events,
        )
        self.reviews = ReviewService(
            content_pieces=self.content_pieces,
            serializer=self.serializer,
            events=self.events,
        )

    async def create_campaign(self, session: AsyncSession, payload: CampaignCreate) -> CampaignSummary:
        return await self.campaigns.create_campaign(session, payload)

    async def list_campaigns(self, session: AsyncSession) -> list[CampaignSummary]:
        return await self.campaigns.list_campaigns(session)

    async def get_campaign(self, session: AsyncSession, campaign_id: str) -> CampaignDetailResponse:
        return await self.campaigns.get_campaign(session, campaign_id)

    async def create_content_piece(
        self,
        session: AsyncSession,
        campaign_id: str,
        payload: ContentPieceCreate,
    ) -> ContentPieceResponse:
        return await self.content_pieces.create_content_piece(session, campaign_id, payload)

    async def get_content_piece(self, session: AsyncSession, content_piece_id: str) -> ContentPieceResponse:
        return await self.content_pieces.get_content_piece(session, content_piece_id)

    async def update_content_piece(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: ContentPieceUpdate,
    ) -> ContentPieceResponse:
        return await self.content_pieces.update_content_piece(session, content_piece_id, payload)

    async def generate_draft(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: GenerateDraftRequest,
    ) -> AIActionResponse:
        return await self.ai_workflow.generate_draft(session, content_piece_id, payload)

    async def translate(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: TranslateRequest,
    ) -> AIActionResponse:
        return await self.ai_workflow.translate(session, content_piece_id, payload)

    async def extract_metadata(self, session: AsyncSession, content_piece_id: str) -> AIActionResponse:
        return await self.ai_workflow.extract_metadata(session, content_piece_id)

    async def review(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: ReviewRequest,
    ) -> ReviewResponse:
        return await self.reviews.review(session, content_piece_id, payload)

    async def get_provider_settings(self, session: AsyncSession) -> ProviderSettingsResponse:
        return await self.provider_settings.get_provider_settings(session)

    async def update_provider_settings(
        self,
        session: AsyncSession,
        payload: UpdateProviderSettingsRequest,
    ) -> ProviderSettingsResponse:
        return await self.provider_settings.update_provider_settings(session, payload)
