# Translation Output Normalization Plan

## Summary

Fix translation handling so localized content is generated from the canonical text and stored as plain translated text, not as a serialized JSON wrapper. Also keep translation outputs out of the draft review card.

## Changes

1. Normalize translation provider outputs into plain text.
2. Prefer text/plain responses for draft/translation and JSON responses only for metadata extraction.
3. Keep translations in `translation_versions`, but exclude them from `latest_reviewable_suggestion`.
4. Preserve original canonical structure in translation prompts, including markdown and lists.

## Files

- `backend/src/app/infrastructure/ai/base.py`
- `backend/src/app/infrastructure/ai/gemini_provider.py`
- `backend/src/app/infrastructure/ai/openai_provider.py`
- `backend/src/app/application/services.py`
- `backend/tests/conftest.py`
- `backend/tests/test_ai_service.py`
- `backend/tests/test_api.py`

## Validation

- Translation responses are stored as plain text.
- Translation suggestions do not replace the draft suggestion card.
- Translation versions remain visible in the side panel.
- Markdown-style structure is preserved in translated text.
