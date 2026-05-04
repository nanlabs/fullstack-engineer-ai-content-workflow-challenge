# ADR 0001 — Stack Selection

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Maximiliano Vitale

## Context

We need to build a full-stack system for ACME GLOBAL MEDIA to manage a multilingual content
workflow (creation, translation, review) powered by LLMs, with human-in-the-loop. The system
models a review state machine: Draft → Suggested → Reviewed → Approved/Rejected.

## Decisions

### Python (FastAPI) over Node.js (NestJS)

The role being targeted is **AI Engineer (Agentic Systems)**. Python is the lingua franca of
ML/AI ecosystems — LangGraph, LangChain, Anthropic SDK, and OpenAI SDK are all Python-first.
Using Python avoids cross-language impedance mismatches and keeps the AI integration layer
idiomatic. FastAPI provides async-native request handling, first-class Pydantic v2 integration,
and auto-generated OpenAPI docs.

### LangGraph over plain LangChain

The content workflow is fundamentally a **state machine**: a document transitions through
discrete states, and human reviewers must interrupt execution, inspect state, and resume.
LangGraph provides:

- Typed `StateGraph` with `interrupt()` for human-in-the-loop checkpoints
- Built-in PostgreSQL checkpoint store (reuses our existing DB — no extra infra)
- Native streaming of state updates, composing cleanly with SSE

Plain LangChain lacks the state machine primitives. Implementing them manually would reproduce
what LangGraph already provides, with more surface area for bugs.

### REST over GraphQL

The domain is small and well-bounded (campaigns → content pieces → review states). REST with
clearly named endpoints is simpler to reason about, easier to test, and composes naturally with
SSE for real-time server→client updates. GraphQL's main benefits — arbitrary query composition
and avoiding over-fetching — are not meaningful at this domain size.

## Consequences

- All AI calls go through a `LLMProvider` abstraction; SDKs are never called directly from
  endpoints.
- PostgreSQL doubles as both application DB and LangGraph checkpoint store.
- SSE handles real-time updates without WebSocket infrastructure overhead.
- The stack fits the AI Engineer role signal and supports structured outputs, prompt versioning,
  and LLM observability natively.
