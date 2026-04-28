from __future__ import annotations

import structlog

from src.ai.graph.schemas import ContentMetadataSchema
from src.ai.graph.state import ContentWorkflowState
from src.ai.observability import log_llm_call
from src.ai.prompts.registry import registry
from src.ai.providers.factory import get_provider

logger = structlog.get_logger(__name__)


async def extract_metadata(state: ContentWorkflowState) -> dict:
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
    return {
        "metadata": metadata.model_dump(),
        "status": "translating",
    }
