from __future__ import annotations

import pytest
from httpx import AsyncClient

from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece


@pytest.mark.asyncio
async def test_create_content_piece_under_campaign(
    client: AsyncClient, seeded_campaign: Campaign
) -> None:
    resp = await client.post(
        f"/api/campaigns/{seeded_campaign.id}/content-pieces",
        json={"type": "headline", "title": "Hello"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "headline"
    assert data["title"] == "Hello"
    assert data["campaign_id"] == str(seeded_campaign.id)
    assert data["has_drafts"] is False


@pytest.mark.asyncio
async def test_create_content_piece_invalid_campaign_404(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/campaigns/00000000-0000-0000-0000-000000000000/content-pieces",
        json={"type": "body"},
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_content_piece_includes_drafts(
    client: AsyncClient,
    seeded_content_piece: ContentPiece,
) -> None:
    resp = await client.get(f"/api/content-pieces/{seeded_content_piece.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(seeded_content_piece.id)
    assert "drafts" in data


@pytest.mark.asyncio
async def test_update_content_piece_partial(
    client: AsyncClient, seeded_content_piece: ContentPiece
) -> None:
    resp = await client.patch(
        f"/api/content-pieces/{seeded_content_piece.id}",
        json={"title": "New Title"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["source_text"] == seeded_content_piece.source_text


@pytest.mark.asyncio
async def test_delete_content_piece(
    client: AsyncClient, seeded_content_piece: ContentPiece
) -> None:
    resp = await client.delete(f"/api/content-pieces/{seeded_content_piece.id}")
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/content-pieces/{seeded_content_piece.id}")
    assert get_resp.status_code == 404
