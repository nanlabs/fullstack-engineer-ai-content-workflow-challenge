from typing import Dict, Any, List
import logging

from .ai import generate_draft, translate_content, extract_metadata


logger = logging.getLogger(__name__)


class AIContentOrchestrator:
    """
    Coordinates AI tasks for campaign content workflows.

    Pipeline:
        generate draft -> translate -> extract metadata
    """

    async def run_content_pipeline(
        self,
        *,
        prompt: str,
        tone: str | None = None,
        language: str = "en",
        target_locales: List[str] | None = None,
    ) -> Dict[str, Any]:

        logger.info("Starting AI content pipeline")

        draft = await generate_draft(
            prompt=prompt,
            tone=tone,
            language=language,
        )

        logger.info("Draft generated")

        translations = {}

        if target_locales:
            for locale in target_locales:
                try:
                    translation = await translate_content(
                        text=draft,
                        source_locale=language,
                        target_locale=locale,
                    )

                    translations[locale] = translation

                except Exception as e:
                    logger.exception("Translation failed for %s", locale)
                    translations[locale] = f"[translation-error] {str(e)}"

        metadata = await extract_metadata(draft)

        logger.info("Metadata extracted")

        return {
            "draft": draft,
            "translations": translations,
            "metadata": metadata,
        }