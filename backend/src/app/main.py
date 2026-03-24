from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.application.services import WorkflowService
from app.config import get_settings
from app.infrastructure.ai.openai_provider import OpenAIProvider
from app.infrastructure.db.migrations import run_migrations
from app.infrastructure.db.session import build_engine, build_session_factory
from app.infrastructure.events.bus import EventBus


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    engine = build_engine(settings.database_url)
    await run_migrations(engine)
    session_factory = build_session_factory(engine)
    event_bus = EventBus()
    ai_provider = OpenAIProvider(settings.openai_api_key, settings.openai_model)

    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.workflow_service = WorkflowService(ai_provider=ai_provider, event_bus=event_bus)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin, "http://frontend:3000", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    @app.get("/health")
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app
