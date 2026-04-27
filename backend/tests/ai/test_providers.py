"""Tests for AI provider implementations, factory, and fallback."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.ai.providers.anthropic import AnthropicProvider
from src.ai.providers.base import AIProviderError, AIRateLimitError, LLMResponse
from src.ai.providers.factory import FallbackProvider, get_provider
from src.ai.providers.mock import MockProvider
from src.ai.providers.openai import OpenAIProvider

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
