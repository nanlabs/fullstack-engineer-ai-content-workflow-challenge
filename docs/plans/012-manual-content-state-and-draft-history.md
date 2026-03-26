# Manual Content State and Draft History Plan

## Summary

Decouple manual content status from AI draft decisions. `review_state` remains the same set of values, but becomes manual-only. Draft accept/reject decisions are tracked in AI workspace history and no longer change content status automatically.

## Changes

1. Make `review_state` editable through content piece updates.
2. Stop auto-mutating `review_state` from AI actions and suggestion review actions.
3. Expose `draft_history` derived from successful `generate_draft` suggestions plus their latest accept/reject decision.
4. Rebuild the editor AI workspace around draft history and a reject modal.

## Validation

- Manual status dropdown updates the badge and campaign counts.
- Accept applies draft text to the canonical text without changing content status.
- Reject works even when the content is currently `approved`.
- Reject can optionally trigger a new draft generation after confirmation.
