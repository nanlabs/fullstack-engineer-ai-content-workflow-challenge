from __future__ import annotations

import pytest
from httpx import AsyncClient

from src.db.models.campaign import Campaign


@pytest.mark.asyncio
async def test_create_campaign_returns_201(client: AsyncClient) -> None:
    resp = await client.post("/api/campaigns", json={"name": "My Campaign"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Campaign"
    assert "id" in data
    assert data["content_pieces_count"] == 0


@pytest.mark.asyncio
async def test_create_campaign_validation_error_on_empty_name(client: AsyncClient) -> None:
    resp = await client.post("/api/campaigns", json={"name": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_create_campaign_invalid_language_code(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/campaigns",
        json={"name": "X", "target_languages": ["INVALID"]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_campaigns_pagination(client: AsyncClient) -> None:
    for i in range(3):
        await client.post("/api/campaigns", json={"name": f"Campaign {i}"})

    resp = await client.get("/api/campaigns", params={"limit": 2, "offset": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert data["total"] >= 3


@pytest.mark.asyncio
async def test_list_campaigns_search(client: AsyncClient, seeded_campaign: Campaign) -> None:
    resp = await client.get("/api/campaigns", params={"q": "Test"})
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["name"] == "Test Campaign" for item in data["items"])


@pytest.mark.asyncio
async def test_get_campaign_404(client: AsyncClient) -> None:
    resp = await client.get("/api/campaigns/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_campaign_detail(client: AsyncClient, seeded_campaign: Campaign) -> None:
    resp = await client.get(f"/api/campaigns/{seeded_campaign.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(seeded_campaign.id)
    assert "content_pieces" in data


@pytest.mark.asyncio
async def test_update_campaign_partial(client: AsyncClient, seeded_campaign: Campaign) -> None:
    resp = await client.patch(
        f"/api/campaigns/{seeded_campaign.id}",
        json={"name": "Updated Name"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Name"
    assert data["brief"] == seeded_campaign.brief


@pytest.mark.asyncio
async def test_delete_campaign_cascades_content_pieces(
    client: AsyncClient, seeded_campaign: Campaign
) -> None:
    cp_resp = await client.post(
        f"/api/campaigns/{seeded_campaign.id}/content-pieces",
        json={"type": "headline", "title": "Cascade test"},
    )
    assert cp_resp.status_code == 201
    cp_id = cp_resp.json()["id"]

    del_resp = await client.delete(f"/api/campaigns/{seeded_campaign.id}")
    assert del_resp.status_code == 204

    cp_get = await client.get(f"/api/content-pieces/{cp_id}")
    assert cp_get.status_code == 404
