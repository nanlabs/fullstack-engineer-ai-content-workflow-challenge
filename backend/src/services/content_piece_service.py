from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.errors import NotFoundError
from src.api.schemas.content_piece import (
    ContentPieceCreate,
    ContentPieceDetail,
    ContentPieceUpdate,
)
from src.api.schemas.draft import DraftRead
from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft


async def create_content_piece(
    session: AsyncSession, campaign_id: UUID, data: ContentPieceCreate
) -> ContentPieceDetail:
    result = await session.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise NotFoundError(f"Campaign {campaign_id} not found")

    cp = ContentPiece(
        campaign_id=campaign_id,
        type=data.type,
        title=data.title,
        source_text=data.source_text,
    )
    session.add(cp)
    await session.flush()
    await session.refresh(cp)
    return _to_detail(cp, drafts=[], source_language=campaign.source_language)


async def get_content_piece(session: AsyncSession, content_piece_id: UUID) -> ContentPieceDetail:
    result = await session.execute(
        select(ContentPiece)
        .where(ContentPiece.id == content_piece_id)
        .options(selectinload(ContentPiece.drafts), selectinload(ContentPiece.campaign))
    )
    cp = result.scalar_one_or_none()
    if cp is None:
        raise NotFoundError(f"ContentPiece {content_piece_id} not found")
    source_language = cp.campaign.source_language if cp.campaign else None
    return _to_detail(cp, drafts=cp.drafts, source_language=source_language)


async def update_content_piece(
    session: AsyncSession, content_piece_id: UUID, data: ContentPieceUpdate
) -> ContentPieceDetail:
    result = await session.execute(
        select(ContentPiece)
        .where(ContentPiece.id == content_piece_id)
        .options(selectinload(ContentPiece.drafts), selectinload(ContentPiece.campaign))
    )
    cp = result.scalar_one_or_none()
    if cp is None:
        raise NotFoundError(f"ContentPiece {content_piece_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cp, field, value)
    cp.updated_at = datetime.now(tz=UTC)
    await session.flush()
    source_language = cp.campaign.source_language if cp.campaign else None
    return _to_detail(cp, drafts=cp.drafts, source_language=source_language)


async def delete_content_piece(session: AsyncSession, content_piece_id: UUID) -> None:
    result = await session.execute(select(ContentPiece).where(ContentPiece.id == content_piece_id))
    cp = result.scalar_one_or_none()
    if cp is None:
        raise NotFoundError(f"ContentPiece {content_piece_id} not found")
    await session.delete(cp)
    await session.flush()


def _to_detail(
    cp: ContentPiece,
    drafts: list[Draft],
    source_language: str | None = None,
) -> ContentPieceDetail:
    sorted_drafts = sorted(drafts, key=lambda d: d.created_at, reverse=True)
    draft_reads = [_draft_read(d) for d in sorted_drafts]
    return ContentPieceDetail(
        id=cp.id,
        type=cp.type,
        title=cp.title,
        has_drafts=len(drafts) > 0,
        latest_status=sorted_drafts[0].status if sorted_drafts else None,
        campaign_id=cp.campaign_id,
        source_language=source_language,
        source_text=cp.source_text,
        drafts=draft_reads,
        created_at=cp.created_at,
        updated_at=cp.updated_at,
    )


def _draft_read(d: Draft) -> DraftRead:
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
