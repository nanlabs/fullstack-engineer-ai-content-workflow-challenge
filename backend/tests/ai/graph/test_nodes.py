"""Unit tests for individual graph nodes using MockProvider."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

from langgraph.types import Send

from src.ai.graph.nodes.await_human_review import _persist_drafts_from_state, await_human_review
from src.ai.graph.nodes.extract_metadata import extract_metadata
from src.ai.graph.nodes.generate_draft import generate_draft
from src.ai.graph.nodes.refine import refine
from src.ai.graph.nodes.translate import fan_out_translations, translate_to_language
from src.ai.graph.state import ContentWorkflowState
from src.ai.providers.mock import MockProvider

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

_METADATA_JSON = json.dumps(
    {
        "sentiment": "positive",
        "tone": "casual",
        "keywords": ["test", "mock", "content"],
        "estimated_reading_time_seconds": 10,
    }
)


def _base_state(**overrides: object) -> ContentWorkflowState:
    state: ContentWorkflowState = {
        "content_piece_id": "00000000-0000-0000-0000-000000000001",
        "campaign_id": "00000000-0000-0000-0000-000000000002",
        "content_type": "headline",
        "brief": "Launch campaign for amazing product",
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
    state.update(overrides)  # type: ignore[typeddict-item]
    return state


def _mock_session_cm() -> tuple[MagicMock, AsyncMock]:
    """Return (context_manager, session) mocks for AsyncSessionLocal."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock())
    session.add = MagicMock()
    session.commit = AsyncMock()

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm, session


# ---------------------------------------------------------------------------
# generate_draft
# ---------------------------------------------------------------------------


_CONFIG: dict = {"configurable": {"thread_id": "test-thread"}}
_DRAFT_CONFIG = _CONFIG  # alias kept for clarity in generate_draft tests


