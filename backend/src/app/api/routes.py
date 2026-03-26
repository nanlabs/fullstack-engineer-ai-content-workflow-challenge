from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ServiceDep, SessionDep
from app.api.schemas import (
    AIActionResponse,
    CampaignCreate,
    CampaignDetailResponse,
    CampaignSummary,
    ContentPieceCreate,
    ContentPieceResponse,
    ContentPieceUpdate,
    GenerateDraftRequest,
    ProviderSettingsResponse,
    ReviewRequest,
    ReviewResponse,
    TranslateRequest,
    UpdateProviderSettingsRequest,
)
from app.application.services import NotFoundError, ProviderNotConfiguredError, WorkflowService

router = APIRouter()


@router.post("/campaigns", response_model=CampaignSummary, status_code=201)
async def create_campaign(payload: CampaignCreate, session: AsyncSession = SessionDep, service: WorkflowService = ServiceDep) -> CampaignSummary:
    return await service.create_campaign(session, payload)


@router.get("/campaigns", response_model=list[CampaignSummary])
async def list_campaigns(session: AsyncSession = SessionDep, service: WorkflowService = ServiceDep) -> list[CampaignSummary]:
    return await service.list_campaigns(session)


@router.get("/settings/ai-provider", response_model=ProviderSettingsResponse)
async def get_ai_provider_settings(
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> ProviderSettingsResponse:
    return await service.get_provider_settings(session)


@router.put("/settings/ai-provider", response_model=ProviderSettingsResponse)
async def update_ai_provider_settings(
    payload: UpdateProviderSettingsRequest,
    request: Request,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> ProviderSettingsResponse:
    if "api_key" in request.query_params:
        raise HTTPException(status_code=400, detail="api_key must be sent in the request body, not as a query parameter.")
    try:
        return await service.update_provider_settings(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/campaigns/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign(campaign_id: str, session: AsyncSession = SessionDep, service: WorkflowService = ServiceDep) -> CampaignDetailResponse:
    try:
        return await service.get_campaign(session, campaign_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/content-pieces", response_model=ContentPieceResponse, status_code=201)
async def create_content_piece(
    campaign_id: str,
    payload: ContentPieceCreate,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> ContentPieceResponse:
    try:
        return await service.create_content_piece(session, campaign_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/content-pieces/{content_piece_id}", response_model=ContentPieceResponse)
async def get_content_piece(
    content_piece_id: str,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> ContentPieceResponse:
    try:
        return await service.get_content_piece(session, content_piece_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/content-pieces/{content_piece_id}", response_model=ContentPieceResponse)
async def update_content_piece(
    content_piece_id: str,
    payload: ContentPieceUpdate,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> ContentPieceResponse:
    try:
        return await service.update_content_piece(session, content_piece_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/content-pieces/{content_piece_id}/ai/generate-draft", response_model=AIActionResponse)
async def generate_draft(
    content_piece_id: str,
    payload: GenerateDraftRequest,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> AIActionResponse:
    try:
        return await service.generate_draft(session, content_piece_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/content-pieces/{content_piece_id}/ai/translate", response_model=AIActionResponse)
async def translate(
    content_piece_id: str,
    payload: TranslateRequest,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> AIActionResponse:
    try:
        return await service.translate(session, content_piece_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/content-pieces/{content_piece_id}/ai/extract-metadata", response_model=AIActionResponse)
async def extract_metadata(
    content_piece_id: str,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> AIActionResponse:
    try:
        return await service.extract_metadata(session, content_piece_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/content-pieces/{content_piece_id}/review", response_model=ReviewResponse)
async def review_content_piece(
    content_piece_id: str,
    payload: ReviewRequest,
    session: AsyncSession = SessionDep,
    service: WorkflowService = ServiceDep,
) -> ReviewResponse:
    try:
        return await service.review(session, content_piece_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/events")
async def stream_events(service: WorkflowService = ServiceDep) -> StreamingResponse:
    queue = service.event_bus.subscribe()

    async def event_stream():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(event)}\n\n"
                except TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            service.event_bus.unsubscribe(queue)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
