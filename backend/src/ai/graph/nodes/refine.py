from __future__ import annotations

import structlog

from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.providers.factory import get_provider

logger = structlog.get_logger(__name__)


async def refine(state: ContentWorkflowState) -> dict:
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

    return {
        "initial_draft": response.content,
        "iteration": new_iteration,
        "status": "extracting",  # re-enters the generate → extract → translate cycle
    }
