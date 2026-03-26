from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas import CampaignCreate, CampaignDetailResponse, CampaignSummary
from app.application.exceptions import NotFoundError
from app.application.serializers import WorkflowSerializer
from app.infrastructure.db.models import Campaign, ContentPiece


class CampaignService:
    def __init__(self, *, serializer: WorkflowSerializer) -> None:
        self.serializer = serializer

    async def create_campaign(self, session: AsyncSession, payload: CampaignCreate) -> CampaignSummary:
        now = datetime.now(UTC)
        campaign = Campaign(
            id=str(uuid4()),
            name=payload.name,
            description=payload.description,
            created_at=now,
            updated_at=now,
        )
        session.add(campaign)
        await session.commit()
        await session.refresh(campaign)
        return CampaignSummary.model_validate(
            {**campaign.__dict__, "content_piece_count": 0, "workflow_counts": self.serializer.workflow_counts([])}
        )

    async def list_campaigns(self, session: AsyncSession) -> list[CampaignSummary]:
        result = await session.execute(
            select(Campaign).options(selectinload(Campaign.content_pieces)).order_by(Campaign.created_at.desc())
        )
        campaigns = result.scalars().all()
        return [
            CampaignSummary.model_validate(
                {
                    **campaign.__dict__,
                    "content_piece_count": len(campaign.content_pieces),
                    "workflow_counts": self.serializer.workflow_counts(campaign.content_pieces),
                }
            )
            for campaign in campaigns
        ]

    async def get_campaign(self, session: AsyncSession, campaign_id: str) -> CampaignDetailResponse:
        result = await session.execute(
            select(Campaign)
            .where(Campaign.id == campaign_id)
            .options(
                selectinload(Campaign.content_pieces).selectinload(ContentPiece.ai_suggestions),
                selectinload(Campaign.content_pieces).selectinload(ContentPiece.review_actions),
            )
        )
        campaign = result.scalar_one_or_none()
        if campaign is None:
            raise NotFoundError("Campaign not found")
        content_pieces = [self.serializer.serialize_content_piece(piece) for piece in campaign.content_pieces]
        return CampaignDetailResponse(
            id=campaign.id,
            name=campaign.name,
            description=campaign.description,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            workflow_counts=self.serializer.workflow_counts(campaign.content_pieces),
            content_pieces=content_pieces,
        )
