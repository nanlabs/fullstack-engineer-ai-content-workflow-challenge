from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import ReviewActionResponse, ReviewRequest, ReviewResponse
from app.application.content_piece_service import ContentPieceService
from app.application.events import WorkflowEventPublisher
from app.application.exceptions import NotFoundError
from app.application.serializers import WorkflowSerializer
from app.domain.enums import AISuggestionStatus, OperationType, ReviewActionType
from app.infrastructure.db.models import AISuggestion, ReviewAction


class ReviewService:
    def __init__(
        self,
        *,
        content_pieces: ContentPieceService,
        serializer: WorkflowSerializer,
        events: WorkflowEventPublisher,
    ) -> None:
        self.content_pieces = content_pieces
        self.serializer = serializer
        self.events = events

    async def review(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: ReviewRequest,
    ) -> ReviewResponse:
        piece = await self.content_pieces.load_content_piece(session, content_piece_id)
        suggestion = None
        if payload.ai_suggestion_id:
            suggestion = await session.get(AISuggestion, payload.ai_suggestion_id)
            if suggestion is None or suggestion.content_piece_id != piece.id:
                raise NotFoundError("Suggestion not found for content piece")

        if payload.action == ReviewActionType.EDIT and not payload.edited_text:
            raise ValueError("edited_text is required for edit actions")
        if payload.action in {ReviewActionType.ACCEPT, ReviewActionType.REJECT} and suggestion is None:
            raise ValueError("ai_suggestion_id is required for accept and reject actions")
        if (
            suggestion is not None
            and payload.action in {ReviewActionType.ACCEPT, ReviewActionType.REJECT}
            and suggestion.operation_type != OperationType.GENERATE_DRAFT.value
        ):
            raise ValueError("Only generated drafts can be accepted or rejected")
        if (
            suggestion is not None
            and payload.action in {ReviewActionType.ACCEPT, ReviewActionType.REJECT}
            and suggestion.status != AISuggestionStatus.SUCCESS.value
        ):
            raise ValueError("Only successful draft suggestions can be accepted or rejected")

        if payload.action == ReviewActionType.ACCEPT:
            piece.current_text = (suggestion.output_text if suggestion else piece.current_text) or piece.current_text
        elif payload.action == ReviewActionType.EDIT:
            piece.current_text = payload.edited_text or piece.current_text

        piece.updated_at = datetime.now(UTC)

        review_action = ReviewAction(
            id=str(uuid4()),
            content_piece_id=piece.id,
            ai_suggestion_id=payload.ai_suggestion_id,
            action=payload.action.value,
            comment=payload.comment,
            edited_text=payload.edited_text,
            created_at=datetime.now(UTC),
        )
        session.add(review_action)
        await session.commit()
        await session.refresh(review_action)
        piece = await self.content_pieces.load_content_piece(session, piece.id)

        await self.events.publish_review_event(piece, review_action)
        return ReviewResponse(
            review_action=ReviewActionResponse.model_validate(review_action),
            content_piece=self.serializer.serialize_content_piece(piece),
        )
