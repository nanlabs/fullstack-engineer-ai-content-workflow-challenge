from __future__ import annotations

import structlog

from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.prompts.registry import registry
from src.ai.providers.factory import get_provider

logger = structlog.get_logger(__name__)


async def generate_draft(state: ContentWorkflowState) -> dict:
    provider = get_provider()
    prompt = registry.render(
        f"{state['content_type']}_generation",
        version=1,
        brief=state["brief"],
        content_type=state["content_type"],
        language=state["source_language"],
        source_text=state.get("source_text") or "(none)",
    )
    response = await provider.generate(prompt, temperature=0.8)
    log_llm_call(response, prompt)
    logger.info(
        "draft_generated",
        content_piece_id=state["content_piece_id"],
        draft_length=len(response.content),
    )
    return {
        "initial_draft": response.content,
        "status": "extracting",
    }
