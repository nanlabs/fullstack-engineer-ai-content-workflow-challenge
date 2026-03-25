# Gemini-First Draft Flow Simplification

## Summary

Tighten the editor around one primary AI workflow: `Generate Draft` from the current canonical text. Keep `Translate` and `Extract Metadata` active, but remove the extra `Refine with AI` branch and simplify the AI suggestion card to only `Accept` and `Reject`.

At the provider layer, move from OpenAI-only to a provider factory with `Gemini` as the default and `OpenAI` selectable by environment. This keeps the app immediately testable with Gemini while preserving the same workflow contract for OpenAI later.

## Key Changes

### Editor flow

- Remove the `Refine with AI` button from the editor.
- Keep the main AI action bar to:
  - `Generate Draft`
  - `Translate/Localize`
  - `Extract Metadata`
- Keep canonical text editing as the primary manual editing surface.
- Keep `Generate Draft` wired to the current `canonical text`, not the original base text.
- Simplify the AI suggestion card to:
  - `Accept`
  - `Reject`
- Remove the suggestion-level `Edit` action from the card.
- Do not expose the current review `edit` workflow in the main editor UI for this iteration.
- Keep translation launched from the existing modal.

### Translation history

- Treat translations as parallel versions, not as replacements for the canonical original.
- Preserve the original canonical text when a translation is generated.
- Add a minimal translation history in the right-side panel:
  - target language
  - source language
  - translated text preview
  - created timestamp
- Translation history should be read-only in this iteration:
  - generate and list versions
  - do not replace canonical text through translation acceptance
- Keep `Accept/Reject` focused on the draft suggestion card only.

### Backend and provider architecture

- Keep the existing provider abstraction, but add a provider factory that selects by env.
- Add `GeminiProvider` as the default implementation.
- Keep `OpenAIProvider` as the secondary selectable implementation.
- Add config fields such as:
  - `AI_PROVIDER=gemini|openai`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- App startup should fail fast if the selected provider is missing its required API key.
- `generate_draft`, `translate`, and `extract_metadata` should all go through the selected provider.

### Data model and API shape

- Keep the existing endpoints.
- Extend persisted translation data so each translation suggestion carries its own language pair instead of relying only on the content piece record.
- Minimum safe change:
  - add nullable `source_language` and `target_language` to `ai_suggestions`
  - set them for `translate` operations
- Extend `ContentPieceResponse` with a `translation_versions` list derived from translate suggestions.
- Each translation version should include:
  - `id`
  - `output_text`
  - `source_language`
  - `target_language`
  - `status`
  - `created_at`
- Keep `latest_reviewable_suggestion` for the draft suggestion card.
- Keep `latest_metadata` for the metadata panel.
- Do not change the review endpoint contract in this iteration; only the editor UI stops surfacing the suggestion `edit` path.

### UI fidelity updates

- Keep the current Stitch-based screen structure for:
  - `Campaign Content List v2`
  - `Content Piece Editor v2`
- On the editor screen:
  - update the AI action row to remove `Refine with AI`
  - update the suggestion card actions to only `Accept` and `Reject`
  - use the right panel to show translation history alongside metadata/context
- Keep the visual language already aligned to Stitch; this pass is about workflow simplification and provider readiness, not another layout redesign.

### Documentation

- Update `.env.example` and `README.md` to document Gemini-first setup and provider switching.
- Record this plan under `docs/plans/` when implementing.

## Public Interfaces

- New env/config interface:
  - `AI_PROVIDER`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- `ContentPieceResponse` gains:
  - `translation_versions: TranslationVersionResponse[]`
- `TranslationVersionResponse` should expose:
  - `id`
  - `output_text`
  - `source_language`
  - `target_language`
  - `status`
  - `created_at`

## Test Plan

### Backend

- Provider factory selects Gemini by default when configured.
- Provider factory selects OpenAI when `AI_PROVIDER=openai`.
- Startup/config fails when the selected provider key is missing.
- `generate_draft` uses the canonical text as provider input.
- `translate` persists a translation version with its language pair.
- `extract_metadata` still validates and persists structured metadata.
- `ContentPieceResponse.translation_versions` returns only translate suggestions.

### Frontend

- Editor no longer renders `Refine with AI`.
- AI suggestion card renders only `Accept` and `Reject`.
- Translation history appears in the right panel after a translation is generated.
- Canonical text remains unchanged after translation generation.
- Draft generation still refreshes the suggestion card correctly.
- Metadata still renders in the right panel.

### Manual scenarios

- Run with `Gemini` selected in env and generate a draft successfully.
- Translate the same piece and confirm:
  - the translation appears in right-panel history
  - canonical text remains the original canonical version
- Extract metadata and confirm it still appears in the metadata panel.
- Switch env to `OpenAI` and confirm the same flows still run through the selected provider.
- Accept and reject draft suggestions from the simplified card.

## Assumptions

- `Generate Draft`, `Translate`, and `Extract Metadata` all remain real provider-backed features.
- The editor-level `Edit` action is intentionally removed from the main suggestion card UX for now.
- Translation history is minimal and read-only in this pass.
- Draft review remains the only place where `Accept/Reject` is surfaced in the main editor flow.
- Gemini is the default runtime provider, OpenAI remains a supported fallback via env selection.
