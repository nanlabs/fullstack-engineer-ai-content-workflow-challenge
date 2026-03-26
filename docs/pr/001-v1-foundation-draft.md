## Description

This PR delivers the current V1 foundation for the AI content workflow challenge.

The implementation covers a full-stack workflow using `Next.js + FastAPI + PostgreSQL + SSE`, with a Stitch-aligned UI and a simplified AI editor flow focused on:

- campaign creation and campaign listing
- campaign content list navigation
- dedicated content piece editor
- canonical text editing
- AI draft generation
- translation/localization as parallel versions
- metadata extraction
- draft review with accept/reject
- realtime updates through SSE

Architecture highlights:

- Postgres-only runtime and tests
- FastAPI backend split into API, application, domain, and infrastructure layers
- async SQLAlchemy persistence with explicit SQL migrations
- AI provider abstraction with `Gemini` as the default provider and `OpenAI` selectable through env
- Next.js frontend with Stitch-inspired dashboard, campaign content list, and content editor screens

Reviewer support:

- a demo campaign can be loaded with `cd backend && uv run seed-demo`
- the demo seed recreates `ACME Media | Creator Launch Demo`
- the seeded data includes content pieces in `draft`, `ai_suggested`, `in_review`, `approved`, and `rejected`
- translation history and extracted metadata are included so the editor flow can be reviewed with realistic data
- provider settings support browser-based switching while keeping API keys encrypted at rest and never returning them from the API

Current scope intentionally does not include:

- authentication
- version history screens
- WebSockets
- production deployment hardening

Fixes #

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce.

- [x] Backend: `cd backend && uv run pytest`
- [x] Frontend typecheck: `cd frontend && bunx tsc --noEmit`
- [x] Frontend tests: `cd frontend && bun run test`
- [x] Demo seed: `cd backend && uv run seed-demo`
- [x] Manual UI checks:
  - dashboard campaign list
  - campaign content list
  - content piece editor
  - generate draft
  - translate/localize
  - extract metadata
  - accept/reject AI suggestion

## Checklist

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings
- [x] Any dependent changes have been merged and published in downstream modules
- [x] I have checked my code and corrected any misspellings
