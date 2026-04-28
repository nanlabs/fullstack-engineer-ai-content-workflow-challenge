"""Tests for WorkflowService — uses real DB for resume tests, mocked session for start."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import ConflictError, NotFoundError
from src.db.enums import DraftStatus, WorkflowStatus
from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft
from src.db.models.workflow_run import WorkflowRun
from src.events.bus import EventBus
from src.events.types import WORKFLOW_COMPLETED, WORKFLOW_RESUMED
from src.services.workflow_service import WorkflowService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_runner(*, graph_done: bool = True, graph_status: str = "approved") -> MagicMock:
    runner = AsyncMock()
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
    return runner


def _mock_events() -> AsyncMock:
    bus = AsyncMock(spec=EventBus)
    bus.publish = AsyncMock(return_value=None)
    return bus


async def _seed_workflow_context(
    db_session: AsyncSession,
    wf_status: WorkflowStatus = WorkflowStatus.awaiting_human,
) -> tuple[WorkflowRun, Draft]:
    """Seed a campaign, content piece, workflow_run, and draft for resume tests."""
    campaign = Campaign(
        name="WF Test Campaign",
        brief="Test brief",
        source_language="en",
        target_languages=["es"],
    )
    db_session.add(campaign)
    await db_session.flush()

    from src.db.enums import ContentPieceType

    cp = ContentPiece(
        campaign_id=campaign.id,
        type=ContentPieceType.headline,
        title="WF Test Headline",
        source_text="Buy now",
    )
    db_session.add(cp)
    await db_session.flush()

    thread_id = str(uuid4())
    run = WorkflowRun(
        content_piece_id=cp.id,
        langgraph_thread_id=thread_id,
        status=wf_status,
        current_node="await_human_review",
    )
    db_session.add(run)
    await db_session.flush()

    draft = Draft(
        content_piece_id=cp.id,
        language="es",
        status=DraftStatus.suggested,
        ai_content="Compra ahora",
    )
    db_session.add(draft)
    await db_session.flush()
    await db_session.refresh(draft)
    await db_session.refresh(run)

    return run, draft


# ---------------------------------------------------------------------------
# start() tests (mocked session — avoids commit/rollback conflict)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_start_creates_workflow_run_and_returns_thread_id() -> None:
    session = AsyncMock(spec=AsyncSession)
    runner = _mock_runner()
    events = _mock_events()

    from src.db.enums import ContentPieceType

    mock_campaign = MagicMock()
    mock_campaign.target_languages = ["es", "pt-BR"]
    mock_campaign.source_language = "en"
    mock_campaign.brief = "A brief"

    mock_cp = MagicMock()
    mock_cp.id = uuid4()
    mock_cp.campaign_id = uuid4()
    mock_cp.campaign = mock_campaign
    mock_cp.type = MagicMock()
    mock_cp.type.value = ContentPieceType.headline.value
    mock_cp.source_text = "Buy now"

    session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_cp))
    )
    session.flush = AsyncMock()
    session.commit = AsyncMock()

    service = WorkflowService(runner=runner, session=session, events=events)

    with patch("src.services.workflow_service.asyncio.create_task"):
        run = await service.start(mock_cp.id)

    assert run.langgraph_thread_id is not None
    assert run.status == WorkflowStatus.running
    session.add.assert_called_once()
    session.flush.assert_awaited_once()
    session.commit.assert_awaited_once()
    events.publish.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_raises_not_found_for_missing_content_piece() -> None:
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )

    service = WorkflowService(runner=_mock_runner(), session=session, events=_mock_events())
    with pytest.raises(NotFoundError):
        await service.start(uuid4())


# ---------------------------------------------------------------------------
# resume() tests (real DB session + mocked runner)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resume_approve_sets_draft_approved_and_completes_run(
    db_session: AsyncSession,
) -> None:
    run, draft = await _seed_workflow_context(db_session)
    runner = _mock_runner(graph_done=True, graph_status="approved")
    service = WorkflowService(runner=runner, session=db_session, events=_mock_events())

    result = await service.resume(
        thread_id=run.langgraph_thread_id,
        action="approve",
        draft_id=draft.id,
        edited_content=None,
        notes=None,
    )

    assert result.new_status == WorkflowStatus.completed
    assert result.draft.status == DraftStatus.approved
    assert result.draft.reviewed_by == "reviewer@acme.com"
    assert result.draft.reviewed_at is not None
    runner.resume.assert_awaited_once()


@pytest.mark.asyncio
async def test_resume_edit_persists_edited_content(
    db_session: AsyncSession,
) -> None:
    run, draft = await _seed_workflow_context(db_session)
    runner = _mock_runner(graph_done=True, graph_status="approved")
    service = WorkflowService(runner=runner, session=db_session, events=_mock_events())

    result = await service.resume(
        thread_id=run.langgraph_thread_id,
        action="edit",
        draft_id=draft.id,
        edited_content="¡Cómpralo ya!",
        notes=None,
    )

    assert result.draft.status == DraftStatus.reviewed
    assert result.draft.edited_content == "¡Cómpralo ya!"
    assert result.draft.final_content == "¡Cómpralo ya!"


@pytest.mark.asyncio
async def test_resume_regenerate_loops_back_and_creates_new_drafts(
    db_session: AsyncSession,
) -> None:
    run, draft = await _seed_workflow_context(db_session)
    runner = _mock_runner(graph_done=False)
    service = WorkflowService(runner=runner, session=db_session, events=_mock_events())

    result = await service.resume(
        thread_id=run.langgraph_thread_id,
        action="regenerate",
        draft_id=draft.id,
        edited_content=None,
        notes="Make it punchier",
    )

    # Draft superseded
    assert result.draft.status == DraftStatus.rejected
    assert result.draft.review_notes == "Make it punchier"
    # Workflow still awaiting
    assert result.new_status == WorkflowStatus.awaiting_human


@pytest.mark.asyncio
async def test_resume_with_invalid_action_raises_validation() -> None:
    from pydantic import ValidationError as PydanticValidationError

    from src.api.schemas.workflow import ResumeRequest

    with pytest.raises(PydanticValidationError):
        ResumeRequest(action="invalid_action", draft_id=uuid4())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_resume_when_not_awaiting_raises_conflict(
    db_session: AsyncSession,
) -> None:
    run, draft = await _seed_workflow_context(db_session, wf_status=WorkflowStatus.completed)
    service = WorkflowService(
        runner=_mock_runner(), session=db_session, events=_mock_events()
    )

    with pytest.raises(ConflictError) as exc_info:
        await service.resume(
            thread_id=run.langgraph_thread_id,
            action="approve",
            draft_id=draft.id,
            edited_content=None,
            notes=None,
        )
    assert "awaiting input" in str(exc_info.value.message).lower()
    assert "completed" in str(exc_info.value.message)


@pytest.mark.asyncio
async def test_resume_with_missing_edited_content_when_action_edit_raises() -> None:
    from pydantic import ValidationError as PydanticValidationError

    from src.api.schemas.workflow import ResumeRequest

    with pytest.raises(PydanticValidationError):
        ResumeRequest(action="edit", draft_id=uuid4(), edited_content=None)


@pytest.mark.asyncio
async def test_resume_publishes_events(
    db_session: AsyncSession,
) -> None:
    run, draft = await _seed_workflow_context(db_session)
    runner = _mock_runner(graph_done=True, graph_status="approved")
    events = _mock_events()
    service = WorkflowService(runner=runner, session=db_session, events=events)

    await service.resume(
        thread_id=run.langgraph_thread_id,
        action="approve",
        draft_id=draft.id,
        edited_content=None,
        notes=None,
    )

    published_types = [call.args[0].type for call in events.publish.call_args_list]
    assert WORKFLOW_RESUMED in published_types
    assert WORKFLOW_COMPLETED in published_types
