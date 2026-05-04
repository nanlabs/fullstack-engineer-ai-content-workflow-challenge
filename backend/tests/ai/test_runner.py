"""Unit tests for WorkflowRunner (mocked graph — no DB or real LangGraph required)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import src.ai.graph.runner as runner_module
from src.ai.graph.runner import WorkflowRunner, get_runner
from src.ai.graph.state import HumanFeedback

# ---------------------------------------------------------------------------
# get_runner singleton
# ---------------------------------------------------------------------------


def test_get_runner_raises_when_not_initialised() -> None:
    original = runner_module._runner
    runner_module._runner = None
    try:
        with pytest.raises(RuntimeError, match="not initialised"):
            get_runner()
    finally:
        runner_module._runner = original


def test_get_runner_returns_instance_after_set() -> None:
    mock_graph = MagicMock()
    runner = WorkflowRunner(mock_graph)
    original = runner_module._runner
    runner_module._runner = runner
    try:
        assert get_runner() is runner
    finally:
        runner_module._runner = original


# ---------------------------------------------------------------------------
# WorkflowRunner.run_graph
# ---------------------------------------------------------------------------


async def test_run_graph_invokes_graph_ainvoke() -> None:
    mock_graph = AsyncMock()
    runner = WorkflowRunner(mock_graph)

    await runner.run_graph("thread-1", {"content_type": "headline"})

    mock_graph.ainvoke.assert_awaited_once()
    call_args = mock_graph.ainvoke.call_args
    assert call_args.args[0] == {"content_type": "headline"}
    assert call_args.kwargs["config"]["configurable"]["thread_id"] == "thread-1"


async def test_run_graph_marks_failed_on_exception() -> None:
    mock_graph = AsyncMock()
    mock_graph.ainvoke.side_effect = RuntimeError("graph exploded")
    runner = WorkflowRunner(mock_graph)

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None

    session = AsyncMock()
    session.execute = AsyncMock(return_value=result_mock)
    session.commit = AsyncMock()

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch("src.ai.graph.runner.AsyncSessionLocal", return_value=cm):
        await runner.run_graph("thread-fail", {})

    assert session.execute.await_count == 2
    session.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# WorkflowRunner.resume
# ---------------------------------------------------------------------------


async def test_resume_invokes_graph_with_command() -> None:
    from langgraph.types import Command

    mock_graph = AsyncMock()
    runner = WorkflowRunner(mock_graph)
    feedback: HumanFeedback = {"action": "approve", "edited_content": None, "notes": None}

    await runner.resume("thread-1", feedback)

    mock_graph.ainvoke.assert_awaited_once()
    call_args = mock_graph.ainvoke.call_args
    assert isinstance(call_args.args[0], Command)
    assert call_args.kwargs["config"]["configurable"]["thread_id"] == "thread-1"


async def test_resume_marks_failed_on_exception() -> None:
    mock_graph = AsyncMock()
    mock_graph.ainvoke.side_effect = Exception("resume failed")
    runner = WorkflowRunner(mock_graph)

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None

    session = AsyncMock()
    session.execute = AsyncMock(return_value=result_mock)
    session.commit = AsyncMock()

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch("src.ai.graph.runner.AsyncSessionLocal", return_value=cm):
        feedback: HumanFeedback = {"action": "reject", "edited_content": None, "notes": "bad"}
        await runner.resume("thread-fail", feedback)

    assert session.execute.await_count == 2
    session.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# WorkflowRunner.get_state / get_graph
# ---------------------------------------------------------------------------


async def test_get_state_delegates_to_graph() -> None:
    mock_state = MagicMock(values={"status": "awaiting_review"}, next=("await_human_review",))
    mock_graph = AsyncMock()
    mock_graph.aget_state = AsyncMock(return_value=mock_state)
    runner = WorkflowRunner(mock_graph)

    state = await runner.get_state("thread-1")

    assert state.values["status"] == "awaiting_review"
    mock_graph.aget_state.assert_awaited_once()
    # aget_state receives config as a positional argument
    call_config = mock_graph.aget_state.call_args.args[0]
    assert call_config["configurable"]["thread_id"] == "thread-1"


def test_get_graph_returns_underlying_graph() -> None:
    mock_graph = MagicMock()
    runner = WorkflowRunner(mock_graph)
    assert runner.get_graph() is mock_graph
