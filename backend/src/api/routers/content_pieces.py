from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.ai.graph.runner import get_runner
from src.api.deps import get_session
from src.api.errors import NotFoundError, ValidationError
from src.api.schemas.content_piece import (
    ContentPieceCreate,
    ContentPieceDetail,
    ContentPieceUpdate,
)
from src.api.schemas.generate import GenerateRequest, GenerateResponse
from src.db.enums import WorkflowStatus
from src.db.models.content_piece import ContentPiece
from src.db.models.workflow_run import WorkflowRun
from src.services import content_piece_service

router = APIRouter()


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
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> GenerateResponse:
    """Launch the LangGraph workflow for a content piece. Returns 202 immediately."""
    result = await session.execute(
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
    session.add(run)
    await session.flush()

    # Commit now so the WorkflowRun row is visible to the background task before it starts.
    await session.commit()

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

    runner = get_runner()
    background_tasks.add_task(runner.run_graph, thread_id, inputs)

    return GenerateResponse(
        workflow_run_id=str(run.id),
        thread_id=thread_id,
        status="running",
    )
