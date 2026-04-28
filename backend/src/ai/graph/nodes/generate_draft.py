from __future__ import annotations

import time
from datetime import UTC, datetime
from uuid import UUID

import structlog
from langchain_core.runnables import RunnableConfig

from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.prompts.registry import registry
from src.ai.providers.factory import get_provider
from src.events.bus import get_event_bus
from src.events.topics import publish_workflow_event
from src.events.types import Event, EventType

logger = structlog.get_logger(__name__)

_BUFFER_CHARS = 20
_BUFFER_SECS = 0.05


async def generate_draft(
    state: ContentWorkflowState,
    config: RunnableConfig,
) -> dict:
    provider = get_provider()
    prompt = registry.render(
        f"{state['content_type']}_generation",
        version=1,
        brief=state["brief"],
        content_type=state["content_type"],
        language=state["source_language"],
        source_text=state.get("source_text") or "(none)",
    )

    thread_id: str | None = (config.get("configurable") or {}).get("thread_id")
    campaign_id: UUID | None = UUID(state["campaign_id"]) if state.get("campaign_id") else None
    content_piece_id: UUID | None = (
        UUID(state["content_piece_id"]) if state.get("content_piece_id") else None
    )
    bus = get_event_bus()

    def _make_event(etype: EventType, payload: dict) -> Event:
        return Event(
            type=etype,
            timestamp=datetime.now(tz=UTC),
            thread_id=thread_id,
            campaign_id=campaign_id,
            content_piece_id=content_piece_id,
            payload=payload,
        )

    full_text = ""
    buffer = ""
    last_flush = time.monotonic()

    async for chunk in provider.generate_stream(prompt, temperature=0.8):
        if chunk.is_final:
            if buffer:
                await publish_workflow_event(
                    bus,
                    _make_event(
                        EventType.WORKFLOW_TOKENS,
                        {"node": "generate_draft", "delta": buffer},
                    ),
                )
            if chunk.response:
                log_llm_call(chunk.response, prompt)
            await publish_workflow_event(
                bus,
                _make_event(EventType.WORKFLOW_NODE_COMPLETED, {"node": "generate_draft"}),
            )
            break

        full_text += chunk.delta
        buffer += chunk.delta

        if len(buffer) >= _BUFFER_CHARS or time.monotonic() - last_flush >= _BUFFER_SECS:
            await publish_workflow_event(
                bus,
                _make_event(
                    EventType.WORKFLOW_TOKENS,
                    {"node": "generate_draft", "delta": buffer},
                ),
            )
            buffer = ""
            last_flush = time.monotonic()

    logger.info(
        "draft_generated",
        content_piece_id=state["content_piece_id"],
        draft_length=len(full_text),
    )
    return {
        "initial_draft": full_text,
        "status": "extracting",
    }
