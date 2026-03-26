from __future__ import annotations

from app.api.schemas import (
    AISuggestionResponse,
    ContentPieceResponse,
    DraftDecisionStatus,
    DraftHistoryItemResponse,
    MetadataPayload,
    ReviewActionResponse,
    TranslationVersionResponse,
    WorkflowCounts,
)
from app.domain.enums import AISuggestionStatus, OperationType, ReviewActionType, ReviewState
from app.infrastructure.ai.translation_parser import parse_translation_output
from app.infrastructure.db.models import AISuggestion, ContentPiece, ReviewAction


class WorkflowSerializer:
    def serialize_content_piece(self, piece: ContentPiece) -> ContentPieceResponse:
        latest_suggestion_model = None
        latest_reviewable_suggestion_model = None
        latest_review_model = None
        latest_metadata_attempt_model = None
        latest_metadata = None

        latest_suggestion = max(piece.ai_suggestions, key=lambda item: item.created_at, default=None)
        latest_review = max(piece.review_actions, key=lambda item: item.created_at, default=None)
        reviewable_suggestions = [
            item
            for item in piece.ai_suggestions
            if item.operation_type == OperationType.GENERATE_DRAFT.value
            and item.status == AISuggestionStatus.SUCCESS.value
            and item.output_text
        ]
        latest_reviewable_suggestion = max(reviewable_suggestions, key=lambda item: item.created_at, default=None)
        decision_by_suggestion_id = self._draft_decisions_by_suggestion(piece.review_actions)

        if latest_suggestion is not None:
            latest_suggestion_model = self.serialize_suggestion(latest_suggestion)
        if latest_reviewable_suggestion is not None:
            latest_reviewable_suggestion_model = self.serialize_suggestion(latest_reviewable_suggestion)
        if latest_review is not None:
            latest_review_model = ReviewActionResponse.model_validate(latest_review)

        metadata_suggestions = [
            item for item in piece.ai_suggestions if item.operation_type == OperationType.EXTRACT_METADATA.value
        ]
        if metadata_suggestions:
            latest_metadata_attempt = max(metadata_suggestions, key=lambda item: item.created_at)
            latest_metadata_attempt_model = self.serialize_suggestion(latest_metadata_attempt)
            if (
                latest_metadata_attempt.status == AISuggestionStatus.SUCCESS.value
                and latest_metadata_attempt.structured_output_json
            ):
                latest_metadata = MetadataPayload.model_validate(latest_metadata_attempt.structured_output_json)

        translation_suggestions = sorted(
            [
                item
                for item in piece.ai_suggestions
                if item.operation_type == OperationType.TRANSLATE.value and item.output_text
            ],
            key=lambda item: item.created_at,
            reverse=True,
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
            latest_metadata_attempt=latest_metadata_attempt_model,
            latest_metadata=latest_metadata,
            draft_history=[
                DraftHistoryItemResponse(
                    id=item.id,
                    provider=item.provider,
                    model=item.model,
                    input_text=item.input_text,
                    output_text=self._normalize_suggestion_output(item) or "",
                    created_at=item.created_at,
                    decision_status=decision_by_suggestion_id.get(item.id, DraftDecisionStatus.PENDING),
                )
                for item in sorted(reviewable_suggestions, key=lambda item: item.created_at, reverse=True)
            ],
            translation_versions=[
                TranslationVersionResponse.model_validate(
                    {
                        **item.__dict__,
                        "output_text": self._normalize_suggestion_output(item),
                    }
                )
                for item in translation_suggestions
            ],
            ai_call_history=[
                self.serialize_suggestion(item)
                for item in sorted(piece.ai_suggestions, key=lambda item: item.created_at)
            ],
        )

    def serialize_suggestion(self, suggestion: AISuggestion) -> AISuggestionResponse:
        return AISuggestionResponse.model_validate(
            {
                **suggestion.__dict__,
                "output_text": self._normalize_suggestion_output(suggestion),
            }
        )

    def workflow_counts(self, pieces: list[ContentPiece]) -> WorkflowCounts:
        counts = WorkflowCounts()
        for piece in pieces:
            setattr(counts, piece.review_state, getattr(counts, piece.review_state) + 1)
        return counts

    def _normalize_suggestion_output(self, suggestion: AISuggestion) -> str | None:
        if not suggestion.output_text:
            return suggestion.output_text
        if suggestion.operation_type == OperationType.TRANSLATE.value:
            return parse_translation_output(suggestion.output_text)
        return suggestion.output_text

    def _draft_decisions_by_suggestion(self, review_actions: list[ReviewAction]) -> dict[str, DraftDecisionStatus]:
        decisions: dict[str, DraftDecisionStatus] = {}
        for action in sorted(review_actions, key=lambda item: item.created_at):
            if not action.ai_suggestion_id:
                continue
            if action.action in {ReviewActionType.ACCEPT.value, ReviewActionType.EDIT.value}:
                decisions[action.ai_suggestion_id] = DraftDecisionStatus.ACCEPTED
            elif action.action == ReviewActionType.REJECT.value:
                decisions[action.ai_suggestion_id] = DraftDecisionStatus.REJECTED
        return decisions
