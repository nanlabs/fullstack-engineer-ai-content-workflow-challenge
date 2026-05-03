"""Integration tests for the full LangGraph workflow using MemorySaver."""

from __future__ import annotations

import json
from contextlib import contextmanager
from unittest.mock import AsyncMock, MagicMock, patch

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from src.ai.graph.builder import build_graph
from src.ai.providers.mock import MockProvider

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

_METADATA_JSON = json.dumps(
    {
        "sentiment": "positive",
        "tone": "casual",
        "keywords": ["test", "content"],
        "estimated_reading_time_seconds": 8,
    }
)

_DRAFT_TEXT = "Amazing product you must have!"
_TRANSLATION_ES = "¡Producto increíble que debes tener!"
_TRANSLATION_FR = "Produit incroyable que vous devez avoir!"


def _base_inputs(target_languages: list[str] | None = None) -> dict:
    return {
        "content_piece_id": "00000000-0000-0000-0000-000000000001",
        "campaign_id": "00000000-0000-0000-0000-000000000002",
        "content_type": "headline",
        "brief": "Launch campaign for amazing product",
        "source_language": "en",
        "target_languages": target_languages or ["es"],
        "source_text": None,
        "initial_draft": None,
        "metadata": None,
        "translations": [],
        "pending_feedback": None,
        "iteration": 0,
        "status": "initializing",
        "error": None,
    }


def _make_provider() -> MockProvider:
    """MockProvider with fixtures for all node calls."""
    return MockProvider(
        fixtures={
            # generate_draft and refine use 'launch' / general text prompts
            "launch": _DRAFT_TEXT,
            "draft": _DRAFT_TEXT,
            "previous": _DRAFT_TEXT,
            # extract_metadata prompt contains 'sentiment'
            "sentiment": _METADATA_JSON,
            # translation prompt contains 'translate'
            "translate": _TRANSLATION_ES,
        },
        initial_delay=0,
        chunk_delay=0.02,
    )


