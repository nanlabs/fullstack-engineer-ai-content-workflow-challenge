from __future__ import annotations

import structlog

from src.ai.providers.base import LLMResponse

logger = structlog.get_logger(__name__)


def log_llm_call(response: LLMResponse, prompt: str) -> None:
    logger.info(
        "llm_call",
        provider=response.provider,
        model=response.model,
        tokens_in=response.tokens_in,
        tokens_out=response.tokens_out,
        latency_ms=response.latency_ms,
        cost_usd=response.cost_usd,
        prompt_preview=prompt[:100],
    )
