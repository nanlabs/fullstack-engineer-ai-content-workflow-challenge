"""Tests for ContentWorkflowState shape and reducer behaviour."""

from __future__ import annotations

from operator import add

from src.ai.graph.state import ContentWorkflowState, HumanFeedback, TranslationDraft


def _minimal_state(**overrides: object) -> ContentWorkflowState:
    base: ContentWorkflowState = {
        "content_piece_id": "cp-1",
        "campaign_id": "camp-1",
        "content_type": "headline",
        "brief": "Sell our amazing product",
        "source_language": "en",
        "target_languages": ["es", "fr"],
        "source_text": None,
        "initial_draft": None,
        "metadata": None,
        "translations": [],
        "pending_feedback": None,
        "iteration": 0,
        "status": "initializing",
        "error": None,
    }
    base.update(overrides)  # type: ignore[typeddict-item]
    return base


def test_state_has_required_keys() -> None:
    state = _minimal_state()
    required = {
        "content_piece_id",
        "campaign_id",
        "content_type",
        "brief",
        "source_language",
        "target_languages",
        "source_text",
        "initial_draft",
        "metadata",
        "translations",
        "pending_feedback",
        "iteration",
        "status",
        "error",
    }
    assert required.issubset(state.keys())


def test_translations_reducer_appends() -> None:
    """The `add` reducer for translations should accumulate across updates."""
    existing: list[TranslationDraft] = [{"language": "es", "content": "Hola", "draft_id": None}]
    new_entry: list[TranslationDraft] = [{"language": "fr", "content": "Bonjour", "draft_id": None}]
    result = add(existing, new_entry)
    assert len(result) == 2
    assert result[0]["language"] == "es"
    assert result[1]["language"] == "fr"


def test_human_feedback_shape() -> None:
    feedback: HumanFeedback = {
        "action": "approve",
        "edited_content": None,
        "notes": None,
    }
    assert feedback["action"] == "approve"


def test_state_allows_all_valid_statuses() -> None:
    valid_statuses = [
        "initializing",
        "generating",
        "extracting",
        "translating",
        "awaiting_review",
        "refining",
        "approved",
        "rejected",
        "failed",
    ]
    for status in valid_statuses:
        state = _minimal_state(status=status)  # type: ignore[arg-type]
        assert state["status"] == status
