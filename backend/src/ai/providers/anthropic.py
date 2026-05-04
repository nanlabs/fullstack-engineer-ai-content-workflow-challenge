from __future__ import annotations

import time
from collections.abc import AsyncIterator

import anthropic

from src.ai.costs import estimate_cost
from src.ai.observability import log_llm_call
from src.ai.providers.base import (
    AIProviderError,
    AIRateLimitError,
    LLMResponse,
    LLMStreamChunk,
    T,
)


class AnthropicProvider:
    name = "anthropic"
    default_model = "claude-sonnet-4-6"

    def __init__(self, api_key: str) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse:
        final_model = model or self.default_model
        kwargs: dict = {}
        if system:
            kwargs["system"] = system

        start = time.perf_counter()
        try:
            msg = await self._client.messages.create(
                model=final_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs,
            )
        except anthropic.RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except anthropic.APIError as e:
            raise AIProviderError(str(e)) from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        text = "".join(b.text for b in msg.content if b.type == "text")
        response = LLMResponse(
            content=text,
            model=msg.model,
            provider=self.name,
            tokens_in=msg.usage.input_tokens,
            tokens_out=msg.usage.output_tokens,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(msg.model, msg.usage.input_tokens, msg.usage.output_tokens),
        )
        log_llm_call(response, prompt)
        return response

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[LLMStreamChunk]:
        final_model = model or self.default_model
        kwargs: dict = {}
        if system:
            kwargs["system"] = system

        start = time.perf_counter()
        try:
            async with self._client.messages.stream(
                model=final_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs,
            ) as stream:
                async for text in stream.text_stream:
                    yield LLMStreamChunk(delta=text)

                final = await stream.get_final_message()
        except anthropic.RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except anthropic.APIError as e:
            raise AIProviderError(str(e)) from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        response = LLMResponse(
            content="".join(b.text for b in final.content if b.type == "text"),
            model=final.model,
            provider=self.name,
            tokens_in=final.usage.input_tokens,
            tokens_out=final.usage.output_tokens,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(
                final.model, final.usage.input_tokens, final.usage.output_tokens
            ),
        )
        log_llm_call(response, prompt)
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
        final_model = model or self.default_model
        tool = {
            "name": "extract",
            "description": "Extract structured data",
            "input_schema": schema.model_json_schema(),
        }
        messages: list[dict] = [{"role": "user", "content": prompt}]
        kwargs: dict = {}
        if system:
            kwargs["system"] = system

        start = time.perf_counter()
        try:
            msg = await self._client.messages.create(
                model=final_model,
                tools=[tool],
                tool_choice={"type": "tool", "name": "extract"},
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs,
            )
        except anthropic.RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except anthropic.APIError as e:
            raise AIProviderError(str(e)) from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        tool_use = next(b for b in msg.content if b.type == "tool_use")
        parsed = schema.model_validate(tool_use.input)
        response = LLMResponse(
            content=str(tool_use.input),
            model=msg.model,
            provider=self.name,
            tokens_in=msg.usage.input_tokens,
            tokens_out=msg.usage.output_tokens,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(msg.model, msg.usage.input_tokens, msg.usage.output_tokens),
        )
        log_llm_call(response, prompt)
        return parsed, response
