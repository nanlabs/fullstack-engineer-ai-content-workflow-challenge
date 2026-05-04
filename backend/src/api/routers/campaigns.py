from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_session
from src.api.pagination import PaginationParams
from src.api.schemas.campaign import CampaignCreate, CampaignDetail, CampaignRead, CampaignUpdate
from src.api.schemas.common import PaginatedResponse
from src.services import campaign_service

router = APIRouter()


@router.post("", response_model=CampaignRead, status_code=201)
async def create_campaign(
    body: CampaignCreate,
    session: AsyncSession = Depends(get_session),
) -> CampaignRead:
    return await campaign_service.create_campaign(session, body)


@router.get("", response_model=PaginatedResponse[CampaignRead])
async def list_campaigns(
    pagination: PaginationParams = Depends(),
    q: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> PaginatedResponse[CampaignRead]:
    return await campaign_service.list_campaigns(
        session, limit=pagination.limit, offset=pagination.offset, q=q
    )


@router.get("/{campaign_id}", response_model=CampaignDetail)
async def get_campaign(
    campaign_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> CampaignDetail:
    return await campaign_service.get_campaign(session, campaign_id)


@router.patch("/{campaign_id}", response_model=CampaignRead)
async def update_campaign(
    campaign_id: UUID,
    body: CampaignUpdate,
    session: AsyncSession = Depends(get_session),
) -> CampaignRead:
    return await campaign_service.update_campaign(session, campaign_id, body)


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    await campaign_service.delete_campaign(session, campaign_id)
