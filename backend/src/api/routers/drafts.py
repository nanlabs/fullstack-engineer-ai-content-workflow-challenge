from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_session
from src.api.schemas.draft import DraftRead, DraftReviewAction
from src.services import draft_service

router = APIRouter()


@router.get("/content-pieces/{content_piece_id}/drafts", response_model=list[DraftRead])
async def list_drafts(
    content_piece_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> list[DraftRead]:
    return await draft_service.list_drafts(session, content_piece_id)


@router.get("/drafts/{draft_id}", response_model=DraftRead)
async def get_draft(
    draft_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> DraftRead:
    return await draft_service.get_draft(session, draft_id)


@router.patch("/drafts/{draft_id}/review", response_model=DraftRead)
async def review_draft(
    draft_id: UUID,
    body: DraftReviewAction,
    session: AsyncSession = Depends(get_session),
) -> DraftRead:
    return await draft_service.review_draft(session, draft_id, body)
