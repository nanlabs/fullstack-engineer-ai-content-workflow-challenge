from __future__ import annotations

from datetime import UTC, datetime

import structlog
from langchain_core.runnables import RunnableConfig
from langgraph.types import Send

from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.prompts.registry import registry
from src.ai.providers.factory import get_provider
from src.events.bus import get_event_bus
from src.events.topics import publish_workflow_event
from src.events.types import Event, EventType

logger = structlog.get_logger(__name__)


async def translate_to_language(state: dict, config: RunnableConfig) -> dict:
    """Per-language translation node — receives a sub-state from Send fan-out."""
    thread_id: str | None = (config.get("configurable") or {}).get("thread_id")
    bus = get_event_bus()

    def _event(etype: EventType) -> Event:
        return Event(
            type=etype,
            timestamp=datetime.now(tz=UTC),
            thread_id=thread_id,
            payload={"node": "translate_to_language", "language": state["target_language"]},
        )

    await publish_workflow_event(bus, _event(EventType.WORKFLOW_NODE_STARTED))

    provider = get_provider()
    prompt = registry.render(
        "translation",
        version=1,
        text=state["text"],
        source_language=state["source_language"],
        target_language=state["target_language"],
    )
    response = await provider.generate(prompt, temperature=0.3)
    log_llm_call(response, prompt)
    logger.info(
        "translation_done",
        target_language=state["target_language"],
        length=len(response.content),
    )

    await publish_workflow_event(bus, _event(EventType.WORKFLOW_NODE_COMPLETED))

    return {
        "translations": [
            {
                "language": state["target_language"],
                "content": response.content,
                "draft_id": None,
            }
        ],
    }


def fan_out_translations(state: ContentWorkflowState) -> list[Send]:
    """Conditional edge: fans out one Send per target language for parallel execution."""
    return [
        Send(
            "translate_to_language",
            {
                "text": state["initial_draft"],
                "source_language": state["source_language"],
                "target_language": lang,
            },
        )
        for lang in state["target_languages"]
    ]
