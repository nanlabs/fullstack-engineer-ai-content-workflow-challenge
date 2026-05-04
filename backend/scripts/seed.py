"""Seed script — creates demo data for local development.

Usage:
    uv run python -m scripts.seed               # creates if not exists (idempotent)
    uv run python -m scripts.seed --idempotent  # explicit idempotent flag
    uv run python -m scripts.seed --reset       # wipe and recreate
"""

import argparse
import asyncio
import logging

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.future import select

from src.config import settings
from src.db.enums import ContentPieceType
from src.db.models import Campaign, ContentPiece, Draft, PromptTemplate, WorkflowRun

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)


HEADLINE_TEMPLATE = """\
You are a world-class copywriter. Write a compelling {type} in {language}.

Campaign brief:
{brief}

Constraints:
- Language: {language}
- Tone: professional yet approachable
- Length: concise (under 15 words for headlines, under 50 for CTAs)

Respond with only the {type} text, no preamble.
"""

TRANSLATION_TEMPLATE = """\
Translate the following marketing content from {source_language} to {target_language}.
Preserve the tone, intent, and cultural nuance — do not translate literally.

Original:
{source_text}

Provide only the translated text, no preamble.
"""

SEED_CAMPAIGN_NAME = "Spring Sale 2026"


async def reset(session: AsyncSession) -> None:
    await session.execute(delete(Draft))
    await session.execute(delete(WorkflowRun))
    await session.execute(delete(ContentPiece))
    await session.execute(delete(Campaign))
    await session.execute(delete(PromptTemplate))
    await session.flush()
    log.info("Existing seed data wiped.")


async def seed(session: AsyncSession) -> None:
    campaign = Campaign(
        name=SEED_CAMPAIGN_NAME,
        brief=(
            "ACME Global Media's spring campaign targeting young professionals "
            "who want to upgrade their productivity toolkit. Focus on simplicity, "
            "speed, and value for money."
        ),
        target_languages=["es", "pt-BR"],
        source_language="en",
    )
    session.add(campaign)
    await session.flush()
    log.info("Created campaign: %s (%s)", campaign.name, campaign.id)

    headline = ContentPiece(
        campaign_id=campaign.id,
        type=ContentPieceType.headline,
        title="Main Headline",
        source_text="Work smarter this spring — try ACME free for 30 days.",
    )
    description = ContentPiece(
        campaign_id=campaign.id,
        type=ContentPieceType.description,
        title="Product Description",
        source_text=(
            "ACME helps busy professionals manage projects, automate repetitive tasks, "
            "and collaborate in real time. No setup required."
        ),
    )
    cta = ContentPiece(
        campaign_id=campaign.id,
        type=ContentPieceType.cta,
        title="Primary CTA",
        source_text="Start your free trial",
    )
    session.add_all([headline, description, cta])
    await session.flush()
    log.info("Created 3 content pieces (headline, description, cta)")

    headline_tpl = PromptTemplate(
        name="headline_generation",
        version=1,
        template=HEADLINE_TEMPLATE,
        description="Generates marketing headlines, descriptions, and CTAs for a given language.",
        default_model="claude-sonnet-4-6",
    )
    translation_tpl = PromptTemplate(
        name="translation",
        version=1,
        template=TRANSLATION_TEMPLATE,
        description="Translates marketing copy while preserving tone and cultural nuance.",
        default_model="claude-sonnet-4-6",
    )
    session.add_all([headline_tpl, translation_tpl])
    await session.flush()
    log.info("Created 2 prompt templates (headline_generation v1, translation v1)")

    await session.commit()
    log.info("Seed complete.")


async def main(*, do_reset: bool = False) -> None:
    engine = create_async_engine(settings.database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        existing = await session.scalar(select(Campaign).where(Campaign.name == SEED_CAMPAIGN_NAME))

        if do_reset:
            await reset(session)
        elif existing:
            log.info("Seed already applied, skipping.")
            await engine.dispose()
            return

        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo data for local development.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--idempotent",
        action="store_true",
        help="Skip if seed data already exists (default behavior).",
    )
    group.add_argument(
        "--reset",
        action="store_true",
        help="Wipe existing seed data and recreate.",
    )
    args = parser.parse_args()
    asyncio.run(main(do_reset=args.reset))
