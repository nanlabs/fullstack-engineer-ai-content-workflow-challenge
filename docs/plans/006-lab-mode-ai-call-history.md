# `lab=1` AI Call History Plan

## Summary

Add a lightweight `lab mode` for the content piece editor so challenge reviewers can inspect the actual sequence of AI calls behind a piece without opening the browser console.

Two decisions are locked:
- metadata extraction is currently sourced from the `canonical text` (`current_text`)
- `?lab=1` will be supported only on the content piece editor page in this first version

The first version should show only already persisted call history, not new low-level provider logs.

## Key Changes

### Backend/API
- Extend `ContentPieceResponse` with a new history collection for lab mode.
- Populate it from `ai_suggestions`, sorted in chronological order so the modal can show calls “en secuencia”.
- Each history item should expose the persisted fields we already have:
  - `id`
  - `operation_type`
  - `provider`
  - `model`
  - `status`
  - `created_at`
  - `input_text`
  - `output_text`
  - `structured_output_json`
  - `source_language`
  - `target_language`
- Do not add new persistence or provider instrumentation in this pass.
- Use the existing persisted `input_text` to make it explicit that metadata extraction ran against the canonical text active at call time.

### Frontend/editor
- Read `lab=1` from the editor route query string only: `/campaigns/[campaignId]/content-pieces/[pieceId]?lab=1`.
- When `lab=1` is present:
  - show a `View AI logs` button in the editor
  - open a large modal with the chronological call history for that piece
- When `lab=1` is absent:
  - hide the button entirely
  - leave the normal challenge UI unchanged
- Modal content should render each AI call as a separate step/card with:
  - operation label
  - provider/model
  - timestamp
  - status
  - language pair for translations when present
  - input text
  - result body
- Rendering rules:
  - for metadata calls, show `structured_output_json` pretty-printed and label it clearly as extracted metadata
  - for translation/draft calls, show `output_text`
  - for failed calls, show the stored failure text from `output_text` as the error/result body
- Keep the modal read-only.

## Test Plan

- `ContentPieceResponse.ai_call_history` includes all persisted suggestions for the piece.
- History items are returned in chronological order.
- Metadata history item includes `structured_output_json` and the expected `input_text`.
- Translation history item includes `source_language` and `target_language`.
- Failed suggestions still appear in history with `status=failed`.
- Without `?lab=1`, the editor does not show the lab button.
- With `?lab=1`, the editor shows the button and opens the modal.

## Assumptions

- “Logs” in this first version means persisted AI suggestion history, not raw provider request/response traces.
- `lab=1` is an editor-only debug surface for the challenge, not a general product feature.
- Existing persisted data is enough for this first reviewer-facing version.
