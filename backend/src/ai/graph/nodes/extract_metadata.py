from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import structlog
from langchain_core.runnables import RunnableConfig

from src.ai.graph.schemas import ContentMetadataSchema
from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.prompts.registry import registry
from src.ai.providers.factory import get_provider
from src.events.bus import get_event_bus
from src.events.topics import publish_workflow_event
from src.events.types import Event, EventType

logger = structlog.get_logger(__name__)


async def extract_metadata(state: ContentWorkflowState, config: RunnableConfig) -> dict:
    thread_id: str | None = (config.get("configurable") or {}).get("thread_id")
    campaign_id: UUID | None = UUID(state["campaign_id"]) if state.get("campaign_id") else None
    content_piece_id: UUID | None = (
        UUID(state["content_piece_id"]) if state.get("content_piece_id") else None
    )
    bus = get_event_bus()

    def _event(etype: EventType) -> Event:
        return Event(
            type=etype,
            timestamp=datetime.now(tz=UTC),
            thread_id=thread_id,
            campaign_id=campaign_id,
            content_piece_id=content_piece_id,
            payload={"node": "extract_metadata"},
        )

    await publish_workflow_event(bus, _event(EventType.WORKFLOW_NODE_STARTED))

    provider = get_provider()
    prompt = registry.render(
        "metadata_extraction",
        version=1,
        text=state["initial_draft"],
    )
    metadata, response = await provider.generate_structured(
        prompt,
        schema=ContentMetadataSchema,
        temperature=0.1,
    )
    log_llm_call(response, prompt)
    logger.info(
        "metadata_extracted",
        content_piece_id=state["content_piece_id"],
        sentiment=metadata.sentiment,
        keywords=metadata.keywords,
    )

    await publish_workflow_event(bus, _event(EventType.WORKFLOW_NODE_COMPLETED))

    return {
        "metadata": metadata.model_dump(),
        "status": "translating",
    }
