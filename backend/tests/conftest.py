from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes import router
from app.application.services import WorkflowService
from app.infrastructure.ai.base import GeneratedPayload
from app.infrastructure.db.models import Base
from app.infrastructure.events.bus import EventBus


class FakeAIProvider:
    provider_name = "fake-openai"
    model_name = "fake-model"

    def __init__(self) -> None:
        self.fail_metadata = False

    async def generate_draft(self, *, source_text: str, content_type: str, context: str | None) -> GeneratedPayload:
        return GeneratedPayload(output_text=f"Draft for {content_type}: {source_text}")

    async def translate(
        self,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        context: str | None,
    ) -> GeneratedPayload:
        return GeneratedPayload(output_text=f"[{target_language}] {source_text}")

    async def extract_metadata(self, *, source_text: str, content_type: str) -> GeneratedPayload:
        if self.fail_metadata:
            return GeneratedPayload(output_text="not-json", structured_output={"tone": "warm"})
        return GeneratedPayload(
            output_text='{"keywords": ["launch", "spring"], "tone": "optimistic", "sentiment": "positive"}',
            structured_output={
                "keywords": ["launch", "spring"],
                "tone": "optimistic",
                "sentiment": "positive",
            },
        )


@pytest_asyncio.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.fixture
def fake_ai_provider() -> FakeAIProvider:
    return FakeAIProvider()


@pytest.fixture
def event_bus() -> EventBus:
    return EventBus()


@pytest.fixture
def workflow_service(fake_ai_provider: FakeAIProvider, event_bus: EventBus) -> WorkflowService:
    return WorkflowService(ai_provider=fake_ai_provider, event_bus=event_bus)


@pytest_asyncio.fixture
async def api_client(
    session_factory: async_sessionmaker,
    workflow_service: WorkflowService,
) -> AsyncIterator[AsyncClient]:
    app = FastAPI()
    app.include_router(router)
    app.state.session_factory = session_factory
    app.state.workflow_service = workflow_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
