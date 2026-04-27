from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_session
from src.api.schemas.content_piece import (
    ContentPieceCreate,
    ContentPieceDetail,
    ContentPieceUpdate,
)
from src.services import content_piece_service

router = APIRouter()


@router.post(
    "/campaigns/{campaign_id}/content-pieces",
    response_model=ContentPieceDetail,
    status_code=201,
)
async def create_content_piece(
    campaign_id: UUID,
    body: ContentPieceCreate,
    session: AsyncSession = Depends(get_session),
) -> ContentPieceDetail:
    return await content_piece_service.create_content_piece(session, campaign_id, body)


@router.get("/content-pieces/{content_piece_id}", response_model=ContentPieceDetail)
async def get_content_piece(
    content_piece_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> ContentPieceDetail:
    return await content_piece_service.get_content_piece(session, content_piece_id)


@router.patch("/content-pieces/{content_piece_id}", response_model=ContentPieceDetail)
async def update_content_piece(
    content_piece_id: UUID,
    body: ContentPieceUpdate,
    session: AsyncSession = Depends(get_session),
) -> ContentPieceDetail:
    return await content_piece_service.update_content_piece(session, content_piece_id, body)


@router.delete("/content-pieces/{content_piece_id}", status_code=204)
async def delete_content_piece(
    content_piece_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    await content_piece_service.delete_content_piece(session, content_piece_id)
