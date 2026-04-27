from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from src.ai.providers.base import LLMResponse, LLMStreamChunk, T


def _make_response(content: str) -> LLMResponse:
    return LLMResponse(
        content=content,
        model="mock-model-v1",
        provider="mock",
        tokens_in=len(content.split()),
        tokens_out=len(content.split()),
        latency_ms=10,
        cost_usd=0.0,
    )


class MockProvider:
    name = "mock"
    default_model = "mock-model-v1"

    def __init__(self, fixtures: dict[str, str] | None = None) -> None:
        self._fixtures = fixtures or {}

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse:
        for key, val in self._fixtures.items():
            if key in prompt.lower():
                return _make_response(val)
        return _make_response(f"[mock response to: {prompt[:50]}...]")

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[LLMStreamChunk]:
        response = await self.generate(
            prompt,
            system=system,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        for word in response.content.split():
            await asyncio.sleep(0.02)
            yield LLMStreamChunk(delta=word + " ")
        yield LLMStreamChunk(delta="", is_final=True, response=response)

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
        response = await self.generate(
            prompt,
            system=system,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        parsed = schema.model_validate_json(response.content)
        return parsed, response
