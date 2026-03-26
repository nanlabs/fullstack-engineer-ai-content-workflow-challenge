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

## Security Decisions

### JWT in localStorage (not HttpOnly cookies)

The frontend stores JWT tokens in `localStorage` and attaches them via `Authorization: Bearer` headers.

**Why not HttpOnly cookies:**
- HttpOnly cookies require CSRF protection (tokens, double-submit, SameSite). Bearer headers are immune to CSRF because browsers never attach them automatically to cross-origin requests.
- The SPA model with Bearer tokens is the industry standard — Auth0, Firebase, and Supabase all use this pattern.
- XSS risk is mitigated by: global `SanitizePipe` stripping all HTML tags from input, React's built-in JSX escaping (no `dangerouslySetInnerHTML` usage), and Helmet security headers.

**Tradeoff:** If an XSS vulnerability exists in a dependency, tokens could be stolen. We accept this given the multiple XSS mitigations in place and the complexity cost of cookie-based auth for an SPA.

### JWT in query parameter for SSE

The `EventSource` browser API does not support custom headers. The JWT is passed as `?token=<jwt>` for SSE connections.

**Why not cookies:** This would require switching the entire auth model to cookies (see above). The query parameter is verified server-side, and the SSE endpoint is over the same origin (no cross-site exposure).

**Mitigations:** Backend validates and verifies the JWT before accepting the SSE connection. In production, HTTPS encrypts query strings in transit. Nginx access logs should be configured to exclude query parameters in production.

### No HTTPS in Docker Compose

The development setup runs over HTTP. TLS termination is an infrastructure concern — in production, it's handled by the Kubernetes Ingress controller (see [kubernetes.md](kubernetes.md)), a load balancer, or a reverse proxy like Cloudflare.

### No token revocation

JWTs are stateless — once signed, they're valid until expiration (24h). There is no server-side blacklist or token invalidation.

**Why:** Token revocation requires a persistence layer (Redis or database) checked on every request, negating JWT's stateless performance benefit. For this application's scale, 24h expiry with rate limiting provides sufficient protection.

**When we would add it:** If the system needed immediate token invalidation (e.g., admin revoking a compromised account), a Redis-backed blacklist with a TTL matching the JWT expiry would be the right approach.

### Timing-safe login

The login endpoint always runs `bcrypt.compare` regardless of whether the user exists (using a dummy hash for non-existent users). This prevents timing-based email enumeration attacks where an attacker measures response times to determine which emails are registered.

### Rate limiting strategy

- **Global:** 20 requests per minute per IP (via `@nestjs/throttler`)
- **AI endpoints:** 10 requests per minute (generate, translate, extract) and 5 per minute (chain, compare)
- **Why no account lockout:** Rate limiting at the IP level provides brute-force protection without the complexity of per-account lockout state (which would require Redis). The 24h JWT expiry limits the window of any compromised session.

## Testing Decisions

### What was tested and why

The test suite has 173 tests across 15 suites (122 backend, 51 frontend). Coverage targets the core business logic that can go wrong in real use — state transitions, permission enforcement, data transforms — rather than framework boilerplate or infrastructure wiring.

| Layer | What is tested | Why |
|-------|---------------|-----|
| **Status machine** (`status-machine.spec.ts`) | Every valid and invalid state transition | The finite-state machine has a small, enumerable input space — exhaustive coverage is cheap and catches any accidental regression |
| **ModelFactory** (`model-factory.spec.ts`) | Provider registration, default selection, unknown-provider errors | The registry is the only place that maps string names to LLM clients; an error here silently breaks all AI features |
| **CampaignsService** (`campaigns.service.spec.ts`) | CRUD operations, user-scoping (no cross-user access), not-found errors | Enforces the ownership invariant: a user must never read or mutate another user's campaigns |
| **ContentService** (`content.service.spec.ts`) | CRUD under campaign ownership, status transitions, required `userId` | Same ownership reasoning as campaigns; `userId` was made required (not optional) after a security audit |
| **AiService** (`ai.service.spec.ts`) | Prompt construction, output parsing, provider delegation, translation/keyword extraction | Mocking the LLM lets us assert on the *prompt sent* (input contract) and *parsed output* (output contract) without paying for API calls or dealing with non-determinism |
| **ContentWorkflow** (`content-workflow.spec.ts`) | LangGraph node execution, draft generation, comparison, chained workflows | Isolates the multi-step AI pipeline from the HTTP layer; each node is tested independently |
| **AiController** (`ai.controller.spec.ts`) | HTTP status codes (400 vs 502), error mapping from provider errors, auth guard wiring | Ensures that invalid provider names return 400 (client error), not 502 (server error) |
| **AuthService** (`auth.service.spec.ts`) | Signup (bcrypt hash), login (bcrypt compare), wrong-password rejection, dummy-hash timing safety | Security-critical path — tested in isolation so a framework upgrade cannot silently break password checking |
| **EventsController** (`events.controller.spec.ts`) | SSE connection tracking, per-user event routing, campaign vs content event dispatch | The real-time system is stateful (connection map); tests verify that events are not broadcast to the wrong user |
| **SanitizePipe** (`sanitize.pipe.spec.ts`) | XSS vector stripping (`<script>`, `onerror=`, HTML-in-JSON, nested objects/arrays) | The pipe is the only XSS defense for user-supplied text; it must handle all input shapes |
| **EnvValidation** (`env.validation.spec.ts`) | Required-variable errors, invalid enum values, default values | The app calls `process.exit(1)` on startup if env validation fails — unit tests catch this before Docker build time |
| **API client** (`api.test.ts`) | Fetch wrapper, auth header injection, 401 → redirect, error response parsing | Browser `fetch` has many edge cases (non-2xx but not `ok`, missing body, redirect) — mocking isolates them |
| **StatusBadge** (`StatusBadge.test.tsx`) | All status variants render without crashing, correct CSS classes applied | Component reads status from props and maps to Tailwind classes; a typo in a class name is invisible without rendering |
| **ContentCard** (`ContentCard.test.tsx`) | Conditional rendering (AI toolbar visibility, metadata expansion, empty states), user interaction | The card is the primary editing surface; tests drive the most common user flows without needing a running backend |
| **AiToolbar** (`AiToolbar.test.tsx`) | Model selection, button states (disabled while loading), callback props | Ensures the toolbar communicates the selected model upward and respects disabled state during AI calls |

