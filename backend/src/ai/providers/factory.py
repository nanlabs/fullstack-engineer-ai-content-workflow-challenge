from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

import structlog
from fastapi import Depends

from src.ai.providers.anthropic import AnthropicProvider
from src.ai.providers.base import (
    AIProviderError,
    AIRateLimitError,
    LLMProvider,
    LLMResponse,
    LLMStreamChunk,
    T,
)
from src.ai.providers.mock import MockProvider
from src.ai.providers.openai import OpenAIProvider
from src.config import settings

logger = structlog.get_logger(__name__)


class FallbackProvider:
    def __init__(self, primary: LLMProvider, fallback: LLMProvider) -> None:
        self._primary = primary
        self._fallback = fallback
        self.name = f"{primary.name}+{fallback.name}"
        self.default_model = primary.default_model

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse:
        try:
            return await self._primary.generate(
                prompt, system=system, model=model, max_tokens=max_tokens, temperature=temperature
            )
        except (AIRateLimitError, AIProviderError) as e:
            logger.warning(
                "primary_provider_failed",
                error=str(e),
                falling_back=self._fallback.name,
            )
            return await self._fallback.generate(
                prompt, system=system, model=model, max_tokens=max_tokens, temperature=temperature
            )

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[LLMStreamChunk]:
        try:
            async for chunk in self._primary.generate_stream(
                prompt, system=system, model=model, max_tokens=max_tokens, temperature=temperature
            ):
                yield chunk
        except (AIRateLimitError, AIProviderError) as e:
            logger.warning(
                "primary_provider_failed_stream",
                error=str(e),
                falling_back=self._fallback.name,
            )
            async for chunk in self._fallback.generate_stream(
                prompt, system=system, model=model, max_tokens=max_tokens, temperature=temperature
            ):
                yield chunk

    async def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> tuple[T, LLMResponse]:
        try:
            return await self._primary.generate_structured(
                prompt,
                schema,
                system=system,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except (AIRateLimitError, AIProviderError) as e:
            logger.warning(
                "primary_provider_failed_structured",
                error=str(e),
                falling_back=self._fallback.name,
            )
            return await self._fallback.generate_structured(
                prompt,
                schema,
                system=system,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
            )


def get_provider(name: str | None = None) -> LLMProvider:
    provider_name = name or settings.default_llm_provider

    match provider_name:
        case "anthropic":
            if not settings.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY is required for anthropic provider")
            provider: LLMProvider = AnthropicProvider(api_key=settings.anthropic_api_key)
        case "openai":
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY is required for openai provider")
            provider = OpenAIProvider(api_key=settings.openai_api_key)
        case "mock":
            provider = MockProvider()
        case _:
            raise ValueError(f"Unknown provider: {provider_name}")

    if settings.enable_llm_fallback and provider_name != "mock":
        fallback = MockProvider()
        return FallbackProvider(primary=provider, fallback=fallback)

    return provider


def get_llm_provider() -> LLMProvider:
    return get_provider()


LLMProviderDep = Annotated[LLMProvider, Depends(get_llm_provider)]
