"""Tests for AI provider implementations, factory, and fallback."""

from __future__ import annotations

import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import BaseModel

from src.ai.providers.anthropic import AnthropicProvider
from src.ai.providers.base import AIProviderError, AIRateLimitError, LLMResponse
from src.ai.providers.factory import FallbackProvider, get_llm_provider, get_provider
from src.ai.providers.mock import MockProvider
from src.ai.providers.openai import OpenAIProvider


class _SimpleSchema(BaseModel):
    value: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_http_response(status_code: int = 429) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.request = MagicMock()
    return resp


def _make_anthropic_message(
    text: str = "Hello", model: str = "claude-3-5-sonnet-20241022"
) -> MagicMock:
    block = MagicMock()
    block.type = "text"
    block.text = text
    msg = MagicMock()
    msg.content = [block]
    msg.model = model
    msg.usage.input_tokens = 10
    msg.usage.output_tokens = 5
    return msg


def _make_openai_completion(content: str = "Hello", model: str = "gpt-4o") -> MagicMock:
    completion = MagicMock()
    completion.choices[0].message.content = content
    completion.model = model
    completion.usage.prompt_tokens = 10
    completion.usage.completion_tokens = 5
    return completion


# ---------------------------------------------------------------------------
# Anthropic provider
# ---------------------------------------------------------------------------


async def test_anthropic_provider_generate() -> None:
    provider = AnthropicProvider(api_key="test-key")
    mock_msg = _make_anthropic_message("Hello from Anthropic")

    with patch.object(provider._client.messages, "create", new=AsyncMock(return_value=mock_msg)):
        response = await provider.generate("Say hello")

    assert isinstance(response, LLMResponse)
    assert response.content == "Hello from Anthropic"
    assert response.provider == "anthropic"
    assert response.model == "claude-3-5-sonnet-20241022"
    assert response.tokens_in == 10
    assert response.tokens_out == 5
    assert response.latency_ms >= 0
    assert response.cost_usd >= 0.0


async def test_anthropic_provider_handles_rate_limit() -> None:
    import anthropic as anthropic_sdk

    provider = AnthropicProvider(api_key="test-key")
    exc = anthropic_sdk.RateLimitError(
        "rate limited", response=_make_mock_http_response(429), body={}
    )

    with patch.object(provider._client.messages, "create", new=AsyncMock(side_effect=exc)):
        with pytest.raises(AIRateLimitError):
            await provider.generate("Say hello")


async def test_anthropic_provider_handles_api_error() -> None:
    import anthropic as anthropic_sdk

    provider = AnthropicProvider(api_key="test-key")
    exc = anthropic_sdk.APIStatusError(
        "server error", response=_make_mock_http_response(500), body={}
    )

    with patch.object(provider._client.messages, "create", new=AsyncMock(side_effect=exc)):
        with pytest.raises(AIProviderError):
            await provider.generate("Say hello")


# ---------------------------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------------------------


async def test_openai_provider_generate() -> None:
    provider = OpenAIProvider(api_key="test-key")
    mock_completion = _make_openai_completion("Hello from OpenAI")

    with patch.object(
        provider._client.chat.completions, "create", new=AsyncMock(return_value=mock_completion)
    ):
        response = await provider.generate("Say hello")

    assert isinstance(response, LLMResponse)
    assert response.content == "Hello from OpenAI"
    assert response.provider == "openai"
    assert response.model == "gpt-4o"
    assert response.tokens_in == 10
    assert response.tokens_out == 5


async def test_openai_provider_handles_rate_limit() -> None:
    import openai as openai_sdk

    provider = OpenAIProvider(api_key="test-key")
    exc = openai_sdk.RateLimitError("rate limited", response=_make_mock_http_response(429), body={})

    with patch.object(provider._client.chat.completions, "create", new=AsyncMock(side_effect=exc)):
        with pytest.raises(AIRateLimitError):
            await provider.generate("Say hello")


async def test_openai_provider_handles_api_error() -> None:
    import openai as openai_sdk

    provider = OpenAIProvider(api_key="test-key")
    exc = openai_sdk.APIStatusError("server error", response=_make_mock_http_response(500), body={})

    with patch.object(provider._client.chat.completions, "create", new=AsyncMock(side_effect=exc)):
        with pytest.raises(AIProviderError):
            await provider.generate("Say hello")


# ---------------------------------------------------------------------------
# Mock provider
# ---------------------------------------------------------------------------


