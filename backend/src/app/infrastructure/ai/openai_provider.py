from __future__ import annotations

import json

from openai import AsyncOpenAI

from app.infrastructure.ai.base import AIProvider, GeneratedPayload


class OpenAIProvider(AIProvider):
    provider_name = "openai"

    def __init__(self, api_key: str, model_name: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self.model_name = model_name

    async def _text_completion(self, prompt: str) -> str:
        response = await self._client.responses.create(
            model=self.model_name,
            input=prompt,
        )
        return response.output_text.strip()

    async def generate_draft(
        self, *, source_text: str, content_type: str, context: str | None
    ) -> GeneratedPayload:
        prompt = (
            "Create a concise marketing draft.\n"
            f"Content type: {content_type}\n"
            f"Source text: {source_text}\n"
            f"Extra context: {context or 'none'}"
        )
        return GeneratedPayload(output_text=await self._text_completion(prompt))

    async def translate(
        self,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        context: str | None,
    ) -> GeneratedPayload:
        prompt = (
            "Translate and localize the content while keeping the intent intact.\n"
            f"From: {source_language}\n"
            f"To: {target_language}\n"
            f"Source text: {source_text}\n"
            f"Extra context: {context or 'none'}"
        )
        return GeneratedPayload(output_text=await self._text_completion(prompt))

    async def extract_metadata(self, *, source_text: str, content_type: str) -> GeneratedPayload:
        prompt = (
            "Analyze the canonical marketing/editorial copy and extract JSON metadata.\n"
            "Return valid JSON only.\n"
            "Use these keys exactly: keywords, tone, sentiment, audience, goal, campaign_theme, channel_fit, cta_strength.\n"
            "Keep keywords short and useful. Infer audience, goal, theme, and channel fit from the text itself.\n"
            "Set cta_strength to one of: low, medium, high.\n"
            f"Content type: {content_type}\n"
            f"Source text: {source_text}"
        )
        output_text = await self._text_completion(prompt)
        return GeneratedPayload(output_text=output_text, structured_output=json.loads(output_text))
