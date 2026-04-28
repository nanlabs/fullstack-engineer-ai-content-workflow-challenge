from __future__ import annotations

import structlog
from langgraph.types import Send

from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.prompts.registry import registry
from src.ai.providers.factory import get_provider

logger = structlog.get_logger(__name__)


async def translate_to_language(state: dict) -> dict:
    """Per-language translation node — receives a sub-state from Send fan-out."""
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
