from __future__ import annotations

import time
from collections.abc import AsyncIterator

import openai

from src.ai.costs import estimate_cost
from src.ai.observability import log_llm_call
from src.ai.providers.base import (
    AIProviderError,
    AIRateLimitError,
    LLMResponse,
    LLMStreamChunk,
    T,
)


class OpenAIProvider:
    name = "openai"
    default_model = "gpt-5.3-instant"

    def __init__(self, api_key: str) -> None:
        self._client = openai.AsyncOpenAI(api_key=api_key)

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
        messages: list[dict] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()
        try:
            completion = await self._client.chat.completions.create(
                model=final_model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except openai.RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except openai.APIError as e:
            raise AIProviderError(str(e)) from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        tokens_in = completion.usage.prompt_tokens if completion.usage else 0
        tokens_out = completion.usage.completion_tokens if completion.usage else 0
        response = LLMResponse(
            content=completion.choices[0].message.content or "",
            model=completion.model,
            provider=self.name,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(completion.model, tokens_in, tokens_out),
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
        messages: list[dict] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()
        content_parts: list[str] = []
        tokens_in = 0
        tokens_out = 0

        try:
            stream = await self._client.chat.completions.create(
                model=final_model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
                stream_options={"include_usage": True},
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta = chunk.choices[0].delta.content
                    content_parts.append(delta)
                    yield LLMStreamChunk(delta=delta)
                if chunk.usage:
                    tokens_in = chunk.usage.prompt_tokens
                    tokens_out = chunk.usage.completion_tokens
                if chunk.model:
                    final_model = chunk.model
        except openai.RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except openai.APIError as e:
            raise AIProviderError(str(e)) from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        response = LLMResponse(
            content="".join(content_parts),
            model=final_model,
            provider=self.name,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(final_model, tokens_in, tokens_out),
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
        messages: list[dict] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()
        try:
            completion = await self._client.chat.completions.create(
                model=final_model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": schema.__name__,
                        "schema": schema.model_json_schema(),
                        "strict": True,
                    },
                },
            )
        except openai.RateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except openai.APIError as e:
            raise AIProviderError(str(e)) from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        content = completion.choices[0].message.content or ""
        tokens_in = completion.usage.prompt_tokens if completion.usage else 0
        tokens_out = completion.usage.completion_tokens if completion.usage else 0
        parsed = schema.model_validate_json(content)
        response = LLMResponse(
            content=content,
            model=completion.model,
            provider=self.name,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(completion.model, tokens_in, tokens_out),
        )
        log_llm_call(response, prompt)
        return parsed, response