async def test_generate_draft_node_updates_initial_draft() -> None:
    state = _base_state()
    provider = MockProvider(
        fixtures={"launch": "Buy our amazing widget today!"}, initial_delay=0, chunk_delay=0
    )

    with (
        patch("src.ai.graph.nodes.generate_draft.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.generate_draft.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await generate_draft(state, _DRAFT_CONFIG)

    assert result["initial_draft"] is not None
    assert len(result["initial_draft"]) > 0
    assert result["status"] == "extracting"


async def test_generate_draft_node_uses_source_text() -> None:
    state = _base_state(source_text="reference copy here")
    provider = MockProvider(initial_delay=0, chunk_delay=0)

    with (
        patch("src.ai.graph.nodes.generate_draft.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.generate_draft.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await generate_draft(state, _DRAFT_CONFIG)

    assert result["initial_draft"] is not None


async def test_generate_draft_handles_none_source_text() -> None:
    state = _base_state(source_text=None)
    provider = MockProvider(initial_delay=0, chunk_delay=0)

    with (
        patch("src.ai.graph.nodes.generate_draft.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.generate_draft.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await generate_draft(state, _DRAFT_CONFIG)

    assert result["initial_draft"] is not None


# ---------------------------------------------------------------------------
# extract_metadata
# ---------------------------------------------------------------------------


async def test_extract_metadata_returns_structured() -> None:
    state = _base_state(initial_draft="Buy our amazing widget today!")
    # fixture key "sentiment" appears in the metadata_extraction template
    provider = MockProvider(fixtures={"sentiment": _METADATA_JSON})

    with (
        patch("src.ai.graph.nodes.extract_metadata.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.extract_metadata.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await extract_metadata(state, _CONFIG)

    assert result["metadata"] is not None
    meta = result["metadata"]
    assert meta["sentiment"] == "positive"
    assert meta["tone"] == "casual"
    assert isinstance(meta["keywords"], list)
    assert meta["estimated_reading_time_seconds"] == 10
    assert result["status"] == "translating"


async def test_extract_metadata_schema_is_dict_in_state() -> None:
    """Ensure metadata stored in state is a plain dict (not a Pydantic model)."""
    state = _base_state(initial_draft="Some great copy.")
    provider = MockProvider(fixtures={"sentiment": _METADATA_JSON})

    with (
        patch("src.ai.graph.nodes.extract_metadata.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.extract_metadata.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await extract_metadata(state, _CONFIG)

    assert isinstance(result["metadata"], dict)


# ---------------------------------------------------------------------------
# translate (fan-out)
# ---------------------------------------------------------------------------


def test_fan_out_translations_creates_one_send_per_language() -> None:
    state = _base_state(
        initial_draft="Amazing product!",
        target_languages=["es", "fr", "de"],
    )
    sends = fan_out_translations(state)

    assert len(sends) == 3
    for send in sends:
        assert isinstance(send, Send)
        assert send.node == "translate_to_language"


def test_fan_out_translations_passes_correct_context() -> None:
    state = _base_state(
        initial_draft="Click here!",
        target_languages=["pt"],
        source_language="en",
    )
    sends = fan_out_translations(state)

    assert sends[0].arg["target_language"] == "pt"
    assert sends[0].arg["source_language"] == "en"
    assert sends[0].arg["text"] == "Click here!"


async def test_translate_to_language_returns_one_entry() -> None:
    sub_state = {
        "text": "Buy now!",
        "source_language": "en",
        "target_language": "es",
    }
    provider = MockProvider(fixtures={"buy": "¡Compra ahora!"})

    with (
        patch("src.ai.graph.nodes.translate.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.translate.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await translate_to_language(sub_state, _CONFIG)

    assert "translations" in result
    assert len(result["translations"]) == 1
    t = result["translations"][0]
    assert t["language"] == "es"
    assert t["content"] is not None
    assert t["draft_id"] is None


# ---------------------------------------------------------------------------
# refine
# ---------------------------------------------------------------------------


async def test_refine_increments_iteration() -> None:
    state = _base_state(
        initial_draft="Old draft.",
        iteration=2,
        pending_feedback={
            "action": "regenerate",
            "edited_content": None,
            "notes": "Make it punchier.",
        },
    )
    provider = MockProvider(fixtures={"old": "New punchy draft!"})

    with (
        patch("src.ai.graph.nodes.refine.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.refine.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await refine(state, _CONFIG)

    assert result["iteration"] == 3
    assert result["initial_draft"] != "Old draft."
    assert result["status"] == "extracting"


async def test_refine_handles_none_notes() -> None:
    state = _base_state(
        initial_draft="Draft.",
        iteration=0,
        pending_feedback={"action": "regenerate", "edited_content": None, "notes": None},
    )
    provider = MockProvider()

    with (
        patch("src.ai.graph.nodes.refine.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.refine.publish_workflow_event", new_callable=AsyncMock),
    ):
        result = await refine(state, _CONFIG)

    assert result["initial_draft"] is not None


# ---------------------------------------------------------------------------
# await_human_review — logic tested via _persist_drafts_from_state
# ---------------------------------------------------------------------------


async def test_persist_drafts_creates_source_and_translation_rows() -> None:
    """_persist_drafts_from_state should add 1 source + N translation Draft rows."""
    state = _base_state(
        initial_draft="Great headline!",
        metadata={
            "sentiment": "positive",
            "tone": "casual",
            "keywords": [],
            "estimated_reading_time_seconds": 5,
        },
        target_languages=["es", "fr"],
        translations=[
            {"language": "es", "content": "¡Gran titular!", "draft_id": None},
            {"language": "fr", "content": "Grand titre!", "draft_id": None},
        ],
    )

    cm, session = _mock_session_cm()
    await _persist_drafts_from_state(session, state, thread_id="test-thread")

    # execute (WorkflowRun update) + 3 add calls (1 source + 2 translations)
    assert session.add.call_count == 3
    assert session.commit.called


async def test_persist_drafts_only_persists_latest_translations() -> None:
    """When translations accumulate across iterations, only the last N are persisted."""
    state = _base_state(
        initial_draft="Latest draft",
        metadata=None,
        target_languages=["es"],
        # 2 sets of translations from 2 iterations
        translations=[
            {"language": "es", "content": "v1", "draft_id": None},  # iteration 0
            {"language": "es", "content": "v2", "draft_id": None},  # iteration 1 (latest)
        ],
    )

    cm, session = _mock_session_cm()
    await _persist_drafts_from_state(session, state, thread_id="test-thread")

    # 1 source + 1 translation (latest only, not both)
    assert session.add.call_count == 2


async def test_await_human_review_returns_failed_when_iteration_cap_reached() -> None:
    """If iteration >= 5 and action == regenerate, node must return status='failed'."""
    state = _base_state(iteration=5)
    config = {"configurable": {"thread_id": "cap-test"}}
    feedback = {"action": "regenerate", "edited_content": None, "notes": "Again"}

    with patch(
        "src.ai.graph.nodes.await_human_review.interrupt",
        return_value=feedback,
    ):
        result = await await_human_review(state, config)  # type: ignore[arg-type]

    assert result["status"] == "failed"
    assert result["error"] is not None
    assert "5" in result["error"]


async def test_await_human_review_returns_approved_status() -> None:
    state = _base_state(iteration=0)
    config = {"configurable": {"thread_id": "approve-test"}}
    feedback = {"action": "approve", "edited_content": None, "notes": None}

    with patch("src.ai.graph.nodes.await_human_review.interrupt", return_value=feedback):
        result = await await_human_review(state, config)  # type: ignore[arg-type]

    assert result["status"] == "approved"
    assert result["error"] is None
