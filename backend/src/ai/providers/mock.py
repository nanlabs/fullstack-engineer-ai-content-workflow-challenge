from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from src.ai.providers.base import LLMResponse, LLMStreamChunk, T


def _mock_value_for_field(field_schema: dict[str, Any]) -> Any:
    """Return a type-appropriate mock value for a JSON Schema field definition."""
    if "enum" in field_schema:
        return field_schema["enum"][0]
    if "const" in field_schema:
        return field_schema["const"]
    field_type = field_schema.get("type")
    if field_type == "string":
        return "mock"
    if field_type == "integer":
        return 0
    if field_type == "number":
        return 0.0
    if field_type == "boolean":
        return False
    if field_type == "array":
        return []
    if field_type == "object":
        return {}
    # anyOf / oneOf — pick the first non-null option
    for combinator in ("anyOf", "oneOf"):
        if combinator in field_schema:
            for option in field_schema[combinator]:
                if option.get("type") != "null":
                    return _mock_value_for_field(option)
    return None


def _mock_instance(schema: type[T]) -> T:
    """Build a minimal valid instance from any Pydantic BaseModel schema."""
    json_schema = schema.model_json_schema()
    defs = json_schema.get("$defs", {})
    properties = json_schema.get("properties", {})
    required = set(json_schema.get("required", []))
    data: dict[str, Any] = {}
    for field_name, field_info in properties.items():
        if field_name not in required:
            continue
        # Resolve $ref if present
        if "$ref" in field_info:
            ref_name = field_info["$ref"].split("/")[-1]
            field_info = defs.get(ref_name, field_info)
        data[field_name] = _mock_value_for_field(field_info)
    return schema.model_validate(data)


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
        for key, val in self._fixtures.items():
            if key in prompt.lower():
                instance = schema.model_validate_json(val)
                return instance, _make_response(val)
        instance = _mock_instance(schema)
        response = _make_response(instance.model_dump_json())
        return instance, response
