from __future__ import annotations

import os
from collections.abc import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db import models  # noqa: F401 — register all models before create_all
from src.db.base import Base
from src.db.enums import ContentPieceType, DraftStatus
from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft

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
async def seeded_draft(db_session: AsyncSession) -> Draft:
    campaign = Campaign(name="Svc Test Campaign", source_language="en", target_languages=["es"])
    db_session.add(campaign)
    await db_session.flush()

    cp = ContentPiece(
        campaign_id=campaign.id,
        type=ContentPieceType.headline,
        title="Headline",
    )
    db_session.add(cp)
    await db_session.flush()

    draft = Draft(
        content_piece_id=cp.id,
        language="es",
        status=DraftStatus.suggested,
        ai_content="Compra ahora",
    )
    db_session.add(draft)
    await db_session.flush()
    await db_session.refresh(draft)
    return draft
