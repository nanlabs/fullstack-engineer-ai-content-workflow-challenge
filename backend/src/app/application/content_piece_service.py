from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas import ContentPieceCreate, ContentPieceResponse, ContentPieceUpdate
from app.application.events import WorkflowEventPublisher
from app.application.exceptions import NotFoundError
from app.application.serializers import WorkflowSerializer
from app.domain.enums import ReviewState
from app.infrastructure.db.models import Campaign, ContentPiece


class ContentPieceService:
    def __init__(self, *, serializer: WorkflowSerializer, events: WorkflowEventPublisher) -> None:
        self.serializer = serializer
        self.events = events

    async def create_content_piece(
        self,
        session: AsyncSession,
        campaign_id: str,
        payload: ContentPieceCreate,
    ) -> ContentPieceResponse:
        campaign = await session.get(Campaign, campaign_id)
        if campaign is None:
            raise NotFoundError("Campaign not found")

        now = datetime.now(UTC)
        piece = ContentPiece(
            id=str(uuid4()),
            campaign_id=campaign_id,
            type="content",
            source_text=payload.source_text,
            current_text=payload.current_text or payload.source_text,
            source_language=None,
            target_language=None,
            review_state=ReviewState.DRAFT.value,
            created_at=now,
            updated_at=now,
        )
        session.add(piece)
        await session.commit()
        piece = await self.load_content_piece(session, piece.id)
        await self.events.publish_content_piece_updated(piece)
        return self.serializer.serialize_content_piece(piece)

    async def get_content_piece(self, session: AsyncSession, content_piece_id: str) -> ContentPieceResponse:
        piece = await self.load_content_piece(session, content_piece_id)
        return self.serializer.serialize_content_piece(piece)

    async def update_content_piece(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: ContentPieceUpdate,
    ) -> ContentPieceResponse:
        piece = await self.load_content_piece(session, content_piece_id)

        changed = False
        for field in ("type", "source_text", "current_text", "source_language", "target_language", "review_state"):
            value = getattr(payload, field)
            if value is not None and getattr(piece, field) != value:
                setattr(piece, field, value.value if isinstance(value, ReviewState) else value)
                changed = True

        if changed:
            piece.updated_at = datetime.now(UTC)
            await session.commit()
            piece = await self.load_content_piece(session, piece.id)
            await self.events.publish_content_piece_updated(piece)
        return self.serializer.serialize_content_piece(piece)

    async def load_content_piece(self, session: AsyncSession, content_piece_id: str) -> ContentPiece:
        result = await session.execute(
            select(ContentPiece)
            .where(ContentPiece.id == content_piece_id)
            .execution_options(populate_existing=True)
            .options(
                selectinload(ContentPiece.ai_suggestions),
                selectinload(ContentPiece.review_actions),
            )
        )
        piece = result.scalar_one_or_none()
        if piece is None:
            raise NotFoundError("Content piece not found")
        return piece
