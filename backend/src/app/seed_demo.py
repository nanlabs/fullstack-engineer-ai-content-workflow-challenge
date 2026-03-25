from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy import delete

from app.api.schemas import (
    CampaignCreate,
    ContentPieceCreate,
    GenerateDraftRequest,
    ReviewRequest,
    TranslateRequest,
)
from app.application.services import WorkflowService
from app.config import get_settings
from app.domain.enums import ReviewActionType
from app.infrastructure.ai.base import GeneratedPayload
from app.infrastructure.db.migrations import run_migrations
from app.infrastructure.db.models import Campaign
from app.infrastructure.db.session import build_engine, build_session_factory
from app.infrastructure.events.bus import EventBus

DEMO_NAME = "ACME Media | Creator Launch Demo"
DEMO_DESCRIPTION = (
    "Review-ready demo campaign with varied content states, translation history, and metadata to validate the editor."
)


@dataclass(frozen=True, slots=True)
class DemoPiece:
    source_text: str
    context: str
    generate_draft: bool = True
    source_language: str | None = None
    target_language: str | None = None
    review_action: ReviewActionType | None = None
    extract_metadata: bool = False


class DemoSeedProvider:
    provider_name = "seed-gemini"
    model_name = "demo-curator-v1"

    async def generate_draft(self, *, source_text: str, content_type: str, context: str | None) -> GeneratedPayload:
        context_note = f" ({context})" if context else ""
        return GeneratedPayload(
            output_text=(
                f"AI draft{context_note}: {source_text} "
                "Shape it into a sharper message with a clear hook, tighter cadence, and a stronger editorial payoff."
            )
        )

    async def translate(
        self,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        context: str | None,
    ) -> GeneratedPayload:
        return GeneratedPayload(
            output_text=f"[{source_language}->{target_language}] {source_text} Localized for market nuance and launch timing."
        )

    async def extract_metadata(self, *, source_text: str, content_type: str) -> GeneratedPayload:
        keywords = [token.strip(".,").lower() for token in source_text.split()[:3]]
        return GeneratedPayload(
            output_text=None,
            structured_output={
                "keywords": keywords,
                "tone": "confident",
                "sentiment": "positive",
            },
        )


DEMO_PIECES = [
    DemoPiece(
        source_text="Launch the creator sprint with a homepage line that feels urgent, precise, and easy to localize.",
        context="homepage hero",
        generate_draft=False,
    ),
    DemoPiece(
        source_text="Invite the regional audience to reserve the creator toolkit before the Monday launch window opens.",
        context="crm teaser",
        review_action=ReviewActionType.ACCEPT,
    ),
    DemoPiece(
        source_text="Position the creator bundle as the fastest way for local teams to publish launch-ready stories.",
        context="paid social caption",
        review_action=ReviewActionType.REJECT,
    ),
    DemoPiece(
        source_text="Summarize the weekly creator brief so the editorial lead can review tone, hooks, and rollout timing.",
        context="workbench note",
        source_language="en",
        target_language="pt-BR",
        extract_metadata=True,
        review_action=ReviewActionType.START_REVIEW,
    ),
    DemoPiece(
        source_text="Explain how ACME Media keeps campaign voice consistent while each regional team adapts the final copy.",
        context="landing page body",
        source_language="en",
        target_language="es",
        extract_metadata=True,
    ),
]


async def seed_demo_campaign() -> tuple[str, str]:
    settings = get_settings()
    engine = build_engine(settings.database_url)
    session_factory = build_session_factory(engine)
    workflow_service = WorkflowService(ai_provider=DemoSeedProvider(), event_bus=EventBus())

    await run_migrations(engine)

    try:
        async with session_factory() as session:
            await session.execute(delete(Campaign).where(Campaign.name == DEMO_NAME))
            await session.commit()

            campaign = await workflow_service.create_campaign(
                session,
                CampaignCreate(name=DEMO_NAME, description=DEMO_DESCRIPTION),
            )

            for demo_piece in DEMO_PIECES:
                piece = await workflow_service.create_content_piece(
                    session,
                    campaign.id,
                    ContentPieceCreate(source_text=demo_piece.source_text),
                )
                draft = None
                if demo_piece.generate_draft:
                    draft = await workflow_service.generate_draft(
                        session,
                        piece.id,
                        GenerateDraftRequest(context=demo_piece.context),
                    )

                if demo_piece.source_language and demo_piece.target_language:
                    await workflow_service.translate(
                        session,
                        piece.id,
                        TranslateRequest(
                            source_language=demo_piece.source_language,
                            target_language=demo_piece.target_language,
                            context=demo_piece.context,
                        ),
                    )

                if demo_piece.extract_metadata:
                    await workflow_service.extract_metadata(session, piece.id)

                if demo_piece.review_action:
                    await workflow_service.review(
                        session,
                        piece.id,
                        ReviewRequest(
                            action=demo_piece.review_action,
                            ai_suggestion_id=(
                                draft.suggestion.id
                                if draft is not None and demo_piece.review_action != ReviewActionType.START_REVIEW
                                else None
                            ),
                            comment="Demo seed action",
                        ),
                    )

            return campaign.id, campaign.name
    finally:
        await engine.dispose()


def main() -> None:
    campaign_id, campaign_name = asyncio.run(seed_demo_campaign())
    print(f"Seeded demo campaign: {campaign_name} ({campaign_id})")


if __name__ == "__main__":
    main()
