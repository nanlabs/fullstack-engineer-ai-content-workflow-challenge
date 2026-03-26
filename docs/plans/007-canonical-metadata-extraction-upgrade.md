# Canonical-Based Metadata Extraction Upgrade

## Summary

Metadata extraction should be treated as a `canonical text` operation, not as a generic AI action.

- keep extracting metadata from `current_text` only
- move `Extract Metadata` next to `Save Canonical Text`
- expand metadata beyond `keywords`, `tone`, and `sentiment` into a more useful editorial payload

## Key Changes

### UI and workflow
- Move `Extract Metadata` out of the main AI action row and place it beside `Save Canonical Text`.
- Update the metadata panel copy so it explicitly says the metadata reflects the latest saved canonical text.
- Keep `Generate Draft` and `Translate/Localize` in the AI workspace.
- Do not make metadata extraction depend on having a draft suggestion.

### Metadata model
- Expand `MetadataPayload` to:
  - `keywords`
  - `tone`
  - `sentiment`
  - `audience`
  - `goal`
  - `campaign_theme`
  - `channel_fit`
  - `cta_strength`
- Keep `cta_strength` constrained to `low | medium | high`.

### Provider prompts and validation
- Update Gemini and OpenAI metadata prompts to request the expanded payload.
- Keep “valid JSON only”.
- Keep invalid or incomplete metadata as failed suggestions.

### Frontend metadata panel
- Replace the current minimal rendering with sections for all expanded fields.
- Keep it compact and reviewer-friendly.

## Test Plan

- Metadata extraction still uses `current_text`.
- Successful metadata extraction returns the expanded payload shape.
- Invalid provider JSON still produces a failed suggestion.
- `cta_strength` validation rejects unsupported values.
- `Extract Metadata` renders next to `Save Canonical Text`.
- The metadata panel renders all expanded fields.

## Assumptions

- Metadata stays a lightweight editorial aid, not a taxonomy system.
- `channel_fit`, `audience`, `goal`, and `campaign_theme` are inferred from canonical text only.
- No DB migration is required because metadata remains stored in `structured_output_json`.