async def test_mock_provider_returns_fixtures() -> None:
    provider = MockProvider(fixtures={"hello": "Hi there!"})
    response = await provider.generate("Say hello to the world")

    assert response.content == "Hi there!"
    assert response.provider == "mock"
    assert response.model == "mock-model-v1"
    assert response.cost_usd == 0.0


async def test_mock_provider_returns_generic_when_no_fixture_matches() -> None:
    provider = MockProvider(fixtures={"hello": "Hi!"})
    response = await provider.generate("Tell me a story")

    assert "[mock response to:" in response.content


async def test_mock_provider_stream_yields_chunks() -> None:
    provider = MockProvider(fixtures={"test": "one two three"})
    chunks = []

    async for chunk in provider.generate_stream("test prompt"):
        chunks.append(chunk)

    non_final = [c for c in chunks if not c.is_final]
    final_chunks = [c for c in chunks if c.is_final]

    assert len(non_final) == 3  # "one", "two", "three"
    assert len(final_chunks) == 1
    assert final_chunks[0].response is not None
    assert final_chunks[0].response.content == "one two three"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def test_factory_returns_mock_provider() -> None:
    provider = get_provider("mock")
    assert isinstance(provider, MockProvider)
    assert provider.name == "mock"


def test_factory_returns_anthropic_provider() -> None:
    with patch("src.ai.providers.factory.settings") as mock_settings:
        mock_settings.anthropic_api_key = "test-key"
        mock_settings.enable_llm_fallback = False
        provider = get_provider("anthropic")
    assert isinstance(provider, AnthropicProvider)


def test_factory_returns_openai_provider() -> None:
    with patch("src.ai.providers.factory.settings") as mock_settings:
        mock_settings.openai_api_key = "test-key"
        mock_settings.enable_llm_fallback = False
        provider = get_provider("openai")
    assert isinstance(provider, OpenAIProvider)


def test_factory_raises_on_unknown_provider() -> None:
    with pytest.raises(ValueError, match="Unknown provider"):
        get_provider("does-not-exist")


def test_factory_wraps_with_fallback_when_enabled() -> None:
    with patch("src.ai.providers.factory.settings") as mock_settings:
        mock_settings.anthropic_api_key = "test-key"
        mock_settings.enable_llm_fallback = True
        provider = get_provider("anthropic")
    assert isinstance(provider, FallbackProvider)


# ---------------------------------------------------------------------------
# FallbackProvider
# ---------------------------------------------------------------------------


async def test_fallback_on_primary_error() -> None:
    primary = MockProvider(fixtures={"anything": "primary"})
    fallback = MockProvider(fixtures={"anything": "fallback response used"})

    # Force primary to raise on generate
    primary.generate = AsyncMock(side_effect=AIRateLimitError("too many requests"))  # type: ignore[method-assign]

    wrapper = FallbackProvider(primary=primary, fallback=fallback)
    response = await wrapper.generate("anything")

    assert response.content == "fallback response used"


async def test_fallback_uses_primary_when_healthy() -> None:
    primary = MockProvider(fixtures={"test": "primary response"})
    fallback = MockProvider(fixtures={"test": "should not be used"})

    wrapper = FallbackProvider(primary=primary, fallback=fallback)
    response = await wrapper.generate("test prompt")

    assert response.content == "primary response"


async def test_fallback_stream_falls_back_on_primary_error() -> None:
    primary = MockProvider(fixtures={"test": "should fail"})
    fallback = MockProvider(fixtures={"test": "fallback stream content"})

    async def _fail_stream(*args: object, **kwargs: object):  # type: ignore[return]
        raise AIRateLimitError("rate limited")
        yield  # make it a generator

    primary.generate_stream = _fail_stream  # type: ignore[method-assign]

    wrapper = FallbackProvider(primary=primary, fallback=fallback)
    chunks = [chunk async for chunk in wrapper.generate_stream("test prompt")]
    final = [c for c in chunks if c.is_final]

    assert len(final) == 1
    assert final[0].response is not None


async def test_fallback_stream_uses_primary_when_healthy() -> None:
    primary = MockProvider(fixtures={"test": "primary stream"})
    fallback = MockProvider(fixtures={"test": "should not be used"})

    wrapper = FallbackProvider(primary=primary, fallback=fallback)
    chunks = [chunk async for chunk in wrapper.generate_stream("test prompt")]
    final = [c for c in chunks if c.is_final]

    assert len(final) == 1


