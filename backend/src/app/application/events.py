from __future__ import annotations

from datetime import UTC, datetime

from app.infrastructure.db.models import AISuggestion, ContentPiece, ReviewAction
from app.infrastructure.events.bus import EventBus


class WorkflowEventPublisher:
    def __init__(self, event_bus: EventBus) -> None:
        self.event_bus = event_bus

    async def publish_content_piece_updated(
        self,
        piece: ContentPiece,
        *,
        event_type: str = "content_piece.updated",
    ) -> None:
        await self.event_bus.publish(
            {
                "type": event_type,
                "campaign_id": piece.campaign_id,
                "content_piece_id": piece.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "payload": {"review_state": piece.review_state},
            }
        )

    async def publish_ai_event(self, piece: ContentPiece, suggestion: AISuggestion) -> None:
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
        await self.publish_content_piece_updated(piece)

    async def publish_review_event(self, piece: ContentPiece, review_action: ReviewAction) -> None:
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
        await self.publish_content_piece_updated(piece)
