from __future__ import annotations

from app.config import Settings
from app.infrastructure.ai.base import AIProvider
from app.infrastructure.ai.gemini_provider import GeminiProvider
from app.infrastructure.ai.openai_provider import OpenAIProvider


def build_ai_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == "openai":
        return OpenAIProvider(settings.openai_api_key, settings.openai_model)
    return GeminiProvider(settings.gemini_api_key, settings.gemini_model)
