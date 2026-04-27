"""ORM model tests: relationships, cascades, and basic constraints."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.enums import ContentPieceType, DraftStatus
from src.db.models import Campaign, ContentPiece, Draft


@pytest.mark.asyncio
async def test_cascade_delete_removes_children(db_session: AsyncSession) -> None:
    """Deleting a Campaign must cascade-delete its ContentPieces and their Drafts."""
    campaign = Campaign(
        name="Test Campaign",
        target_languages=["en", "es"],
        source_language="en",
    )
    db_session.add(campaign)
    await db_session.flush()

    piece = ContentPiece(
        campaign_id=campaign.id,
        type=ContentPieceType.headline,
        title="Test Headline",
    )
    db_session.add(piece)
    await db_session.flush()

    draft = Draft(
        content_piece_id=piece.id,
        language="en",
        status=DraftStatus.draft,
        ai_content="Buy now — 50% off everything.",
    )
    db_session.add(draft)
    await db_session.flush()

    campaign_id = campaign.id
    piece_id = piece.id
    draft_id = draft.id

    await db_session.delete(campaign)
    await db_session.flush()

    assert await db_session.get(Campaign, campaign_id) is None
    assert await db_session.get(ContentPiece, piece_id) is None
    assert await db_session.get(Draft, draft_id) is None


@pytest.mark.asyncio
async def test_draft_lineage_parent_reference(db_session: AsyncSession) -> None:
    """A Draft can reference a parent draft to track regeneration lineage."""
    campaign = Campaign(name="Lineage Campaign", target_languages=["en"])
    db_session.add(campaign)
    await db_session.flush()

    piece = ContentPiece(campaign_id=campaign.id, type=ContentPieceType.cta, title="CTA")
    db_session.add(piece)
    await db_session.flush()

    parent = Draft(content_piece_id=piece.id, language="en", ai_content="v1 content")
    db_session.add(parent)
    await db_session.flush()

    child = Draft(
        content_piece_id=piece.id,
        language="en",
        ai_content="v2 content",
        parent_draft_id=parent.id,
    )
    db_session.add(child)
    await db_session.flush()

    await db_session.refresh(child)
    assert child.parent_draft_id == parent.id
