from datetime import UTC, datetime, timedelta

from app.application.serializers import WorkflowSerializer
from app.infrastructure.db.models import AISuggestion, ContentPiece, ReviewAction


def test_serializer_builds_draft_history_and_translation_versions() -> None:
    now = datetime.now(UTC)
    piece = ContentPiece(
        id="piece-1",
        campaign_id="campaign-1",
        type="content",
        source_text="Hello team",
        current_text="Hello team",
        source_language="en",
        target_language="es",
        review_state="approved",
        created_at=now,
        updated_at=now,
    )
    draft = AISuggestion(
        id="draft-1",
        content_piece_id=piece.id,
        provider="gemini",
        model="flash",
        operation_type="generate_draft",
        input_text="Hello team",
        output_text="Sharper Hello team",
        source_language=None,
        target_language=None,
        structured_output_json=None,
        status="success",
        created_at=now,
    )
    translation = AISuggestion(
        id="translation-1",
        content_piece_id=piece.id,
        provider="gemini",
        model="flash",
        operation_type="translate",
        input_text="Hello team",
        output_text='{"translation":"## Hola\\n- punto uno"}',
        source_language="en",
        target_language="es",
        structured_output_json=None,
        status="success",
        created_at=now + timedelta(seconds=1),
    )
    review_action = ReviewAction(
        id="review-1",
        content_piece_id=piece.id,
        ai_suggestion_id=draft.id,
        action="accept",
        comment=None,
        edited_text=None,
        created_at=now + timedelta(seconds=2),
    )
    piece.ai_suggestions = [draft, translation]
    piece.review_actions = [review_action]

    serialized = WorkflowSerializer().serialize_content_piece(piece)

    assert serialized.review_state.value == "approved"
    assert serialized.draft_history[0].decision_status.value == "accepted"
    assert serialized.latest_reviewable_suggestion is not None
    assert serialized.latest_reviewable_suggestion.id == draft.id
    assert serialized.translation_versions[0].output_text == "## Hola\n- punto uno"


def test_workflow_counts_are_derived_from_manual_states() -> None:
    now = datetime.now(UTC)
    pieces = [
        ContentPiece(
            id="piece-draft",
            campaign_id="campaign-1",
            type="content",
            source_text="draft",
            current_text="draft",
            source_language=None,
            target_language=None,
            review_state="draft",
            created_at=now,
            updated_at=now,
        ),
        ContentPiece(
            id="piece-approved",
            campaign_id="campaign-1",
            type="content",
            source_text="approved",
            current_text="approved",
            source_language=None,
            target_language=None,
            review_state="approved",
            created_at=now,
            updated_at=now,
        ),
    ]

    counts = WorkflowSerializer().workflow_counts(pieces)

    assert counts.draft == 1
    assert counts.approved == 1
    assert counts.ai_suggested == 0
