# Assumptions, Tradeoffs & Design Decisions

This document captures the key assumptions made during development and the tradeoffs behind each major technical decision.

## Assumptions

1. **Single-tenant deployment** — The system runs as a single backend instance. Per-user data isolation is enforced at the application level (JWT-based `userId` scoping), not at the infrastructure level.
2. **Moderate traffic** — AI endpoints are the bottleneck (external LLM API calls take 1-5 seconds). The system is designed for a team of content reviewers, not thousands of concurrent users.
3. **At least one LLM provider available** — The backend requires at least one valid API key (OpenAI, Anthropic, or Google) to function. Startup validation fails fast if the `DEFAULT_LLM_PROVIDER` key is missing.
4. **English as source language** — AI-generated drafts default to English. Translations are always *from* the original body *to* the campaign's target languages.
5. **Reviewers and generators are the same users** — There's no role-based access control (admin vs reviewer). Any authenticated user can create campaigns, trigger AI, and approve/reject content. RBAC would be a natural extension.
6. **Content is text-only** — The system handles text content (headlines, descriptions, ad copy, blog posts). Image/video generation is out of scope.

## Key Tradeoffs

### REST over GraphQL

| Factor | REST (chosen) | GraphQL (alternative) |
|--------|---------------|----------------------|
| AI endpoints | Natural fit — `POST /generate` is an action | Awkward mutations with input types |
| Data shape | Fixed views (dashboard, detail) — we know what each page needs | Flexible, but flexibility is unnecessary here |
| Real-time | SSE is a standard REST endpoint | Would need WebSocket subscription transport |
| Debugging | Browser dev tools, curl, Postman | Requires playground/client library |
| Complexity | Lower — explicit endpoint per operation | Higher — schema + resolvers + client |

**Decision:** AI trigger endpoints are actions, not queries. The data model is shallow (campaigns → content). REST keeps the API surface explicit.

### SSE over WebSockets

| Factor | SSE (chosen) | WebSockets (alternative) |
|--------|--------------|--------------------------|
| Direction | Server → Client (sufficient) | Bidirectional (unnecessary) |
| NestJS support | Built-in `@Sse()` decorator | Requires `@nestjs/websockets` package |
| Reconnection | Automatic (browser `EventSource` API) | Manual implementation needed |
| Proxy compatibility | Standard HTTP — works everywhere | Requires upgrade headers, proxy config |

**Decision:** Our real-time need is unidirectional (server pushes status changes). SSE gives us this with zero extra dependencies and automatic browser reconnection.

### LangGraph over imperative chains

| Factor | LangGraph (chosen) | Sequential functions (alternative) |
|--------|--------------------|------------------------------------|
| Workflow visibility | Explicit graph with named nodes | Buried in function call order |
| Error handling | Per-node boundaries | Nested try/catch |
| Human-in-the-loop | Built-in interrupt/resume | Manual state persistence |
| Extensibility | Add node/edge to graph | Refactor function chain |
| Overhead | LangGraph dependency | None |

**Decision:** The content pipeline (generate → translate → extract) is a stateful workflow with branching (translate to N languages) and potential human interrupts. LangGraph makes this structure explicit and extensible. The overhead of the dependency is offset by the architectural clarity it provides.

### Self-referential content model over separate Translation table

Translations are stored as `ContentPiece` records linked via `parentId`, not in a separate table.

**Why:** A translation goes through the same review workflow (DRAFT → AI_SUGGESTED → REVIEWED → APPROVED/REJECTED) as the original. A separate table would duplicate every field (body, status, metadata, reviewNotes) and require parallel logic. The unified model means one set of endpoints, one state machine, one UI component.

**Tradeoff:** Querying "all translations for content X" requires a self-join. Prisma handles this cleanly with `include: { translations: true }`, so the cost is minimal.

### Application-level state machine over database triggers

Status transitions are enforced in TypeScript code, not PostgreSQL triggers or constraints.

**Why:**
- **Testable** — Unit tests cover every valid and invalid transition.
- **Clear errors** — "Cannot approve a DRAFT — generate a draft first" is more helpful than a constraint violation.
- **Visible** — The state machine is a TypeScript file anyone can read, not hidden in a migration.

**Tradeoff:** A bug in the application code could allow invalid transitions. We mitigate this with comprehensive tests (all transitions tested in `status-machine.spec.ts`).

### Provider-agnostic ModelFactory over direct SDK usage

All LLM calls go through a `ModelFactory` abstraction that wraps LangChain's `BaseChatModel` interface.

**Why:**
- Adding a new provider (e.g., Mistral, Ollama) requires adding one registry entry — no changes to prompts, controllers, or workflows.
- Per-request model override (`{ "model": "anthropic" }`) and multi-model comparison come for free.
- Prompts use LangChain's `ChatPromptTemplate` — they work identically across all providers.

**Tradeoff:** An extra layer of indirection. But it's ~40 lines of code — not an over-engineered abstract factory. Worth it for the flexibility.

### No Redis/Kafka

The challenge lists Redis and Kafka as bonus points. We chose not to include them.

**Why:** The system has a single backend instance processing requests synchronously. There's no queue to decouple, no pub/sub across services, no event log to persist. In-process event emission (`EventEmitter2`) handles real-time events between the AI service and the SSE controller.

**When we would add them:**
- **Redis** — If scaling to multiple backend instances (share SSE events across pods via Redis Pub/Sub).
- **Kafka** — If AI generation becomes async with durable event logs, or if downstream systems need to consume content events.

### JSON metadata column over normalized tables

Keywords, tone, and sentiment are stored in a PostgreSQL `jsonb` column.

**Why:** AI extraction output may evolve (add "reading_level" or "target_audience") without requiring database migrations. PostgreSQL's `jsonb` supports indexing and querying.

**Tradeoff:** No foreign key constraints or schema enforcement on metadata structure. We validate the structure in the AI extraction prompt and parse the response with error handling.

## AI Design Choices

For detailed AI architecture documentation, see:

- [**ai-design.md**](ai-design.md) — ModelFactory pattern, LangGraph pipeline, prompt engineering approach
- [**workflow.md**](workflow.md) — Content review state machine, real-time event system, authentication design
- [**kubernetes.md**](kubernetes.md) — Kubernetes deployment architecture and Helm chart design
