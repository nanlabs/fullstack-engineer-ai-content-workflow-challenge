import asyncio
import json
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from . import models, schemas
from .ai import generate_draft, translate_content
from .config import get_settings
from .database import Base, engine, get_db
from .ai_orchestrator import AIContentOrchestrator


settings = get_settings()
orchestrator = AIContentOrchestrator()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_sse_subscribers: set[asyncio.Queue[str]] = set()


def _publish_event(event_type: str, payload: dict):
    message = json.dumps({"type": event_type, "payload": payload})
    for q in list(_sse_subscribers):
        try:
            q.put_nowait(message)
        except Exception:
            # best-effort
            pass


@app.get("/events")
async def events():
    q: asyncio.Queue[str] = asyncio.Queue()
    _sse_subscribers.add(q)

    async def gen():
        try:
            # Initial ping so clients know it's connected
            yield "event: ping\ndata: {}\n\n"
            while True:
                msg = await q.get()
                yield f"event: message\ndata: {msg}\n\n"
        finally:
            _sse_subscribers.discard(q)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}


@app.post("/campaigns", response_model=schemas.CampaignRead)
def create_campaign(
    payload: schemas.CampaignCreate, db: Session = Depends(get_db)
):
    campaign = models.Campaign(name=payload.name, description=payload.description)
    db.add(campaign)
    db.flush()

    if payload.contents:
        for c in payload.contents:
            content = models.ContentPiece(
                campaign_id=campaign.id,
                locale=c.locale,
                type=c.type,
                original_text=c.original_text,
            )
            db.add(content)

    db.commit()
    db.refresh(campaign)
    _publish_event("campaign_created", {"campaign_id": campaign.id})
    return campaign


@app.get("/campaigns", response_model=List[schemas.CampaignRead])
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(models.Campaign).all()
    return campaigns


