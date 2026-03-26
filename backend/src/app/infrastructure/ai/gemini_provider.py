from __future__ import annotations

import httpx

from app.infrastructure.ai.base import AIProvider, GeneratedPayload
from app.infrastructure.ai.metadata_parser import parse_metadata_output
from app.infrastructure.ai.translation_parser import parse_translation_output


class GeminiProvider(AIProvider):
    provider_name = "gemini"

    def __init__(self, api_key: str, model_name: str) -> None:
        self._api_key = api_key
        self.model_name = model_name

    async def _text_completion(self, prompt: str, *, response_mime_type: str = "text/plain") -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent",
                params={"key": self._api_key},
                json={
                    "generationConfig": {"responseMimeType": response_mime_type},
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt},
                            ]
                        }
                    ]
                },
            )
            response.raise_for_status()
            payload = response.json()

        candidates = payload.get("candidates", [])
        if not candidates:
            raise ValueError("Gemini returned no candidates.")
        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [part.get("text", "") for part in parts if part.get("text")]
        output = "\n".join(text_parts).strip()
        if not output:
            raise ValueError("Gemini returned an empty response.")
        return output

    async def generate_draft(
        self, *, source_text: str, content_type: str, context: str | None
    ) -> GeneratedPayload:
        prompt = (
            "Create a concise marketing draft.\n"
            "Return the draft as plain text only.\n"
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
            "Return only the translated content as plain text.\n"
            "Preserve markdown, headings, lists, spacing, and the original content structure.\n"
            "Do not wrap the result in JSON, quotes, or code fences.\n"
            f"From: {source_language}\n"
            f"To: {target_language}\n"
            f"Source text: {source_text}\n"
            f"Extra context: {context or 'none'}"
        )
        output_text = await self._text_completion(prompt)
        return GeneratedPayload(output_text=parse_translation_output(output_text))

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
        output_text = await self._text_completion(prompt, response_mime_type="application/json")
        return GeneratedPayload(output_text=output_text, structured_output=parse_metadata_output(output_text))