async def test_fallback_structured_falls_back_on_primary_error() -> None:
    primary = MockProvider(fixtures={"test": json.dumps({"value": "primary"})})
    fallback = MockProvider(fixtures={"test": json.dumps({"value": "fallback"})})

    async def _fail_structured(*args: object, **kwargs: object) -> object:
        raise AIProviderError("api error")

    primary.generate_structured = _fail_structured  # type: ignore[method-assign]

    wrapper = FallbackProvider(primary=primary, fallback=fallback)
    result, _resp = await wrapper.generate_structured("test prompt", _SimpleSchema)

    assert result.value == "fallback"


async def test_fallback_structured_uses_primary_when_healthy() -> None:
    primary = MockProvider(fixtures={"test": json.dumps({"value": "primary"})})
    fallback = MockProvider(fixtures={"test": json.dumps({"value": "should not be used"})})

    wrapper = FallbackProvider(primary=primary, fallback=fallback)
    result, _resp = await wrapper.generate_structured("test prompt", _SimpleSchema)

    assert result.value == "primary"


# ---------------------------------------------------------------------------
# AnthropicProvider — generate_stream and generate_structured
# ---------------------------------------------------------------------------


async def test_anthropic_provider_generate_with_system_prompt() -> None:
    provider = AnthropicProvider(api_key="test-key")
    mock_msg = _make_anthropic_message("System-aware response")

    with patch.object(
        provider._client.messages, "create", new=AsyncMock(return_value=mock_msg)
    ) as mock_create:
        await provider.generate("Say hello", system="You are helpful")

    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs.get("system") == "You are helpful"


async def test_anthropic_provider_generate_stream_yields_chunks() -> None:
    provider = AnthropicProvider(api_key="test-key")
    final_msg = _make_anthropic_message("Hello world")

    async def _text_gen():
        yield "Hello"
        yield " world"

    mock_stream = MagicMock()
    mock_stream.text_stream = _text_gen()
    mock_stream.get_final_message = AsyncMock(return_value=final_msg)

    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_cm.__aexit__ = AsyncMock(return_value=False)

    with patch.object(provider._client.messages, "stream", return_value=mock_cm):
        chunks = [chunk async for chunk in provider.generate_stream("Say hello")]

    non_final = [c for c in chunks if not c.is_final]
    final_chunks = [c for c in chunks if c.is_final]

    assert len(non_final) == 2
    assert len(final_chunks) == 1
    assert final_chunks[0].response is not None
    assert final_chunks[0].response.provider == "anthropic"


async def test_anthropic_provider_generate_stream_raises_on_rate_limit() -> None:
    import anthropic as anthropic_sdk

    provider = AnthropicProvider(api_key="test-key")
    exc = anthropic_sdk.RateLimitError(
        "rate limited", response=_make_mock_http_response(429), body={}
    )

    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(side_effect=exc)
    mock_cm.__aexit__ = AsyncMock(return_value=False)

    with patch.object(provider._client.messages, "stream", return_value=mock_cm):
        with pytest.raises(AIRateLimitError):
            async for _ in provider.generate_stream("Say hello"):
                pass


async def test_anthropic_provider_generate_structured_returns_parsed_model() -> None:
    provider = AnthropicProvider(api_key="test-key")

    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.input = {"value": "extracted_value"}

    msg = MagicMock()
    msg.content = [tool_block]
    msg.model = "claude-3-5-sonnet-20241022"
    msg.usage.input_tokens = 15
    msg.usage.output_tokens = 8

    with patch.object(provider._client.messages, "create", new=AsyncMock(return_value=msg)):
        result, response = await provider.generate_structured("Extract data", _SimpleSchema)

    assert isinstance(result, _SimpleSchema)
    assert result.value == "extracted_value"
    assert response.tokens_in == 15
    assert response.provider == "anthropic"


async def test_anthropic_provider_generate_structured_raises_on_api_error() -> None:
    import anthropic as anthropic_sdk

    provider = AnthropicProvider(api_key="test-key")
    exc = anthropic_sdk.APIStatusError(
        "server error", response=_make_mock_http_response(500), body={}
    )

    with patch.object(provider._client.messages, "create", new=AsyncMock(side_effect=exc)):
        with pytest.raises(AIProviderError):
            await provider.generate_structured("Extract", _SimpleSchema)


# ---------------------------------------------------------------------------
# OpenAIProvider — generate_stream and generate_structured
# ---------------------------------------------------------------------------


