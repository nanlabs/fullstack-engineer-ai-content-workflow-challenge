# Architecture

> Stub — full system diagram to be completed alongside implementation.

## High-level overview

```
Browser (React SPA — Vite, Tailwind v4, shadcn/ui)
          |
          | REST + SSE
          v
FastAPI Backend (Python 3.12)
    ├── /api/v1/campaigns      (CRUD)
    ├── /api/v1/content        (drafts, translations)
    ├── /api/v1/review         (LangGraph human-in-the-loop)
    └── /events/               (SSE streams)
          |
          v
LangGraph State Machine
    (Draft → Suggested → Reviewed → Approved/Rejected)
          |
          v
PostgreSQL 16
    ├── Application tables (campaigns, content_pieces, review_events)
    └── LangGraph checkpoints (langgraph_checkpoint_*)
```

## Key design decisions

See `docs/adr/` for Architecture Decision Records:

- [ADR 0001 — Stack Selection](adr/0001-stack-selection.md)
