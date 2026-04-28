from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID, uuid4

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.ai.graph.runner import WorkflowRunner
from src.ai.graph.state import HumanFeedback
from src.api.errors import ConflictError, NotFoundError, ValidationError
from src.api.schemas.draft import DraftRead
from src.api.schemas.workflow import ResumeResponse, WorkflowRunListItem, WorkflowRunRead
from src.db.enums import DraftStatus, WorkflowStatus
from src.db.models.campaign import Campaign  # noqa: F401 — ensure relationship loaded
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft
from src.db.models.workflow_run import WorkflowRun
from src.events.bus import EventBus
from src.events.types import (
    WORKFLOW_COMPLETED,
    WORKFLOW_DRAFT_UPDATED,
    WORKFLOW_FAILED,
    WORKFLOW_RESUMED,
    WORKFLOW_STARTED,
    WorkflowEvent,
)

logger = structlog.get_logger(__name__)

MOCK_REVIEWER = "reviewer@acme.com"

ReviewAction = Literal["approve", "reject", "edit", "regenerate"]


class WorkflowService:
    def __init__(
        self,
        runner: WorkflowRunner,
        session: AsyncSession,
        events: EventBus,
    ) -> None:
        self._runner = runner
        self._session = session
        self._events = events

    async def start(self, content_piece_id: UUID) -> WorkflowRun:
        """Launch the LangGraph workflow for a content piece."""
        result = await self._session.execute(
            select(ContentPiece)
            .options(selectinload(ContentPiece.campaign))
            .where(ContentPiece.id == content_piece_id)
        )
        cp = result.scalar_one_or_none()
        if cp is None:
            raise NotFoundError(f"ContentPiece {content_piece_id} not found")

        campaign = cp.campaign
        if not campaign.target_languages:
            raise ValidationError("Campaign has no target languages configured.")

        thread_id = str(uuid4())
        run = WorkflowRun(
            content_piece_id=content_piece_id,
            langgraph_thread_id=thread_id,
            status=WorkflowStatus.running,
        )
        self._session.add(run)
        await self._session.flush()

        # Commit before creating the background task so the WorkflowRun row is
        # visible to the graph node that updates it (uses its own session).
        await self._session.commit()

        inputs: dict = {
            "content_piece_id": str(content_piece_id),
            "campaign_id": str(cp.campaign_id),
            "content_type": cp.type.value,
            "brief": campaign.brief,
            "source_language": campaign.source_language,
            "target_languages": list(campaign.target_languages),
            "source_text": cp.source_text,
            "initial_draft": None,
            "metadata": None,
            "translations": [],
            "pending_feedback": None,
            "iteration": 0,
            "status": "initializing",
            "error": None,
        }

        asyncio.create_task(self._runner.run_graph(thread_id, inputs))

        logger.info(
            "workflow_started",
            thread_id=thread_id,
            content_piece_id=str(content_piece_id),
        )

        await self._events.publish(
            WorkflowEvent(
                type=WORKFLOW_STARTED,
                thread_id=thread_id,
                content_piece_id=content_piece_id,
                timestamp=datetime.now(tz=UTC),
                payload={},
            )
        )

        return run

    async def resume(
        self,
        thread_id: str,
        action: ReviewAction,
        draft_id: UUID,
        edited_content: str | None,
        notes: str | None,
    ) -> ResumeResponse:
        """Resume a paused workflow with human feedback and apply draft effects."""
        # 1. Load workflow_run, verify it is awaiting human input
        wf_result = await self._session.execute(
            select(WorkflowRun).where(WorkflowRun.langgraph_thread_id == thread_id)
        )
        run = wf_result.scalar_one_or_none()
        if run is None:
            raise NotFoundError(f"Workflow {thread_id} not found")

        if run.status == WorkflowStatus.running:
            raise ConflictError(
                f"Workflow is busy, current node: {run.current_node or 'unknown'}"
            )
        if run.status != WorkflowStatus.awaiting_human:
            raise ConflictError(
                f"Workflow is not awaiting input, current status: {run.status.value}"
            )

        # 2. Load and validate the target draft
        draft_result = await self._session.execute(
            select(Draft).where(Draft.id == draft_id)
        )
        draft = draft_result.scalar_one_or_none()
        if draft is None:
            raise NotFoundError(f"Draft {draft_id} not found")

        if draft.content_piece_id != run.content_piece_id:
            raise ValidationError("draft_id does not belong to this workflow")

        # 3. Apply local effects to the draft per action
        now = datetime.now(tz=UTC)
        match action:
            case "approve":
                draft.status = DraftStatus.approved
                draft.reviewed_at = now
                draft.reviewed_by = MOCK_REVIEWER
            case "reject":
                draft.status = DraftStatus.rejected
                draft.reviewed_at = now
                draft.reviewed_by = MOCK_REVIEWER
                draft.review_notes = notes
            case "edit":
                draft.status = DraftStatus.reviewed
                draft.edited_content = edited_content
                draft.reviewed_at = now
                draft.reviewed_by = MOCK_REVIEWER
            case "regenerate":
                # This draft is superseded; new drafts will be created by the graph
                draft.status = DraftStatus.rejected
                draft.review_notes = notes

        draft.updated_at = now
        await self._session.flush()

        # 4. Build HumanFeedback dict for the graph
        feedback: HumanFeedback = {
            "action": action,  # type: ignore[typeddict-item]
            "edited_content": edited_content,
            "notes": notes,
        }

        # 5. Resume the graph — blocks until next interrupt or termination
        await self._runner.resume(thread_id, feedback)

        # 6. Re-read graph state to determine final workflow status
        snapshot = await self._runner.get_state(thread_id)

        if snapshot.next == ():
            # Graph terminated — update workflow_run to reflect final state
            graph_status = snapshot.values.get("status", "")
            if graph_status == "failed":
                new_wf_status = WorkflowStatus.failed
                run.error = snapshot.values.get("error")
            else:
                new_wf_status = WorkflowStatus.completed
            run.status = new_wf_status
            run.finished_at = now
            await self._session.flush()
        else:
            # Graph still at interrupt (regenerate loop) — await_human_review node
            # already updated workflow_run.status via its own session.
            new_wf_status = WorkflowStatus.awaiting_human

        await self._session.commit()

        # 7. Publish events
        await self._events.publish(
            WorkflowEvent(
                type=WORKFLOW_RESUMED,
                thread_id=thread_id,
                content_piece_id=run.content_piece_id,
                timestamp=now,
                payload={"action": action},
            )
        )
        await self._events.publish(
            WorkflowEvent(
                type=WORKFLOW_DRAFT_UPDATED,
                thread_id=thread_id,
                content_piece_id=run.content_piece_id,
                timestamp=now,
                payload={"draft_id": str(draft_id), "status": draft.status.value},
            )
        )
        if new_wf_status == WorkflowStatus.completed:
            await self._events.publish(
                WorkflowEvent(
                    type=WORKFLOW_COMPLETED,
                    thread_id=thread_id,
                    content_piece_id=run.content_piece_id,
                    timestamp=now,
                    payload={},
                )
            )
        elif new_wf_status == WorkflowStatus.failed:
            await self._events.publish(
                WorkflowEvent(
                    type=WORKFLOW_FAILED,
                    thread_id=thread_id,
                    content_piece_id=run.content_piece_id,
                    timestamp=now,
                    payload={"error": run.error or ""},
                )
            )

        logger.info("workflow_resumed", thread_id=thread_id, action=action)

        return ResumeResponse(
            workflow_run_id=run.id,
            thread_id=thread_id,
            new_status=new_wf_status,
            draft=_draft_to_read(draft),
        )

    async def get_workflow(self, thread_id: str) -> WorkflowRunRead:
        """Status snapshot of a workflow run, including drafts and graph iteration."""
        wf_result = await self._session.execute(
            select(WorkflowRun).where(WorkflowRun.langgraph_thread_id == thread_id)
        )
        run = wf_result.scalar_one_or_none()
        if run is None:
            raise NotFoundError(f"Workflow {thread_id} not found")

        drafts_result = await self._session.execute(
            select(Draft)
            .where(Draft.content_piece_id == run.content_piece_id)
            .order_by(Draft.created_at.desc())
        )
        drafts = drafts_result.scalars().all()

        iteration = 0
        try:
            snapshot = await self._runner.get_state(thread_id)
            iteration = snapshot.values.get("iteration", 0) if snapshot.values else 0
        except Exception as exc:
            logger.warning("get_state_failed", thread_id=thread_id, error=str(exc))

        return WorkflowRunRead(
            thread_id=thread_id,
            content_piece_id=run.content_piece_id,
            status=run.status,
            current_node=run.current_node,
            iteration=iteration,
            started_at=run.started_at,
            finished_at=run.finished_at,
            error=run.error,
            drafts=[_draft_to_read(d) for d in drafts],
        )

    async def list_workflows(
        self,
        content_piece_id: UUID | None = None,
        status: WorkflowStatus | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[WorkflowRunListItem]:
        """List workflow runs with optional filters."""
        query = select(WorkflowRun).order_by(WorkflowRun.started_at.desc())
        if content_piece_id is not None:
            query = query.where(WorkflowRun.content_piece_id == content_piece_id)
        if status is not None:
            query = query.where(WorkflowRun.status == status)
        query = query.limit(limit).offset(offset)

        result = await self._session.execute(query)
        runs = result.scalars().all()
        return [
            WorkflowRunListItem(
                workflow_run_id=r.id,
                thread_id=r.langgraph_thread_id,
                content_piece_id=r.content_piece_id,
                status=r.status,
                started_at=r.started_at,
                finished_at=r.finished_at,
            )
            for r in runs
        ]


def _draft_to_read(d: Draft) -> DraftRead:
    return DraftRead(
        id=d.id,
        content_piece_id=d.content_piece_id,
        language=d.language,
        status=d.status,
        ai_content=d.ai_content,
        edited_content=d.edited_content,
        model_used=d.model_used,
        provider=d.provider,
        metadata=d.content_metadata,
        parent_draft_id=d.parent_draft_id,
        reviewed_by=d.reviewed_by,
        reviewed_at=d.reviewed_at,
        review_notes=d.review_notes,
        created_at=d.created_at,
    )
