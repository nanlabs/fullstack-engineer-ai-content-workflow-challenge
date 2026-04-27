"""Seed script — creates demo data for local development.

Usage:
    uv run python -m scripts.seed
"""

import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.db.enums import ContentPieceType
from src.db.models import Campaign, ContentPiece, PromptTemplate

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


async def seed(session: AsyncSession) -> None:
    # Campaign
    campaign = Campaign(
        name="Spring Sale 2026",
        brief=(
            "ACME Global Media's spring campaign targeting young professionals "
            "who want to upgrade their productivity toolkit. Focus on simplicity, "
            "speed, and value for money."
        ),
        target_languages=["en", "es", "pt-BR"],
        source_language="en",
    )
    session.add(campaign)
    await session.flush()
    log.info("Created campaign: %s (%s)", campaign.name, campaign.id)

    # Content pieces
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

    # Prompt templates
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


async def main() -> None:
    engine = create_async_engine(settings.database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
