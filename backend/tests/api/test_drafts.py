from __future__ import annotations

import pytest
from httpx import AsyncClient

from src.db.models.draft import Draft


@pytest.mark.asyncio
async def test_list_drafts(client: AsyncClient, seeded_draft: Draft) -> None:
    resp = await client.get(f"/api/content-pieces/{seeded_draft.content_piece_id}/drafts")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(d["id"] == str(seeded_draft.id) for d in data)


@pytest.mark.asyncio
async def test_get_draft(client: AsyncClient, seeded_draft: Draft) -> None:
    resp = await client.get(f"/api/drafts/{seeded_draft.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(seeded_draft.id)
    assert data["final_content"] == seeded_draft.ai_content


@pytest.mark.asyncio
async def test_review_approve_transitions_status(client: AsyncClient, seeded_draft: Draft) -> None:
    resp = await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "approve"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["reviewed_by"] == "reviewer@acme.com"


@pytest.mark.asyncio
async def test_review_reject_transitions_status(client: AsyncClient, seeded_draft: Draft) -> None:
    resp = await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "reject", "review_notes": "Not good"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "rejected"
    assert data["review_notes"] == "Not good"


@pytest.mark.asyncio
async def test_review_edit_requires_edited_content(
    client: AsyncClient, seeded_draft: Draft
) -> None:
    resp = await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "edit"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_review_edit_sets_reviewed_status(client: AsyncClient, seeded_draft: Draft) -> None:
    resp = await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "edit", "edited_content": "Compra ya!"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "reviewed"
    assert data["edited_content"] == "Compra ya!"
    assert data["final_content"] == "Compra ya!"


@pytest.mark.asyncio
async def test_review_approve_rejected_draft_returns_409(
    client: AsyncClient, seeded_draft: Draft
) -> None:
    await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "reject"},
    )
    resp = await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "approve"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_review_reject_approved_draft_returns_409(
    client: AsyncClient, seeded_draft: Draft
) -> None:
    await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "approve"},
    )
    resp = await client.patch(
        f"/api/drafts/{seeded_draft.id}/review",
        json={"action": "reject"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_get_draft_404(client: AsyncClient) -> None:
    resp = await client.get("/api/drafts/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