def _make_mock_db_session() -> MagicMock:
    """Return a mock async context manager that simulates AsyncSessionLocal()."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock())
    session.add = MagicMock()
    session.commit = AsyncMock()

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm


@contextmanager
def _patch_all(provider: MockProvider):
    """Context manager that patches all LLM calls and DB session for graph tests."""
    db_cm = _make_mock_db_session()
    with (
        patch("src.ai.graph.nodes.generate_draft.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.extract_metadata.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.translate.get_provider", return_value=provider),
        patch("src.ai.graph.nodes.refine.get_provider", return_value=provider),
        patch(
            "src.ai.graph.nodes.await_human_review.AsyncSessionLocal",
            return_value=db_cm,
        ),
    ):
        yield


def _build_test_graph() -> tuple[object, MemorySaver]:
    checkpointer = MemorySaver()
    graph = build_graph(checkpointer)
    return graph, checkpointer


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_full_flow_until_interrupt() -> None:
    """Graph should pause at await_human_review and expose the interrupt value."""
    graph, _ = _build_test_graph()
    config = {"configurable": {"thread_id": "flow-interrupt-1"}}
    provider = _make_provider()

    with _patch_all(provider):
        await graph.ainvoke(_base_inputs(), config=config)

    snapshot = await graph.aget_state(config)
    # Graph interrupted — there must be pending interrupt values
    assert len(snapshot.interrupts) > 0
    interrupt_value = snapshot.interrupts[0].value
    assert interrupt_value["content_piece_id"] == "00000000-0000-0000-0000-000000000001"
    assert interrupt_value["status"] == "awaiting_review"


async def test_full_flow_draft_and_translations_populated() -> None:
    """After first run, state must have initial_draft and translations."""
    graph, _ = _build_test_graph()
    config = {"configurable": {"thread_id": "flow-state-check"}}
    provider = _make_provider()

    with _patch_all(provider):
        await graph.ainvoke(_base_inputs(target_languages=["es", "fr"]), config=config)

    snapshot = await graph.aget_state(config)
    assert snapshot.values["initial_draft"] is not None
    assert len(snapshot.values["translations"]) == 2


async def test_resume_with_approve_completes() -> None:
    """Resuming with action='approve' should end the graph with status='approved'."""
    graph, _ = _build_test_graph()
    config = {"configurable": {"thread_id": "flow-approve"}}
    provider = _make_provider()

    with _patch_all(provider):
        await graph.ainvoke(_base_inputs(), config=config)
        # Resume with approve
        await graph.ainvoke(
            Command(resume={"action": "approve", "edited_content": None, "notes": None}),
            config=config,
        )

    snapshot = await graph.aget_state(config)
    assert snapshot.values["status"] == "approved"
    assert snapshot.next == ()  # graph is done


async def test_resume_with_reject_completes() -> None:
    """Resuming with action='reject' should end the graph with status='rejected'."""
    graph, _ = _build_test_graph()
    config = {"configurable": {"thread_id": "flow-reject"}}
    provider = _make_provider()

    with _patch_all(provider):
        await graph.ainvoke(_base_inputs(), config=config)
        await graph.ainvoke(
            Command(resume={"action": "reject", "edited_content": None, "notes": "Not good"}),
            config=config,
        )

    snapshot = await graph.aget_state(config)
    assert snapshot.values["status"] == "rejected"


async def test_resume_with_regenerate_loops_back() -> None:
    """Resuming with action='regenerate' should re-enter the generate→translate cycle."""
    graph, _ = _build_test_graph()
    config = {"configurable": {"thread_id": "flow-regenerate"}}
    provider = _make_provider()

    with _patch_all(provider):
        await graph.ainvoke(_base_inputs(), config=config)

        # Capture state before resume to compare iteration
        before = await graph.aget_state(config)
        iteration_before = before.values["iteration"]

        # Resume with regenerate — graph will loop and hit interrupt again
        await graph.ainvoke(
            Command(resume={"action": "regenerate", "edited_content": None, "notes": "Punchier"}),
            config=config,
        )

    after = await graph.aget_state(config)
    # After refine, iteration incremented; graph paused again at await_human_review
    assert after.values["iteration"] == iteration_before + 1
    assert len(after.interrupts) > 0  # still interrupted (waiting for next review)


async def test_iteration_cap_prevents_infinite_loop() -> None:
    """After 5 regenerate cycles the 6th should end with status='failed'."""
    graph, _ = _build_test_graph()
    config = {"configurable": {"thread_id": "flow-cap"}}
    provider = _make_provider()
    regenerate_cmd = Command(
        resume={"action": "regenerate", "edited_content": None, "notes": "Keep improving"}
    )

    with _patch_all(provider):
        # Initial run → first interrupt
        await graph.ainvoke(_base_inputs(), config=config)

        # 5 successive regenerates: each goes through refine (iteration 0→1, 1→2, …, 4→5)
        for _ in range(5):
            await graph.ainvoke(regenerate_cmd, config=config)

        # 6th regenerate: iteration is now 5, cap should trigger
        await graph.ainvoke(regenerate_cmd, config=config)

    snapshot = await graph.aget_state(config)
    assert snapshot.values["status"] == "failed"
    assert snapshot.values["error"] is not None
    assert snapshot.next == ()  # graph terminated


async def test_checkpointer_persists_state_across_runner_instances() -> None:
    """A new graph instance sharing the same checkpointer should recover saved state."""
    checkpointer = MemorySaver()
    thread_id = "persist-test"
    config = {"configurable": {"thread_id": thread_id}}
    provider = _make_provider()

    # First runner — run until interrupt
    graph1 = build_graph(checkpointer)
    with _patch_all(provider):
        await graph1.ainvoke(_base_inputs(), config=config)

    # Second runner (simulates app restart) — shares same checkpointer
    graph2 = build_graph(checkpointer)
    snapshot = await graph2.aget_state(config)

    assert snapshot.values["content_piece_id"] == "00000000-0000-0000-0000-000000000001"
    assert snapshot.values["initial_draft"] is not None
    assert len(snapshot.interrupts) > 0  # still waiting for review
