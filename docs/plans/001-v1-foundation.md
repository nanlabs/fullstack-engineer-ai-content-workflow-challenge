# V1 Foundation Plan

## Summary

Build the challenge as a minimal, modular full-stack system using `Next.js + FastAPI + PostgreSQL + SSE`, optimized for static/SSR-friendly frontend behavior and a simple local setup with `bun`, `uv`, `uvicorn`, and `docker compose`.

This first iteration should satisfy the core challenge only:
- campaign and content-piece management
- AI draft / translation / metadata generation
- human review workflow with canonical text rules
- realtime notifications through SSE
- local Docker setup and clear docs

The codebase should be structured so bonus work later can plug into clear seams:
- AI provider abstraction
- event publishing abstraction
- review workflow/state rules isolated from transport
- frontend data layer separated from UI components

## Implementation Changes

### Repo structure and delivery shape
- Create the challenge-aligned structure: `backend/`, `frontend/`, `docs/`, `compose.yml`, `.env.example`.
- Add a root `agents.md` with commit and planning rules for agents.
- Save this plan as the first document under `docs/plans/`.

### Backend architecture
- Use `FastAPI` with a small layered structure for API, application, domain, and infrastructure concerns.
- Keep REST only.
- Use PostgreSQL as the only persistence layer.
- Use an async SQLAlchemy stack with explicit SQL migrations.
- Model `campaigns`, `content_pieces`, `ai_suggestions`, and `review_actions`.
- Enforce review-state transitions in a dedicated domain service.
- Keep `current_text` canonical and never overwrite it on AI generation.
- Implement AI operations behind a provider abstraction with OpenAI as the initial provider.
- Validate metadata extraction before persistence.
- Publish events after AI and review actions so realtime transport stays separate from domain logic.

### API surface
Implement these endpoints:
- `POST /campaigns`
- `GET /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns/:id/content-pieces`
- `GET /content-pieces/:id`
- `PATCH /content-pieces/:id`
- `POST /content-pieces/:id/ai/generate-draft`
- `POST /content-pieces/:id/ai/translate`
- `POST /content-pieces/:id/ai/extract-metadata`
- `POST /content-pieces/:id/review`
- `GET /events`

### Frontend architecture
- Use `Next.js` App Router.
- Prefer server rendering and static-friendly pages where possible.
- Build a campaign dashboard, campaign detail page, and content review panel.
- Separate API access, page loading, reusable UI, and SSE refresh logic.
- Show workflow badges, canonical text, AI suggestion data, metadata, and review controls.

### Docker and local setup
- Use `compose.yml` with `db`, `backend`, and `frontend` services.
- Run backend with `uv` and `uvicorn`.
- Run frontend with `bun`.
- Add a persistent PostgreSQL volume.
- Provide `.env.example` with DB, app URLs, and OpenAI config.

## Public Interfaces and Types

### Core enums
- `ReviewState`: `draft | ai_suggested | in_review | approved | rejected`
- `OperationType`: `generate_draft | translate | extract_metadata`
- `AISuggestionStatus`: `success | failed`
- `ReviewActionType`: `start_review | accept | edit | reject`

### Review rules
- New content pieces start in `draft`.
- Successful AI generation moves the piece to `ai_suggested`.
- Starting review or editing moves the piece to `in_review`.
- Accept or edit-and-accept updates `current_text` and ends in `approved`.
- Reject ends in `rejected` without changing `current_text`.
- Failed AI calls do not mutate canonical content.

## Test Plan
- Backend state transition tests.
- Backend AI service tests with a mocked provider.
- Backend integration tests for campaign, AI, review, and SSE flows.
- Frontend component coverage for review actions and workflow rendering.
- Manual QA through `docker compose`.

## Assumptions
- REST only in V1.
- SSE instead of WebSockets in V1.
- OpenAI only in V1 with a provider abstraction for future expansion.
- No auth, queues, Redis, Kafka, or version history in this iteration.
