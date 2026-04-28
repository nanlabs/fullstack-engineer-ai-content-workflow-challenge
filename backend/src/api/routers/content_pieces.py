from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.graph.runner import WorkflowRunner, get_runner
from src.api.deps import get_session
from src.api.schemas.content_piece import (
    ContentPieceCreate,
    ContentPieceDetail,
    ContentPieceUpdate,
)
from src.api.schemas.generate import GenerateRequest, GenerateResponse
from src.events.bus import EventBus, get_event_bus
from src.services import content_piece_service
from src.services.workflow_service import WorkflowService

router = APIRouter()


def _get_workflow_service(
    session: AsyncSession = Depends(get_session),
    runner: WorkflowRunner = Depends(get_runner),
    events: EventBus = Depends(get_event_bus),
) -> WorkflowService:
    return WorkflowService(runner=runner, session=session, events=events)


@router.post(
    "/campaigns/{campaign_id}/content-pieces",
    response_model=ContentPieceDetail,
    status_code=201,
)
async def create_content_piece(
    campaign_id: UUID,
    body: ContentPieceCreate,
    session: AsyncSession = Depends(get_session),
) -> ContentPieceDetail:
    return await content_piece_service.create_content_piece(session, campaign_id, body)


@router.get("/content-pieces/{content_piece_id}", response_model=ContentPieceDetail)
async def get_content_piece(
    content_piece_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> ContentPieceDetail:
    return await content_piece_service.get_content_piece(session, content_piece_id)


@router.patch("/content-pieces/{content_piece_id}", response_model=ContentPieceDetail)
async def update_content_piece(
    content_piece_id: UUID,
    body: ContentPieceUpdate,
    session: AsyncSession = Depends(get_session),
) -> ContentPieceDetail:
    return await content_piece_service.update_content_piece(session, content_piece_id, body)


@router.delete("/content-pieces/{content_piece_id}", status_code=204)
async def delete_content_piece(
    content_piece_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    await content_piece_service.delete_content_piece(session, content_piece_id)


@router.post(
    "/content-pieces/{content_piece_id}/generate",
    response_model=GenerateResponse,
    status_code=202,
)
async def generate_content(
    content_piece_id: UUID,
    body: GenerateRequest,  # noqa: ARG001 — reserved for future provider override
    service: WorkflowService = Depends(_get_workflow_service),
) -> GenerateResponse:
    """Launch the LangGraph workflow for a content piece. Returns 202 immediately."""
    run = await service.start(content_piece_id)
    return GenerateResponse(
        workflow_run_id=str(run.id),
        thread_id=run.langgraph_thread_id,
        status="running",
    )
