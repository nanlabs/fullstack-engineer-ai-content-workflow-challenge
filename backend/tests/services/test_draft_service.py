from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import ConflictError, NotFoundError
from src.api.schemas.draft import DraftReviewAction
from src.db.enums import DraftStatus
from src.db.models.draft import Draft
from src.services import draft_service


@pytest.mark.asyncio
async def test_approve_transitions_to_approved(
    db_session: AsyncSession, seeded_draft: Draft
) -> None:
    result = await draft_service.review_draft(
        db_session, seeded_draft.id, DraftReviewAction(action="approve")
    )
    assert result.status == DraftStatus.approved
    assert result.reviewed_by == "reviewer@acme.com"
    assert result.reviewed_at is not None


@pytest.mark.asyncio
async def test_reject_transitions_to_rejected(
    db_session: AsyncSession, seeded_draft: Draft
) -> None:
    result = await draft_service.review_draft(
        db_session,
        seeded_draft.id,
        DraftReviewAction(action="reject", review_notes="Not suitable"),
    )
    assert result.status == DraftStatus.rejected
    assert result.review_notes == "Not suitable"


@pytest.mark.asyncio
async def test_edit_transitions_to_reviewed(db_session: AsyncSession, seeded_draft: Draft) -> None:
    result = await draft_service.review_draft(
        db_session,
        seeded_draft.id,
        DraftReviewAction(action="edit", edited_content="Cómpralo ya"),
    )
    assert result.status == DraftStatus.reviewed
    assert result.edited_content == "Cómpralo ya"
    assert result.final_content == "Cómpralo ya"


@pytest.mark.asyncio
async def test_approve_rejected_raises_conflict(
    db_session: AsyncSession, seeded_draft: Draft
) -> None:
    await draft_service.review_draft(
        db_session, seeded_draft.id, DraftReviewAction(action="reject")
    )
    with pytest.raises(ConflictError):
        await draft_service.review_draft(
            db_session, seeded_draft.id, DraftReviewAction(action="approve")
        )


@pytest.mark.asyncio
async def test_reject_approved_raises_conflict(
    db_session: AsyncSession, seeded_draft: Draft
) -> None:
    await draft_service.review_draft(
        db_session, seeded_draft.id, DraftReviewAction(action="approve")
    )
    with pytest.raises(ConflictError):
        await draft_service.review_draft(
            db_session, seeded_draft.id, DraftReviewAction(action="reject")
        )


@pytest.mark.asyncio
async def test_get_draft_not_found_raises_404(db_session: AsyncSession) -> None:
    from uuid import uuid4

    with pytest.raises(NotFoundError):
        await draft_service.get_draft(db_session, uuid4())