@app.get("/campaigns/{campaign_id}", response_model=schemas.CampaignRead)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@app.post(
    "/campaigns/{campaign_id}/contents",
    response_model=schemas.ContentPieceRead,
)
def add_content_piece(
    campaign_id: int,
    payload: schemas.ContentPieceCreate,
    db: Session = Depends(get_db),
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    content = models.ContentPiece(
        campaign_id=campaign_id,
        locale=payload.locale,
        type=payload.type,
        original_text=payload.original_text,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    _publish_event("content_created", {"content_id": content.id, "campaign_id": campaign_id})
    return content


@app.patch(
    "/contents/{content_id}",
    response_model=schemas.ContentPieceRead,
)
def update_content_piece(
    content_id: int,
    payload: schemas.ContentPieceUpdate,
    db: Session = Depends(get_db),
):
    content = (
        db.query(models.ContentPiece)
        .filter(models.ContentPiece.id == content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content piece not found")

    if payload.ai_suggested_text is not None:
        content.ai_suggested_text = payload.ai_suggested_text
    if payload.final_text is not None:
        content.final_text = payload.final_text
    if payload.review_state is not None:
        content.review_state = payload.review_state

    db.add(content)
    db.commit()
    db.refresh(content)
    _publish_event("content_updated", {"content_id": content.id})
    return content


@app.post("/ai/generate-draft", response_model=schemas.GenerateDraftResponse)
async def ai_generate_draft(
    payload: schemas.GenerateDraftRequest,
    db: Session = Depends(get_db),
):
    content = (
        db.query(models.ContentPiece)
        .filter(models.ContentPiece.id == payload.content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content piece not found")

    prompt_parts = [
        f"Generate marketing copy for a {content.type}.",
        f"Locale: {content.locale}.",
    ]
    if content.original_text:
        prompt_parts.append(f"Original text (source): {content.original_text}")
    prompt = " ".join(prompt_parts)

    suggested = await generate_draft(
        prompt=prompt, tone=payload.tone, language=payload.language
    )

    content.ai_suggested_text = suggested
    content.review_state = models.ReviewState.SUGGESTED
    db.add(content)
    db.commit()
    db.refresh(content)
    _publish_event("ai_suggested", {"content_id": content.id, "kind": "draft"})

    return schemas.GenerateDraftResponse(
        content_id=content.id,
        suggested_text=suggested,
    )


@app.post("/ai/translate", response_model=schemas.TranslateResponse)
async def ai_translate(
    payload: schemas.TranslateRequest,
    db: Session = Depends(get_db),
):
    content = (
        db.query(models.ContentPiece)
        .filter(models.ContentPiece.id == payload.content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content piece not found")

    source_text = content.original_text or content.ai_suggested_text or ""
    if not source_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No source text to translate (set original or AI suggestion first)",
        )

    translated = await translate_content(
        text=source_text,
        source_locale=content.locale,
        target_locale=payload.target_locale,
    )

    content.ai_suggested_text = translated
    content.review_state = models.ReviewState.SUGGESTED
    db.add(content)
    db.commit()
    db.refresh(content)
    _publish_event("ai_suggested", {"content_id": content.id, "kind": "translation"})

    return schemas.TranslateResponse(
        content_id=content.id,
        translated_text=translated,
    )


@app.post("/ai/compare-models", response_model=schemas.CompareModelsResponse)
async def ai_compare_models(
    payload: schemas.CompareModelsRequest,
    db: Session = Depends(get_db),
):
    """
    Bonus endpoint to compare OpenAI vs Anthropic outputs on the same input.
    It does not persist suggestions; it's meant for evaluation/inspection.
    """
    content = (
        db.query(models.ContentPiece)
        .filter(models.ContentPiece.id == payload.content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content piece not found")

    base_prompt_parts = [
        f"Generate marketing copy for a {content.type}.",
        f"Locale: {content.locale}.",
    ]
    if content.original_text:
        base_prompt_parts.append(f"Original text (source): {content.original_text}")
    prompt = " ".join(base_prompt_parts)

    from . import ai as ai_module

    async def openai_run() -> str | None:
        prev = ai_module.settings.ai_provider
        ai_module.settings.ai_provider = "openai"
        try:
            if payload.target_locale:
                source_text = content.original_text or content.ai_suggested_text or ""
                return await ai_module.translate_content(
                    text=source_text,
                    source_locale=content.locale,
                    target_locale=payload.target_locale,
                )
            return await ai_module.generate_draft(
                prompt=prompt, tone=payload.tone, language=None
            )
        except Exception:
            return None
        finally:
            ai_module.settings.ai_provider = prev

    async def anthropic_run() -> str | None:
        prev = ai_module.settings.ai_provider
        ai_module.settings.ai_provider = "anthropic"
        try:
            if payload.target_locale:
                source_text = content.original_text or content.ai_suggested_text or ""
                return await ai_module.translate_content(
                    text=source_text,
                    source_locale=content.locale,
                    target_locale=payload.target_locale,
                )
            return await ai_module.generate_draft(
                prompt=prompt, tone=payload.tone, language=None
            )
        except Exception:
            return None
        finally:
            ai_module.settings.ai_provider = prev

    openai_text, anthropic_text = await asyncio.gather(openai_run(), anthropic_run())
    return schemas.CompareModelsResponse(
        content_id=content.id,
        openai_text=openai_text,
        anthropic_text=anthropic_text,
    )

@app.post("/ai/run-pipeline")
async def ai_run_pipeline(
    payload: schemas.RunPipelineRequest,
    db: Session = Depends(get_db)
):
    content = db.query(models.ContentPiece).filter(models.ContentPiece.id == payload.content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content piece not found")

    prompt_parts = [
        f"Generate marketing copy for a {content.type}.",
        f"Locale: {content.locale}.",
    ]
    if content.original_text:
        prompt_parts.append(f"Original text (source): {content.original_text}")
    prompt = " ".join(prompt_parts)

    result = await orchestrator.run_content_pipeline(
        prompt=prompt,
        tone=payload.tone,
        language=content.locale,
        target_locales=payload.target_locales,
    )

    content.ai_suggested_text = result["draft"]
    content.review_state = models.ReviewState.SUGGESTED
    db.add(content)
    db.commit()
    db.refresh(content)

    _publish_event("ai_suggested", {"content_id": content.id, "kind": "pipeline"})

    return {
        "content_id": content.id,
        "draft": result["draft"],
        "translations": result["translations"],
        "metadata": result["metadata"],
    }