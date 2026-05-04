from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import ConflictError, NotFoundError
from src.api.schemas.draft import DraftRead, DraftReviewAction
from src.db.enums import DraftStatus
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft

MOCK_REVIEWER = "reviewer@acme.com"

_FINAL_STATUSES = {DraftStatus.approved, DraftStatus.rejected}


async def list_drafts(session: AsyncSession, content_piece_id: UUID) -> list[DraftRead]:
    result = await session.execute(select(ContentPiece).where(ContentPiece.id == content_piece_id))
    if result.scalar_one_or_none() is None:
        raise NotFoundError(f"ContentPiece {content_piece_id} not found")

    rows = await session.execute(
        select(Draft)
        .where(Draft.content_piece_id == content_piece_id)
        .order_by(Draft.created_at.desc())
    )
    return [_to_read(d) for d in rows.scalars().all()]


async def get_draft(session: AsyncSession, draft_id: UUID) -> DraftRead:
    draft = await _get_or_404(session, draft_id)
    return _to_read(draft)


async def review_draft(
    session: AsyncSession, draft_id: UUID, action: DraftReviewAction
) -> DraftRead:
    draft = await _get_or_404(session, draft_id)
    now = datetime.now(tz=UTC)

    match action.action:
        case "approve":
            if draft.status == DraftStatus.rejected:
                raise ConflictError("Cannot approve a draft that is already rejected")
            if draft.status == DraftStatus.approved:
                raise ConflictError("Draft is already approved")
            draft.status = DraftStatus.approved
            draft.reviewed_at = now
            draft.reviewed_by = MOCK_REVIEWER
        case "reject":
            if draft.status == DraftStatus.approved:
                raise ConflictError("Cannot reject a draft that is already approved")
            if draft.status == DraftStatus.rejected:
                raise ConflictError("Draft is already rejected")
            draft.status = DraftStatus.rejected
            draft.reviewed_at = now
            draft.reviewed_by = MOCK_REVIEWER
            draft.review_notes = action.review_notes
        case "edit":
            if draft.status in _FINAL_STATUSES:
                raise ConflictError(f"Cannot edit a draft with status '{draft.status}'")
            draft.edited_content = action.edited_content
            draft.status = DraftStatus.reviewed
            draft.reviewed_at = now
            draft.reviewed_by = MOCK_REVIEWER
            if action.review_notes:
                draft.review_notes = action.review_notes

    draft.updated_at = now
    await session.flush()

    # TODO(spec 06): publish event
    return _to_read(draft)


async def _get_or_404(session: AsyncSession, draft_id: UUID) -> Draft:
    result = await session.execute(select(Draft).where(Draft.id == draft_id))
    draft = result.scalar_one_or_none()
    if draft is None:
        raise NotFoundError(f"Draft {draft_id} not found")
    return draft


def _to_read(d: Draft) -> DraftRead:
    return DraftRead(
        id=d.id,
        content_piece_id=d.content_piece_id,
        language=d.language,
        status=d.status,
        ai_content=d.ai_content,
        edited_content=d.edited_content,
        model_used=d.model_used,
        provider=d.provider,
        metadata=d.content_metadata,
        parent_draft_id=d.parent_draft_id,
        reviewed_by=d.reviewed_by,
        reviewed_at=d.reviewed_at,
        review_notes=d.review_notes,
        created_at=d.created_at,
    )
