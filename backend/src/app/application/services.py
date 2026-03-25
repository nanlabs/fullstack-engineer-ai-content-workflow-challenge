from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas import (
    AIActionResponse,
    AISuggestionResponse,
    CampaignCreate,
    CampaignDetailResponse,
    CampaignSummary,
    ContentPieceCreate,
    ContentPieceResponse,
    ContentPieceUpdate,
    GenerateDraftRequest,
    MetadataPayload,
    ReviewActionResponse,
    ReviewRequest,
    ReviewResponse,
    TranslateRequest,
    WorkflowCounts,
)
from app.domain.enums import AISuggestionStatus, OperationType, ReviewActionType, ReviewState
from app.domain.review import InvalidReviewTransition, ensure_transition
from app.infrastructure.ai.base import AIProvider, GeneratedPayload
from app.infrastructure.db.models import AISuggestion, Campaign, ContentPiece, ReviewAction
from app.infrastructure.events.bus import EventBus


class NotFoundError(ValueError):
    pass


class WorkflowService:
    def __init__(self, ai_provider: AIProvider, event_bus: EventBus) -> None:
        self.ai_provider = ai_provider
        self.event_bus = event_bus

    async def create_campaign(self, session: AsyncSession, payload: CampaignCreate) -> CampaignSummary:
        now = datetime.now(UTC)
        campaign = Campaign(
            id=str(uuid4()),
            name=payload.name,
            description=payload.description,
            created_at=now,
            updated_at=now,
        )
        session.add(campaign)
        await session.commit()
        await session.refresh(campaign)
        return CampaignSummary.model_validate(
            {**campaign.__dict__, "content_piece_count": 0, "workflow_counts": self._workflow_counts([])}
        )

    async def list_campaigns(self, session: AsyncSession) -> list[CampaignSummary]:
        result = await session.execute(
            select(Campaign).options(selectinload(Campaign.content_pieces)).order_by(Campaign.created_at.desc())
        )
        campaigns = result.scalars().all()
        return [
            CampaignSummary.model_validate(
                {
                    **campaign.__dict__,
                    "content_piece_count": len(campaign.content_pieces),
                    "workflow_counts": self._workflow_counts(campaign.content_pieces),
                }
            )
            for campaign in campaigns
        ]

    async def get_campaign(self, session: AsyncSession, campaign_id: str) -> CampaignDetailResponse:
        result = await session.execute(
            select(Campaign)
            .where(Campaign.id == campaign_id)
            .options(
                selectinload(Campaign.content_pieces).selectinload(ContentPiece.ai_suggestions),
                selectinload(Campaign.content_pieces).selectinload(ContentPiece.review_actions),
            )
        )
        campaign = result.scalar_one_or_none()
        if campaign is None:
            raise NotFoundError("Campaign not found")
        content_pieces = [self._serialize_content_piece(piece) for piece in campaign.content_pieces]
        return CampaignDetailResponse(
            id=campaign.id,
            name=campaign.name,
            description=campaign.description,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            workflow_counts=self._workflow_counts(campaign.content_pieces),
            content_pieces=content_pieces,
        )

    async def create_content_piece(
        self, session: AsyncSession, campaign_id: str, payload: ContentPieceCreate
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
        piece = await self._load_content_piece(session, piece.id)
        await self._publish_content_piece_event(piece, "content_piece.updated")
        return self._serialize_content_piece(piece)

    async def get_content_piece(self, session: AsyncSession, content_piece_id: str) -> ContentPieceResponse:
        piece = await self._load_content_piece(session, content_piece_id)
        return self._serialize_content_piece(piece)

    async def update_content_piece(
        self, session: AsyncSession, content_piece_id: str, payload: ContentPieceUpdate
    ) -> ContentPieceResponse:
        piece = await self._load_content_piece(session, content_piece_id)

        changed = False
        for field in ("type", "source_text", "current_text", "source_language", "target_language"):
            value = getattr(payload, field)
            if value is not None and getattr(piece, field) != value:
                setattr(piece, field, value)
                changed = True

        if payload.current_text is not None:
            piece.review_state = ReviewState.IN_REVIEW.value
        if changed:
            piece.updated_at = datetime.now(UTC)
            await session.commit()
            piece = await self._load_content_piece(session, piece.id)
            await self._publish_content_piece_event(piece, "content_piece.updated")
        return self._serialize_content_piece(piece)

    async def generate_draft(
        self, session: AsyncSession, content_piece_id: str, payload: GenerateDraftRequest
    ) -> AIActionResponse:
        piece = await self._load_content_piece(session, content_piece_id)
        generated = await self._safe_ai_call(
            operation=OperationType.GENERATE_DRAFT,
            invoke=lambda: self.ai_provider.generate_draft(
                source_text=piece.source_text,
                content_type=piece.type,
                context=payload.context,
            ),
        )
        suggestion, piece = await self._persist_suggestion(
            session, piece, generated, OperationType.GENERATE_DRAFT
        )
        return AIActionResponse(
            suggestion=AISuggestionResponse.model_validate(suggestion),
            content_piece=self._serialize_content_piece(piece),
        )

    async def translate(
        self, session: AsyncSession, content_piece_id: str, payload: TranslateRequest
    ) -> AIActionResponse:
        piece = await self._load_content_piece(session, content_piece_id)
        generated = await self._safe_ai_call(
            operation=OperationType.TRANSLATE,
            invoke=lambda: self.ai_provider.translate(
                source_text=piece.current_text,
                source_language=payload.source_language,
                target_language=payload.target_language,
                context=payload.context,
            ),
        )
        piece.source_language = payload.source_language
        piece.target_language = payload.target_language
        suggestion, piece = await self._persist_suggestion(
            session, piece, generated, OperationType.TRANSLATE
        )
        return AIActionResponse(
            suggestion=AISuggestionResponse.model_validate(suggestion),
            content_piece=self._serialize_content_piece(piece),
        )

    async def extract_metadata(self, session: AsyncSession, content_piece_id: str) -> AIActionResponse:
        piece = await self._load_content_piece(session, content_piece_id)
        generated = await self._safe_ai_call(
            operation=OperationType.EXTRACT_METADATA,
            invoke=lambda: self.ai_provider.extract_metadata(
                source_text=piece.current_text,
                content_type=piece.type,
            ),
        )
        suggestion, piece = await self._persist_suggestion(
            session, piece, generated, OperationType.EXTRACT_METADATA
        )
        return AIActionResponse(
            suggestion=AISuggestionResponse.model_validate(suggestion),
            content_piece=self._serialize_content_piece(piece),
        )

    async def review(
        self, session: AsyncSession, content_piece_id: str, payload: ReviewRequest
    ) -> ReviewResponse:
        piece = await self._load_content_piece(session, content_piece_id)
        suggestion = None
        if payload.ai_suggestion_id:
            suggestion = await session.get(AISuggestion, payload.ai_suggestion_id)
            if suggestion is None or suggestion.content_piece_id != piece.id:
                raise NotFoundError("Suggestion not found for content piece")

        if payload.action == ReviewActionType.EDIT and not payload.edited_text:
            raise ValueError("edited_text is required for edit actions")

        next_state = ensure_transition(ReviewState(piece.review_state), payload.action)
        if payload.action == ReviewActionType.ACCEPT:
            piece.current_text = (suggestion.output_text if suggestion else piece.current_text) or piece.current_text
        elif payload.action == ReviewActionType.EDIT:
            piece.current_text = payload.edited_text or piece.current_text

        piece.review_state = next_state.value
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
        piece = await self._load_content_piece(session, piece.id)

        await self._publish_review_event(piece, review_action)
        return ReviewResponse(
            review_action=ReviewActionResponse.model_validate(review_action),
            content_piece=self._serialize_content_piece(piece),
        )

    async def _safe_ai_call(
        self,
        *,
        operation: OperationType,
        invoke,
    ) -> tuple[GeneratedPayload | None, AISuggestionStatus, str | None, dict | None]:
        try:
            generated: GeneratedPayload = await invoke()
            structured_output = generated.structured_output
            if operation == OperationType.EXTRACT_METADATA and structured_output is not None:
                structured_output = MetadataPayload.model_validate(structured_output).model_dump()
            return generated, AISuggestionStatus.SUCCESS, generated.output_text, structured_output
        except (ValidationError, ValueError) as exc:
            return None, AISuggestionStatus.FAILED, str(exc), None
        except Exception as exc:  # pragma: no cover - external provider failure
            return None, AISuggestionStatus.FAILED, str(exc), None

    async def _persist_suggestion(
        self,
        session: AsyncSession,
        piece: ContentPiece,
        generated_result: tuple[GeneratedPayload | None, AISuggestionStatus, str | None, dict | None],
        operation_type: OperationType,
    ) -> tuple[AISuggestion, ContentPiece]:
        _, status, output_text, structured_output = generated_result
        suggestion = AISuggestion(
            id=str(uuid4()),
            content_piece_id=piece.id,
            provider=self.ai_provider.provider_name,
            model=self.ai_provider.model_name,
            operation_type=operation_type.value,
            input_text=piece.current_text if operation_type != OperationType.GENERATE_DRAFT else piece.source_text,
            output_text=output_text,
            structured_output_json=structured_output,
            status=status.value,
            created_at=datetime.now(UTC),
        )
        session.add(suggestion)
        if status == AISuggestionStatus.SUCCESS:
            piece.review_state = ReviewState.AI_SUGGESTED.value
            piece.updated_at = datetime.now(UTC)
        await session.commit()
        piece = await self._load_content_piece(session, piece.id)
        fresh_suggestion = await session.get(AISuggestion, suggestion.id)
        await self._publish_ai_event(piece, fresh_suggestion)
        return fresh_suggestion, piece

    async def _load_content_piece(self, session: AsyncSession, content_piece_id: str) -> ContentPiece:
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

    def _serialize_content_piece(self, piece: ContentPiece) -> ContentPieceResponse:
        latest_suggestion_model = None
        latest_reviewable_suggestion_model = None
        latest_review_model = None
        latest_metadata = None

        latest_suggestion = max(piece.ai_suggestions, key=lambda item: item.created_at, default=None)
        latest_review = max(piece.review_actions, key=lambda item: item.created_at, default=None)
        reviewable_suggestions = [
            item
            for item in piece.ai_suggestions
            if item.operation_type != OperationType.EXTRACT_METADATA.value
            and item.status == AISuggestionStatus.SUCCESS.value
            and item.output_text
        ]
        latest_reviewable_suggestion = max(reviewable_suggestions, key=lambda item: item.created_at, default=None)

        if latest_suggestion is not None:
            latest_suggestion_model = AISuggestionResponse.model_validate(latest_suggestion)
        if latest_reviewable_suggestion is not None:
            latest_reviewable_suggestion_model = AISuggestionResponse.model_validate(latest_reviewable_suggestion)
        if latest_review is not None:
            latest_review_model = ReviewActionResponse.model_validate(latest_review)

        metadata_suggestions = [
            item
            for item in piece.ai_suggestions
            if item.operation_type == OperationType.EXTRACT_METADATA.value
            and item.status == AISuggestionStatus.SUCCESS.value
            and item.structured_output_json
        ]
        if metadata_suggestions:
            latest_metadata = MetadataPayload.model_validate(
                max(metadata_suggestions, key=lambda item: item.created_at).structured_output_json
            )

        return ContentPieceResponse(
            id=piece.id,
            campaign_id=piece.campaign_id,
            type=piece.type,
            source_text=piece.source_text,
            current_text=piece.current_text,
            source_language=piece.source_language,
            target_language=piece.target_language,
            review_state=ReviewState(piece.review_state),
            created_at=piece.created_at,
            updated_at=piece.updated_at,
            latest_suggestion=latest_suggestion_model,
            latest_reviewable_suggestion=latest_reviewable_suggestion_model,
            latest_review_action=latest_review_model,
            latest_metadata=latest_metadata,
        )

    async def _publish_content_piece_event(self, piece: ContentPiece, event_type: str) -> None:
        await self.event_bus.publish(
            {
                "type": event_type,
                "campaign_id": piece.campaign_id,
                "content_piece_id": piece.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": {"review_state": piece.review_state},
            }
        )

    async def _publish_ai_event(self, piece: ContentPiece, suggestion: AISuggestion) -> None:
        await self.event_bus.publish(
            {
                "type": "ai_suggestion.created",
                "campaign_id": piece.campaign_id,
                "content_piece_id": piece.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": {
                    "suggestion_id": suggestion.id,
                    "operation_type": suggestion.operation_type,
                    "status": suggestion.status,
                },
            }
        )
        await self._publish_content_piece_event(piece, "content_piece.updated")

    async def _publish_review_event(self, piece: ContentPiece, review_action: ReviewAction) -> None:
        await self.event_bus.publish(
            {
                "type": "review_action.created",
                "campaign_id": piece.campaign_id,
                "content_piece_id": piece.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": {
                    "review_action_id": review_action.id,
                    "action": review_action.action,
                    "review_state": piece.review_state,
                },
            }
        )
        await self._publish_content_piece_event(piece, "content_piece.updated")

    def _workflow_counts(self, pieces: list[ContentPiece]) -> WorkflowCounts:
        counts = WorkflowCounts()
        for piece in pieces:
            setattr(counts, piece.review_state, getattr(counts, piece.review_state) + 1)
        return counts