async def test_openai_provider_generate_with_system_prompt() -> None:
    provider = OpenAIProvider(api_key="test-key")
    mock_completion = _make_openai_completion("System response")

    with patch.object(
        provider._client.chat.completions, "create", new=AsyncMock(return_value=mock_completion)
    ) as mock_create:
        await provider.generate("Say hello", system="You are helpful")

    messages_arg = mock_create.call_args.kwargs["messages"]
    assert messages_arg[0]["role"] == "system"
    assert messages_arg[0]["content"] == "You are helpful"


async def test_openai_provider_generate_stream_yields_chunks() -> None:
    provider = OpenAIProvider(api_key="test-key")

    chunk1 = MagicMock()
    chunk1.choices = [MagicMock(delta=MagicMock(content="Hello "))]
    chunk1.usage = None
    chunk1.model = None

    chunk2 = MagicMock()
    chunk2.choices = []
    chunk2.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
    chunk2.model = "gpt-4o"

    async def _stream():
        yield chunk1
        yield chunk2

    with patch.object(
        provider._client.chat.completions, "create", new=AsyncMock(return_value=_stream())
    ):
        chunks = [chunk async for chunk in provider.generate_stream("Say hello")]

    non_final = [c for c in chunks if not c.is_final]
    final_chunks = [c for c in chunks if c.is_final]

    assert len(non_final) == 1
    assert final_chunks[0].response.tokens_in == 10
    assert final_chunks[0].response.provider == "openai"


async def test_openai_provider_generate_stream_raises_on_rate_limit() -> None:
    import openai as openai_sdk

    provider = OpenAIProvider(api_key="test-key")
    exc = openai_sdk.RateLimitError("rate limited", response=_make_mock_http_response(429), body={})

    async def _fail_stream():
        raise exc
        yield  # make it a generator

    with patch.object(
        provider._client.chat.completions, "create", new=AsyncMock(return_value=_fail_stream())
    ):
        with pytest.raises(AIRateLimitError):
            async for _ in provider.generate_stream("Say hello"):
                pass


async def test_openai_provider_generate_structured_returns_parsed_model() -> None:
    provider = OpenAIProvider(api_key="test-key")

    completion = MagicMock()
    completion.choices[0].message.content = json.dumps({"value": "openai_extracted"})
    completion.model = "gpt-4o"
    completion.usage.prompt_tokens = 12
    completion.usage.completion_tokens = 6

    with patch.object(
        provider._client.chat.completions, "create", new=AsyncMock(return_value=completion)
    ):
        result, response = await provider.generate_structured("Extract", _SimpleSchema)

    assert isinstance(result, _SimpleSchema)
    assert result.value == "openai_extracted"
    assert response.tokens_in == 12
    assert response.provider == "openai"


async def test_openai_provider_generate_structured_raises_on_api_error() -> None:
    import openai as openai_sdk

    provider = OpenAIProvider(api_key="test-key")
    exc = openai_sdk.APIStatusError("server error", response=_make_mock_http_response(500), body={})

    with patch.object(provider._client.chat.completions, "create", new=AsyncMock(side_effect=exc)):
        with pytest.raises(AIProviderError):
            await provider.generate_structured("Extract", _SimpleSchema)


# ---------------------------------------------------------------------------
# Factory — missing key errors and get_llm_provider
# ---------------------------------------------------------------------------


def test_factory_raises_when_anthropic_key_missing() -> None:
    with patch("src.ai.providers.factory.settings") as mock_settings:
        mock_settings.anthropic_api_key = None
        mock_settings.enable_llm_fallback = False
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            get_provider("anthropic")


def test_factory_raises_when_openai_key_missing() -> None:
    with patch("src.ai.providers.factory.settings") as mock_settings:
        mock_settings.openai_api_key = None
        mock_settings.enable_llm_fallback = False
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            get_provider("openai")


def test_get_llm_provider_returns_mock_by_default() -> None:
    with patch("src.ai.providers.factory.settings") as mock_settings:
        mock_settings.default_llm_provider = "mock"
        mock_settings.enable_llm_fallback = False
        provider = get_llm_provider()
    assert isinstance(provider, MockProvider)


# ---------------------------------------------------------------------------
# Optional real-LLM tests (skipped in CI — run with RUN_REAL_LLM_TESTS=1)
# ---------------------------------------------------------------------------


@pytest.mark.real_llm
async def test_anthropic_provider_real_call() -> None:
    if not os.getenv("RUN_REAL_LLM_TESTS"):
        pytest.skip("set RUN_REAL_LLM_TESTS=1 to run")
    provider = AnthropicProvider(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    response = await provider.generate("Say 'hi' in one word.", max_tokens=10)
    assert response.tokens_in > 0
    assert response.tokens_out > 0
    assert response.cost_usd >= 0
