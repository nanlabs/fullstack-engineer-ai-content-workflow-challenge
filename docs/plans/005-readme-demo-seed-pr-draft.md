# README Demo Seed + PR Draft Plan

## Summary

Add a focused documentation pass for the demo campaign and prepare a first review-ready PR draft aligned to the repository template.

The goal is to make two things explicit for reviewers:
- how to load and use the demo campaign data in the UI
- what to say in the PR about the current implementation status, decisions, and validation

## Key Changes

### README updates
- Add a new `Demo campaign` section to `README.md`.
- Document:
  - the purpose of the seeded campaign as a reviewer/demo dataset
  - the command to load it: `cd backend && uv run seed-demo`
  - that the command recreates the demo campaign by name
  - the expected workflow states present after seeding:
    - `draft`
    - `ai_suggested`
    - `in_review`
    - `approved`
    - `rejected`
- Keep the section short, but include a practical “what to verify in the UI” list:
  - campaign list
  - content list inside a campaign
  - content piece editor
  - translation history
  - metadata panel
  - accept/reject draft review

### PR draft artifact
- Create a versioned first draft under `docs/pr/`.
- Structure it to mirror `.github/PULL_REQUEST_TEMPLATE.md`:
  - `Description`
  - `Type of Change`
  - `How Has This Been Tested?`
  - `Checklist`
- Fill it with the current state of the repo so it is usable as a base for the final PR:
  - challenge summary
  - architecture summary
  - UI flow summary
  - Gemini-first provider support with OpenAI fallback
  - demo seed availability
  - commands used for backend/frontend validation

### PR content focus
- Emphasize:
  - Postgres-only runtime and tests
  - Next.js + FastAPI + SSE architecture
  - Stitch-aligned dashboard/content-list/editor UI
  - simplified AI workflow:
    - `Generate Draft`
    - `Translate/Localize`
    - `Extract Metadata`
  - translation versions stored independently from canonical text
  - demo seed for reviewer validation
- Avoid claiming unsupported scope:
  - no auth
  - no version-history feature
  - no WebSockets
  - no production deployment hardening

## Test Plan

- Manual doc validation:
  - follow the README demo section from a clean local env
  - run `uv run seed-demo`
  - confirm the seeded campaign appears and contains varied workflow states
- PR draft validation:
  - compare the generated draft against `.github/PULL_REQUEST_TEMPLATE.md`
  - ensure each required section from the template is present

## Assumptions

- The “important part” to add in the README is the seeded demo campaign and how reviewers should use it.
- The PR draft should live as a dedicated markdown artifact in `docs/pr/`, not inside the README.
- The README addition should stay concise and operational, not become a long product walkthrough.
- The PR draft is intended as a first editable base for the final submission text.
