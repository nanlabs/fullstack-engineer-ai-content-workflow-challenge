from __future__ import annotations

import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.api.deps import get_session
from src.db import models  # noqa: F401 — register all models before create_all
from src.db.base import Base
from src.db.enums import ContentPieceType, DraftStatus, WorkflowStatus
from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft
from src.db.models.workflow_run import WorkflowRun
from src.main import app

_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/acme_content",
)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, checkfirst=True))

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()

    await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def seeded_campaign(db_session: AsyncSession) -> Campaign:
    campaign = Campaign(
        name="Test Campaign",
        brief="A test brief",
        target_languages=["es", "pt-BR"],
        source_language="en",
    )
    db_session.add(campaign)
    await db_session.flush()
    await db_session.refresh(campaign)
    return campaign


@pytest.fixture
async def seeded_content_piece(db_session: AsyncSession, seeded_campaign: Campaign) -> ContentPiece:
    cp = ContentPiece(
        campaign_id=seeded_campaign.id,
        type=ContentPieceType.headline,
        title="Test Headline",
        source_text="Buy now",
    )
    db_session.add(cp)
    await db_session.flush()
    await db_session.refresh(cp)
    return cp


@pytest.fixture
async def seeded_draft(db_session: AsyncSession, seeded_content_piece: ContentPiece) -> Draft:
    draft = Draft(
        content_piece_id=seeded_content_piece.id,
        language="es",
        status=DraftStatus.suggested,
        ai_content="Compra ahora",
    )
    db_session.add(draft)
    await db_session.flush()
    await db_session.refresh(draft)
    return draft


@pytest.fixture
async def seeded_workflow_run(
    db_session: AsyncSession, seeded_content_piece: ContentPiece
) -> WorkflowRun:
    from uuid import uuid4

    run = WorkflowRun(
        content_piece_id=seeded_content_piece.id,
        langgraph_thread_id=str(uuid4()),
        status=WorkflowStatus.awaiting_human,
        current_node="await_human_review",
    )
    db_session.add(run)
    await db_session.flush()
    await db_session.refresh(run)
    return run
