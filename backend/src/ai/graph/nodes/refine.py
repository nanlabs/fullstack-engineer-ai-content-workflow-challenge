from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import structlog
from langchain_core.runnables import RunnableConfig

from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.providers.factory import get_provider
from src.events.bus import get_event_bus
from src.events.topics import publish_workflow_event
from src.events.types import Event, EventType

logger = structlog.get_logger(__name__)


async def refine(state: ContentWorkflowState, config: RunnableConfig) -> dict:
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
            payload={"node": "refine"},
        )

    await publish_workflow_event(bus, _event(EventType.WORKFLOW_NODE_STARTED))

    feedback = state["pending_feedback"]
    provider = get_provider()

    notes = (feedback or {}).get("notes") or "(no specific feedback)"
    refine_prompt = (
        f"Previous draft:\n{state['initial_draft']}\n\n"
        f"User feedback: {notes}\n\n"
        f"Generate an improved draft that addresses this feedback. "
        f"Return ONLY the revised copy, no explanations."
    )

    response = await provider.generate(refine_prompt, temperature=0.7)
    log_llm_call(response, refine_prompt)

    new_iteration = state["iteration"] + 1
    logger.info(
        "draft_refined",
        content_piece_id=state["content_piece_id"],
        iteration=new_iteration,
    )

    await publish_workflow_event(bus, _event(EventType.WORKFLOW_NODE_COMPLETED))

    return {
        "initial_draft": response.content,
        "iteration": new_iteration,
        "status": "extracting",
    }
