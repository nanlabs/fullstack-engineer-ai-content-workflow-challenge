# Global Provider Settings UI Plan

## Summary

Add a global AI provider configuration managed from the app through Settings and a shared modal in the editor. API keys are encrypted at rest, never returned by the API after being saved, and DB-backed settings override `.env` provider credentials.

## Changes

1. Persist encrypted provider settings in PostgreSQL.
2. Resolve the active provider dynamically from DB first, then `.env`.
3. Add `GET/PUT /settings/ai-provider`.
4. Add a real Settings screen plus a shared editor modal opened from the AI Workspace gear icon.
5. Block first AI use in the editor until a provider is configured.

## Validation

- Settings can be stored without exposing the API key.
- DB settings override environment fallback.
- Missing provider configuration opens the blocking modal in the editor.
- Saving from the modal retries the blocked AI action automatically.
