from __future__ import annotations

from collections.abc import AsyncIterator
import os
from urllib.parse import urlsplit, urlunsplit

import asyncpg
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from app.api.routes import router
from app.application.services import WorkflowService
from app.infrastructure.ai.base import GeneratedPayload
from app.infrastructure.db.migrations import run_migrations
from app.infrastructure.events.bus import EventBus

DEFAULT_TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_content_workflow_test"


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


def _admin_database_url(database_url: str) -> str:
    parts = urlsplit(database_url.replace("+asyncpg", ""))
    return urlunsplit((parts.scheme, parts.netloc, "/postgres", parts.query, parts.fragment))


def _database_name(database_url: str) -> str:
    return urlsplit(database_url).path.removeprefix("/")


async def _ensure_test_database(database_url: str) -> None:
    admin_connection = await asyncpg.connect(_admin_database_url(database_url))
    try:
        database_name = _database_name(database_url)
        exists = await admin_connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            database_name,
        )
        if not exists:
            await admin_connection.execute(f'CREATE DATABASE "{database_name}"')
    finally:
        await admin_connection.close()


@pytest.fixture(scope="session")
def database_url() -> str:
    return os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


@pytest_asyncio.fixture
async def engine(database_url: str) -> AsyncIterator[AsyncEngine]:
    await _ensure_test_database(database_url)
    engine = create_async_engine(database_url, future=True)
    await run_migrations(engine)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(engine: AsyncEngine) -> AsyncIterator[async_sessionmaker]:
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE review_actions, ai_suggestions, content_pieces, campaigns RESTART IDENTITY CASCADE"))
    yield async_sessionmaker(engine, expire_on_commit=False)


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
