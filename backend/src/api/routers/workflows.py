from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.graph.runner import WorkflowRunner, get_runner
from src.api.deps import get_session
from src.api.schemas.workflow import (
    ResumeRequest,
    ResumeResponse,
    WorkflowRunListItem,
    WorkflowRunRead,
)
from src.db.enums import WorkflowStatus
from src.events.bus import EventBus, get_event_bus
from src.services.workflow_service import WorkflowService

router = APIRouter()


def _get_service(
    session: AsyncSession = Depends(get_session),
    runner: WorkflowRunner = Depends(get_runner),
    events: EventBus = Depends(get_event_bus),
) -> WorkflowService:
    return WorkflowService(runner=runner, session=session, events=events)


@router.get("", response_model=list[WorkflowRunListItem])
async def list_workflows(
    content_piece_id: UUID | None = Query(default=None),
    status: WorkflowStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: WorkflowService = Depends(_get_service),
) -> list[WorkflowRunListItem]:
    return await service.list_workflows(
        content_piece_id=content_piece_id,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.get("/{thread_id}", response_model=WorkflowRunRead)
async def get_workflow(
    thread_id: str,
    service: WorkflowService = Depends(_get_service),
) -> WorkflowRunRead:
    return await service.get_workflow(thread_id)


@router.post("/{thread_id}/resume", response_model=ResumeResponse)
async def resume_workflow(
    thread_id: str,
    body: ResumeRequest,
    service: WorkflowService = Depends(_get_service),
) -> ResumeResponse:
    return await service.resume(
        thread_id=thread_id,
        action=body.action,
        draft_id=body.draft_id,
        edited_content=body.edited_content,
        notes=body.notes,
    )
