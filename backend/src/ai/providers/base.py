from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    cost_usd: float
    raw: dict[str, Any] | None = None


@dataclass
class LLMStreamChunk:
    delta: str
    is_final: bool = False
    response: LLMResponse | None = None


class AIProviderError(Exception):
    pass


class AIRateLimitError(AIProviderError):
    pass


class LLMProvider(Protocol):
    name: str
    default_model: str

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse: ...

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[LLMStreamChunk]: ...

    async def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> tuple[T, LLMResponse]: ...
