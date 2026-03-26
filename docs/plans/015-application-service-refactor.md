# Application Service Refactor Plan

## Summary

Reduce `backend/src/app/application/services.py` to a thin facade and move implementation into focused application modules without changing the HTTP API or the `WorkflowService` entrypoint used by the app.

## Changes

1. Keep `WorkflowService` as the public application facade.
2. Extract campaign, content piece, AI workflow, review, provider settings, serializer, and event publishing responsibilities into dedicated modules.
3. Preserve existing routes, schemas, persistence, and test fixtures.
4. Add focused serializer coverage so the refactor is not protected only by integration tests.

## Validation

- `uv run pytest` stays green.
- `WorkflowService` remains import-compatible for `main.py`, `deps.py`, tests, and `seed_demo.py`.
- Campaign detail, draft history, translation versions, metadata, and provider settings behavior remain unchanged.
