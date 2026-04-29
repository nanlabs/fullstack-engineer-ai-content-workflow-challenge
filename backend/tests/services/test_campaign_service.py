"""Tests for CampaignService functions."""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import NotFoundError
from src.api.schemas.campaign import CampaignCreate, CampaignUpdate
from src.db.models.campaign import Campaign
from src.services import campaign_service


@pytest.mark.asyncio
async def test_create_campaign_returns_read_schema(db_session: AsyncSession) -> None:
    data = CampaignCreate(
        name="Spring Sale 2026",
        brief="A short brief",
        source_language="en",
        target_languages=["es", "pt-BR"],
    )
    result = await campaign_service.create_campaign(db_session, data)
    assert result.name == "Spring Sale 2026"
    assert result.content_pieces_count == 0
    assert result.id is not None


@pytest.mark.asyncio
async def test_create_campaign_defaults_source_language(db_session: AsyncSession) -> None:
    data = CampaignCreate(name="Minimal Campaign")
    result = await campaign_service.create_campaign(db_session, data)
    assert result.source_language == "en"
    assert result.target_languages == []


@pytest.mark.asyncio
async def test_list_campaigns_returns_paginated(db_session: AsyncSession) -> None:
    for i in range(3):
        db_session.add(
            Campaign(name=f"List Campaign {i}", source_language="en", target_languages=["es"])
        )
    await db_session.flush()

    result = await campaign_service.list_campaigns(db_session, limit=2, offset=0, q=None)
    assert result.total >= 3
    assert len(result.items) == 2
    assert result.limit == 2
    assert result.offset == 0


@pytest.mark.asyncio
async def test_list_campaigns_filters_by_name(db_session: AsyncSession) -> None:
    db_session.add(Campaign(name="Unique Campaign XYZ", source_language="en", target_languages=[]))
    db_session.add(Campaign(name="Other Campaign ABC", source_language="en", target_languages=[]))
    await db_session.flush()

    result = await campaign_service.list_campaigns(db_session, limit=20, offset=0, q="XYZ")
    assert result.total == 1
    assert result.items[0].name == "Unique Campaign XYZ"


@pytest.mark.asyncio
async def test_list_campaigns_empty_when_no_match(db_session: AsyncSession) -> None:
    result = await campaign_service.list_campaigns(
        db_session, limit=20, offset=0, q="DoesNotExistABC999"
    )
    assert result.total == 0
    assert result.items == []


@pytest.mark.asyncio
async def test_get_campaign_raises_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(NotFoundError):
        await campaign_service.get_campaign(db_session, uuid4())


@pytest.mark.asyncio
async def test_get_campaign_returns_detail_with_content_pieces(db_session: AsyncSession) -> None:
    campaign = Campaign(name="Detail Campaign", source_language="en", target_languages=["es"])
    db_session.add(campaign)
    await db_session.flush()
    await db_session.refresh(campaign)

    result = await campaign_service.get_campaign(db_session, campaign.id)
    assert result.id == campaign.id
    assert result.name == "Detail Campaign"
    assert result.content_pieces == []


@pytest.mark.asyncio
async def test_update_campaign_partial_name(db_session: AsyncSession) -> None:
    campaign = Campaign(
        name="Old Name", brief="Old brief", source_language="en", target_languages=["es"]
    )
    db_session.add(campaign)
    await db_session.flush()
    await db_session.refresh(campaign)

    result = await campaign_service.update_campaign(
        db_session, campaign.id, CampaignUpdate(name="New Name")
    )
    assert result.name == "New Name"
    assert result.brief == "Old brief"


@pytest.mark.asyncio
async def test_update_campaign_raises_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(NotFoundError):
        await campaign_service.update_campaign(
            db_session, uuid4(), CampaignUpdate(name="Irrelevant")
        )


@pytest.mark.asyncio
async def test_delete_campaign_removes_record(db_session: AsyncSession) -> None:
    campaign = Campaign(name="To Delete", source_language="en", target_languages=[])
    db_session.add(campaign)
    await db_session.flush()
    campaign_id = campaign.id

    await campaign_service.delete_campaign(db_session, campaign_id)

    with pytest.raises(NotFoundError):
        await campaign_service.get_campaign(db_session, campaign_id)


@pytest.mark.asyncio
async def test_delete_campaign_raises_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(NotFoundError):
        await campaign_service.delete_campaign(db_session, uuid4())
