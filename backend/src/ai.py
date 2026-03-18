import json
from typing import Optional, Dict, Any
import logging

from anthropic import Anthropic
from openai import OpenAI

from .config import get_settings


settings = get_settings()

logger = logging.getLogger(__name__)


# -----------------------------------------------------
# CLIENT FACTORIES
# -----------------------------------------------------


def get_openai_client() -> Optional[OpenAI]:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def get_anthropic_client() -> Optional[Anthropic]:
    if not settings.anthropic_api_key:
        return None
    return Anthropic(api_key=settings.anthropic_api_key)


def _preferred_provider() -> str:
    provider = (settings.ai_provider or "").strip().lower()
    if provider in {"openai", "anthropic"}:
        return provider
    return "openai"


def _has_any_ai_key() -> bool:
    return bool(settings.openai_api_key or settings.anthropic_api_key)


# -----------------------------------------------------
# CORE LLM CALL
# -----------------------------------------------------


async def _call_llm(
    *,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 500,
) -> str:
    """
    Generic wrapper to call the configured LLM provider.
    Handles provider selection, logging, and error management.
    """

    if not _has_any_ai_key():
        logger.warning("AI key not configured. Returning stub response.")
        return f"[stub] {user_prompt[:80]}"

    provider = _preferred_provider()
    logger.info("Calling LLM provider: %s", provider)

    try:
        if provider == "anthropic" and settings.anthropic_api_key:
            client = get_anthropic_client()

            if client is None:
                return "[stub] Anthropic client unavailable"

            response = client.messages.create(
                model=settings.anthropic_model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            if not response.content:
                return ""

            return getattr(response.content[0], "text", "")

        # Default → OpenAI
        client = get_openai_client()

        if client is None:
            return "[stub] OpenAI client unavailable"

        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )

        return response.choices[0].message["content"]

    except Exception as e:
        logger.exception("AI provider call failed")
        return f"[ai-error] {str(e)}"


# -----------------------------------------------------
# AI TASKS
# -----------------------------------------------------


async def generate_draft(
    *,
    prompt: str,
    tone: Optional[str] = None,
    language: Optional[str] = None,
) -> str:
    """
    Generate marketing copy draft for a campaign content piece.
    """

    system_parts = [
        "You are a marketing copywriter generating content for advertising campaigns."
    ]

    if tone:
        system_parts.append(f"Use a {tone} tone.")

    if language:
        system_parts.append(f"Write in language: {language}.")

    system_prompt = " ".join(system_parts)

    return await _call_llm(
        system_prompt=system_prompt,
        user_prompt=prompt,
        temperature=0.7,
    )


async def translate_content(
    *,
    text: str,
    source_locale: str,
    target_locale: str,
) -> str:
    """
    Generate a localization/translation suggestion for the given text.
    """

    system_prompt = (
        "You are a professional marketing translator. "
        "Translate the following content for the target locale. "
        "Keep tone and intent while adapting idioms for the local market."
    )

    user_prompt = (
        f"Source locale: {source_locale}. Target locale: {target_locale}.\n\n"
        f"Content to translate:\n{text}"
    )

    return await _call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.4,
    )


async def extract_metadata(text: str) -> Dict[str, Any]:
    """
    Extract structured information from marketing content.
    Returns keywords, tone, and sentiment.
    """

    system_prompt = (
        "You are an AI assistant that extracts structured marketing insights."
        "Return JSON only."
    )

    user_prompt = f"""
    Analyze the following marketing content and return JSON with:

    - keywords (array of important keywords)
    - tone (e.g. playful, formal, persuasive)
    - sentiment (positive, neutral, negative)

    Content:
    {text}
    """

    response = await _call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.2,
    )

    try:
        data = json.loads(response)
    except json.JSONDecodeError:
        data = {"raw": response}

    return data