### Why unit tests, not integration tests

Running integration tests would require a live PostgreSQL database and at least one LLM API key — neither is guaranteed in CI. Unit tests are:

- **Fast** — the full suite runs in ~10 seconds
- **Deterministic** — no network calls, no DB state to reset between runs
- **Cost-free** — no LLM API charges per test run
- **Self-contained** — any engineer can run `./scripts/run-tests.sh` with no external services

E2E tests for full user flows (login → create campaign → generate content → approve) would be a natural next step using a test database container and mocked LLM responses.

### Why specific things were mocked

**PrismaService** — mocked in every service test. Using a real database would require running migrations, seeding, and teardown for every test. The mock lets us verify that services call the right Prisma methods with the right arguments, without any DB infrastructure.

**ModelFactory / AiService** — mocked at the controller and workflow layer. The *actual* AI calls are tested in `ai.service.spec.ts`; higher layers only need to prove they invoke the right provider method and handle the response correctly. Mocking also eliminates non-determinism (LLM outputs change across runs).

**EventEmitter2** — mocked in service tests. Services emit events as a side effect of state changes; tests assert that `emitter.emit` is called with the right event name and payload without needing a real pub/sub system.

**JwtService** — mocked in `auth.service.spec.ts`. The test only needs to verify that the service calls `jwt.sign` with the right payload; the actual RS256 signature is an implementation detail of `@nestjs/jwt`.

**Browser `fetch`** — replaced with `vi.fn()` in frontend tests. This avoids a running server and lets tests control every possible response (200, 401, 500, network error) precisely.

### What was intentionally not covered

- **HTTP controllers (campaigns, content, auth)** — the controllers are thin wrappers that delegate to services; the only logic (auth guards, DTO validation) is framework-provided and tested by the framework's own test suite. Statement coverage shows 0% for these files, which is expected and intentional.
- **Page components** (`Dashboard`, `CampaignDetail`, `ContentDetail`, etc.) — these require a full React Router context, a live API, and session state. Integration or Playwright E2E tests would be more appropriate and are out of scope.
- **LLM output quality** — no test asserts "the generated copy is good". LLM outputs are non-deterministic; quality is a product concern, not a unit-test concern.
- **Docker and nginx config** — infrastructure files are validated by running the containers in `compose.dev.yml`; unit testing Dockerfile syntax provides little value.

### Coverage numbers

After running `./scripts/run-tests.sh --coverage`:

| Suite | Statements | Branches | Functions | Lines |
|-------|-----------|----------|-----------|-------|
| Backend | 78.6% | 88.2% | 72.7% | 78.7% |
| Frontend | 17.9%¹ | 81.1% | 34.9% | 17.9%¹ |

¹ The low frontend statement/line coverage is explained entirely by the untested page components (5 large files, ~1000 lines). The four tested modules — `api.ts`, `StatusBadge`, `ContentCard`, `AiToolbar` — are covered at 63–100%. Branch coverage remains high (81%) because the tested components exercise most conditional paths.

## AI Design Choices

For detailed AI architecture documentation, see:

- [**ai-design.md**](ai-design.md) — ModelFactory pattern, LangGraph pipeline, prompt engineering approach
- [**workflow.md**](workflow.md) — Content review state machine, real-time event system, authentication design
- [**nginx.md**](nginx.md) — nginx reverse proxy, SSE streaming config, same-origin architecture, security headers
- [**kubernetes.md**](kubernetes.md) — Kubernetes deployment architecture and Helm chart design
