"""API integration tests for workflow endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.graph.runner import WorkflowRunner, get_runner
from src.db.enums import WorkflowStatus
from src.db.models.draft import Draft
from src.db.models.workflow_run import WorkflowRun
from src.events.bus import InMemoryEventBus, get_event_bus
from src.main import app


def _mock_runner_dep(*, graph_done: bool = True, graph_status: str = "approved") -> WorkflowRunner:
    runner = AsyncMock(spec=WorkflowRunner)
    runner.resume = AsyncMock(return_value=None)
    if graph_done:
        runner.get_state = AsyncMock(
            return_value=MagicMock(
                next=(),
                values={"status": graph_status, "iteration": 0, "error": None},
            )
        )
    else:
        runner.get_state = AsyncMock(
            return_value=MagicMock(
                next=("await_human_review",),
                interrupts=[MagicMock()],
                values={"status": "awaiting_review", "iteration": 1, "error": None},
            )
        )
    runner.run_graph = AsyncMock(return_value=None)
    return runner  # type: ignore[return-value]


def _mock_events_dep() -> InMemoryEventBus:
    bus = AsyncMock(spec=InMemoryEventBus)
    bus.publish = AsyncMock(return_value=None)
    return bus  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Resume endpoint tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resume_endpoint_happy_path(
    client: AsyncClient,
    seeded_workflow_run: WorkflowRun,
    seeded_draft: Draft,
) -> None:
    mock_runner = _mock_runner_dep(graph_done=True, graph_status="approved")
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        resp = await client.post(
            f"/api/workflows/{seeded_workflow_run.langgraph_thread_id}/resume",
            json={"action": "approve", "draft_id": str(seeded_draft.id)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["thread_id"] == seeded_workflow_run.langgraph_thread_id
        assert data["new_status"] == WorkflowStatus.completed.value
        assert data["draft"]["status"] == "approved"
        assert data["workflow_run_id"] == str(seeded_workflow_run.id)
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)


@pytest.mark.asyncio
async def test_resume_endpoint_404_unknown_thread(client: AsyncClient) -> None:
    mock_runner = _mock_runner_dep()
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        resp = await client.post(
            f"/api/workflows/{uuid4()}/resume",
            json={"action": "approve", "draft_id": str(uuid4())},
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)


@pytest.mark.asyncio
async def test_resume_endpoint_409_already_completed(
    client: AsyncClient,
    db_session: AsyncSession,
    seeded_draft: Draft,
) -> None:
    from uuid import uuid4 as _uuid4

    # client fixture shares db_session, so adding here is visible to the handler
    run = WorkflowRun(
        content_piece_id=seeded_draft.content_piece_id,
        langgraph_thread_id=str(_uuid4()),
        status=WorkflowStatus.completed,
    )
    db_session.add(run)
    await db_session.flush()

    mock_runner = _mock_runner_dep()
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        resp = await client.post(
            f"/api/workflows/{run.langgraph_thread_id}/resume",
            json={"action": "approve", "draft_id": str(seeded_draft.id)},
        )
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "CONFLICT"
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)


@pytest.mark.asyncio
async def test_resume_endpoint_422_invalid_body(
    client: AsyncClient,
    seeded_workflow_run: WorkflowRun,
) -> None:
    mock_runner = _mock_runner_dep()
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        # action=edit without edited_content
        resp = await client.post(
            f"/api/workflows/{seeded_workflow_run.langgraph_thread_id}/resume",
            json={"action": "edit", "draft_id": str(uuid4())},
        )
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)


# ---------------------------------------------------------------------------
# GET workflow endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_workflow_returns_status(
    client: AsyncClient,
    seeded_workflow_run: WorkflowRun,
    seeded_draft: Draft,
) -> None:
    mock_runner = _mock_runner_dep()
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        resp = await client.get(f"/api/workflows/{seeded_workflow_run.langgraph_thread_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["thread_id"] == seeded_workflow_run.langgraph_thread_id
        assert data["status"] == WorkflowStatus.awaiting_human.value
        assert isinstance(data["drafts"], list)
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)


@pytest.mark.asyncio
async def test_get_workflow_404_unknown_thread(client: AsyncClient) -> None:
    mock_runner = _mock_runner_dep()
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        resp = await client.get(f"/api/workflows/{uuid4()}")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)


@pytest.mark.asyncio
async def test_list_workflows_returns_list(
    client: AsyncClient,
    seeded_workflow_run: WorkflowRun,
) -> None:
    mock_runner = _mock_runner_dep()
    app.dependency_overrides[get_runner] = lambda: mock_runner
    app.dependency_overrides[get_event_bus] = lambda: _mock_events_dep()

    try:
        resp = await client.get("/api/workflows")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(r["thread_id"] == seeded_workflow_run.langgraph_thread_id for r in data)
    finally:
        app.dependency_overrides.pop(get_runner, None)
        app.dependency_overrides.pop(get_event_bus, None)
