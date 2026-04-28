from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.errors import NotFoundError
from src.api.schemas.campaign import CampaignCreate, CampaignDetail, CampaignRead, CampaignUpdate
from src.api.schemas.common import PaginatedResponse
from src.api.schemas.content_piece import ContentPieceSummary
from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft
from src.db.models.workflow_run import WorkflowRun  # noqa: F401 — ensure relationship loaded


async def create_campaign(session: AsyncSession, data: CampaignCreate) -> CampaignRead:
    campaign = Campaign(
        name=data.name,
        brief=data.brief,
        target_languages=data.target_languages,
        source_language=data.source_language,
    )
    session.add(campaign)
    await session.flush()
    await session.refresh(campaign)
    return _to_read(campaign, count=0)


async def list_campaigns(
    session: AsyncSession,
    limit: int,
    offset: int,
    q: str | None,
) -> PaginatedResponse[CampaignRead]:
    base_query = select(Campaign)
    if q:
        base_query = base_query.where(Campaign.name.ilike(f"%{q}%"))

    total_result = await session.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()

    rows = await session.execute(
        base_query.order_by(Campaign.created_at.desc()).limit(limit).offset(offset)
    )
    campaigns = rows.scalars().all()

    if campaigns:
        ids = [c.id for c in campaigns]
        count_rows = await session.execute(
            select(ContentPiece.campaign_id, func.count(ContentPiece.id))
            .where(ContentPiece.campaign_id.in_(ids))
            .group_by(ContentPiece.campaign_id)
        )
        count_map: dict[UUID, int] = {row[0]: row[1] for row in count_rows}
    else:
        count_map = {}

    items = [_to_read(c, count=count_map.get(c.id, 0)) for c in campaigns]
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


async def get_campaign(session: AsyncSession, campaign_id: UUID) -> CampaignDetail:
    result = await session.execute(
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .options(
            selectinload(Campaign.content_pieces).options(
                selectinload(ContentPiece.drafts),
                selectinload(ContentPiece.workflow_run),
            )
        )
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise NotFoundError(f"Campaign {campaign_id} not found")
    return _to_detail(campaign)


async def update_campaign(
    session: AsyncSession, campaign_id: UUID, data: CampaignUpdate
) -> CampaignRead:
    campaign = await _get_or_404(session, campaign_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)
    campaign.updated_at = datetime.now(tz=UTC)
    await session.flush()
    await session.refresh(campaign)

    count_row = await session.execute(
        select(func.count(ContentPiece.id)).where(ContentPiece.campaign_id == campaign_id)
    )
    count = count_row.scalar_one()
    return _to_read(campaign, count=count)


async def delete_campaign(session: AsyncSession, campaign_id: UUID) -> None:
    campaign = await _get_or_404(session, campaign_id)
    await session.delete(campaign)
    await session.flush()


async def _get_or_404(session: AsyncSession, campaign_id: UUID) -> Campaign:
    result = await session.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise NotFoundError(f"Campaign {campaign_id} not found")
    return campaign


def _to_read(campaign: Campaign, count: int) -> CampaignRead:
    return CampaignRead(
        id=campaign.id,
        name=campaign.name,
        brief=campaign.brief,
        target_languages=campaign.target_languages,
        source_language=campaign.source_language,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        content_pieces_count=count,
    )


def _to_detail(campaign: Campaign) -> CampaignDetail:
    pieces = [_piece_summary(cp) for cp in campaign.content_pieces]
    return CampaignDetail(
        id=campaign.id,
        name=campaign.name,
        brief=campaign.brief,
        target_languages=campaign.target_languages,
        source_language=campaign.source_language,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        content_pieces_count=len(pieces),
        content_pieces=pieces,
    )


def _piece_summary(cp: ContentPiece) -> ContentPieceSummary:
    drafts: list[Draft] = sorted(cp.drafts, key=lambda d: d.created_at, reverse=True)
    wr = cp.workflow_run
    return ContentPieceSummary(
        id=cp.id,
        type=cp.type,
        title=cp.title,
        has_drafts=len(drafts) > 0,
        latest_status=drafts[0].status if drafts else None,
        drafts_count=len(drafts),
        workflow_status=wr.status if wr is not None else None,
        latest_thread_id=wr.langgraph_thread_id if wr is not None else None,
    )
