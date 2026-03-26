# Fix Metadata Extraction Feedback and Robustness

## Summary

The metadata request is succeeding at the HTTP level, but metadata generation is failing inside the provider/parsing path, and the UI is hiding that failure.

The fix should:
- make metadata extraction more robust for Gemini/OpenAI responses
- surface metadata failures directly in the normal editor UI

## Key Changes

### Backend metadata execution
- Keep metadata extraction sourced from `current_text`.
- Replace the raw `json.loads(output_text)` path with a shared metadata parsing helper used by both providers.
- Parsing helper behavior:
  - plain JSON parse first
  - strip markdown fences if present
  - extract the first top-level JSON object if needed
  - raise a clear parse error if still invalid
- For Gemini, prefer JSON response output more explicitly in the request.

### Backend response shape for UI feedback
- Extend `ContentPieceResponse` with `latest_metadata_attempt`.
- `latest_metadata_attempt` represents the most recent metadata suggestion regardless of success/failure.
- Keep `latest_metadata` as the latest successful parsed metadata payload.

### Frontend editor behavior
- Keep `Extract Metadata` next to `Save Canonical Text`.
- Update the metadata panel to show explicit states:
  - no extraction yet
  - extraction failed
  - extraction succeeded
- On failure, render a visible failure block with the provider/parsing error text.
- Do not require `lab=1` to understand metadata failures.

## Test Plan

- Plain valid JSON metadata succeeds.
- Metadata wrapped in code fences is recovered successfully.
- Metadata with extra prose and a valid JSON object is recovered successfully.
- Invalid metadata still produces a failed suggestion.
- `latest_metadata_attempt` returns the latest metadata call even when it failed.
- The editor shows a visible failure state when metadata extraction fails.

## Assumptions

- The main problem to fix is failed metadata attempts being invisible in the standard editor flow.
- Provider output reliability should be improved, but not trusted blindly.
- No DB migration is required.
