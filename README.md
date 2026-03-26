# ACME Content Workflow — AI-Powered Content Management

Loom Overview: https://www.loom.com/share/f048ce37745c4f1eb7ecee16e597d2cb

Fullstack implementation of the **ACME Global Media AI Content Workflow** challenge. A system for managing marketing campaign content creation, AI-powered draft generation, multi-language translation, and human-in-the-loop review — all powered by LLM integration through a provider-agnostic architecture.

> See [CHALLENGE_BRIEF.md](CHALLENGE_BRIEF.md) for the original challenge requirements.

### 📄 Documentation

| Document | Contents |
|----------|----------|
| [docs/decisions.md](docs/decisions.md) | Assumptions, tradeoffs & design decisions |
| [docs/ai-design.md](docs/ai-design.md) | ModelFactory pattern, LangGraph pipeline, prompt engineering |
| [docs/workflow.md](docs/workflow.md) | Content review state machine, SSE real-time, authentication |
| [docs/nginx.md](docs/nginx.md) | nginx role, reverse proxy config, SSE streaming, security headers |
| [docs/kubernetes.md](docs/kubernetes.md) | Kubernetes deployment architecture & Helm chart guide |

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — set JWT_SECRET to a random string, and set at least one API key

# 2. Run with Docker Compose
docker compose up --build   

docker compose -f compose.dev.yml up (for local development)

# 3. Access
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000/api
# Swagger UI: http://localhost:3000/api/docs
# Demo login: demo@acme.com / demo1234
```

### Local Development (without Docker)

```bash
# Start PostgreSQL (via Docker or local install)
docker compose up postgres -d

# Backend
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev    # http://localhost:3000

# Frontend (new terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## Tech Stack & Decisions

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend** | NestJS (TypeScript) | Modular DI, built-in validation/pipes/guards, decorators for SSE, aligns with job stack |
| **Authentication** | JWT + bcrypt + Passport | Stateless JWT auth with bcrypt password hashing (salt rounds: 10). Per-user data isolation. |
| **Frontend** | React + Vite + TypeScript | Fast HMR, clean SPA, TanStack Query for server state, Tailwind CSS |
| **Database** | PostgreSQL + Prisma | Type-safe ORM with auto-generated types, migrations, seeding |
| **AI Orchestration** | LangGraph.js + LangChain.js | LangGraph for stateful multi-step workflows (generate → translate → extract pipeline); LangChain for individual LLM calls |
| **API Style** | REST | AI endpoints are action-based (POST /generate, /translate). Simple CRUD patterns don't benefit from GraphQL's flexibility. SSE covers real-time. |
| **Real-time** | Server-Sent Events (SSE) | Per-user event routing with JWT auth via query param. Cross-device sync for same user, isolation between users. |
| **LLM Abstraction** | ModelFactory pattern | Provider-agnostic: switch between OpenAI / Anthropic / Gemini via env var or per-request. Enables multi-model comparison. |
| **Containerization** | Docker + Docker Compose | Multi-stage builds, single `docker compose up` for full stack |

### Why REST (not GraphQL)?

- AI trigger endpoints are actions (generate, translate, extract) — these map naturally to POST verbs, not query fields
- The data model is simple (campaigns → content pieces) — no deeply nested variable queries
- SSE handles real-time push, which GraphQL Subscriptions would also solve but with more complexity
- REST keeps the API surface explicit and easy to reason about for reviewers

### Why LangGraph (not just LangChain)?

- LangGraph is the standard for building agent/workflow graphs
- The content pipeline has branching (translate to N languages), conditional logic, and potential human-in-the-loop interrupts
- StateGraph provides explicit, debuggable workflow visualization vs imperative chains

### ModelFactory — Provider-Agnostic LLM Design

```
.env: DEFAULT_LLM_PROVIDER=anthropic   ← default for all AI endpoints
POST /api/content/:id/generate       ← uses default
POST /api/content/:id/generate { "model": "openai" }  ← per-request override
GET  /api/ai/providers               ← lists available + default
POST /api/content/:id/compare        ← runs all available providers in parallel
```

Set any combination of API keys to enable providers:
- `GOOGLE_API_KEY` → Gemini 2.5 Flash (free tier available)
- `OPENAI_API_KEY` → GPT-4o Mini
- `ANTHROPIC_API_KEY` → Claude Sonnet 4

## Architecture

```
┌─────────────┐     REST + SSE     ┌─────────────────────────────────┐
│   React SPA │◄──────────────────►│         NestJS Backend          │
│  (Vite)     │                    │                                 │
│  - Dashboard│                    │  Campaigns ─── Content ─── AI   │
│  - Campaign │                    │  Module        Module     Module│
│  - Content  │                    │                 │           │   │
│    Detail   │                    │              Status       Model │
│  - AI Tools │                    │              Machine     Factory│
│  - Review   │                    │                           │    │
└─────────────┘                    │                      ┌────┴───┐│
                                   │                      │LangGraph││
                                   │                      │Pipeline ││
                                   └──────────┬───────────┴────────┘│
                                              │
                                   ┌──────────┴──────────┐
                                   │    PostgreSQL        │
                                   │  (Prisma ORM)        │
                                   └─────────────────────┘
```

## Data Model

- **Campaign** — name, description, targetLanguages[]
- **ContentPiece** — type (HEADLINE, PRODUCT_DESCRIPTION, AD_COPY, BLOG_POST), title, body, language, status, aiModel, metadata (JSON), reviewNotes, self-referencing parentId for translations

### Status Machine

```
DRAFT → AI_SUGGESTED → REVIEWED → APPROVED
                    ↘            ↗
                     REJECTED → DRAFT (reset)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user (public) |
| POST | `/api/auth/login` | Login and receive JWT (public) |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns` | List campaigns with content summaries |
| GET | `/api/campaigns/:id` | Campaign detail with content pieces |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| POST | `/api/campaigns/:id/content` | Create content piece |
| GET | `/api/content/:id` | Content detail with translations |
| PUT | `/api/content/:id` | Update content body/notes |
| PUT | `/api/content/:id/status` | Change review status |
| DELETE | `/api/content/:id` | Delete content |
| POST | `/api/content/:id/generate` | AI: Generate draft |
| POST | `/api/content/:id/translate` | AI: Translate to language |
| POST | `/api/content/:id/extract` | AI: Extract metadata |
| POST | `/api/content/:id/chain` | AI: Full pipeline (generate → translate all → extract) |
| POST | `/api/content/:id/compare` | AI: Compare all available models |
| GET | `/api/ai/providers` | List available LLM providers |
| GET | `/api/events` | SSE stream for real-time updates (JWT via query param) |

> All endpoints except `/auth/*` require `Authorization: Bearer <token>` header. SSE uses `?token=<jwt>` query parameter.

### Swagger / OpenAPI

Interactive API docs are available at **`/api/docs`** when the backend is running.

```bash
# Get a JWT to paste into Swagger's "Authorize" dialog
./scripts/get-token.sh                              # demo account
./scripts/get-token.sh user@example.com mypassword  # custom credentials
```

Click **Authorize** in the Swagger UI, paste the token (without the `Bearer ` prefix), and you can send requests directly from the browser.

## Security

- **JWT Authentication** — Stateless token-based auth via `@nestjs/passport` + `passport-jwt`. Tokens expire after 24h.
- **bcrypt Password Hashing** — Passwords stored with bcrypt (salt rounds: 10). Plaintext never stored or logged.
- **Per-User Data Isolation** — All campaigns/content scoped by `userId`. Cross-user access returns 404.
- **Helmet** — HTTP security headers
- **CORS** — Restricted to `FRONTEND_URL`
- **Rate Limiting** — `@nestjs/throttler` on AI endpoints (10 req/min)
- **Input Validation** — `class-validator` + `class-transformer` on all DTOs
- **HTML Sanitization** — Global `SanitizePipe` using `sanitize-html`
- **UUID Validation** — `ParseUUIDPipe` on all ID params
- **Env Validation** — Startup check for required env vars including `JWT_SECRET`

## Testing

```bash
# Run all tests (works from any directory)
./scripts/run-tests.sh

# Run with coverage reports → coverage/backend/ and coverage/frontend/
./scripts/run-tests.sh --coverage

# Or run individually:
cd backend && npm test           # Jest — 122 tests, 11 suites
cd backend && npm run test:cov   # Jest with coverage
cd frontend && npm test          # Vitest — 51 tests, 4 suites
cd frontend && npm run test:cov  # Vitest with coverage
```

Test coverage:

**Backend — Core logic:**
- **status-machine.spec.ts** — All valid/invalid state transitions
- **model-factory.spec.ts** — Provider registration, default selection, error cases
- **campaigns.service.spec.ts** — CRUD operations with mocked Prisma
- **content.service.spec.ts** — CRUD, status transitions, event emission

**Backend — AI layer:**
- **ai.service.spec.ts** — Generate, translate, extract, compare with mocked models
- **content-workflow.spec.ts** — LangGraph pipeline (generate → translate → extract)
- **ai.controller.spec.ts** — All AI endpoints, error handling (429/502), event emission

**Backend — Auth & common:**
- **auth.service.spec.ts** — Signup (hashing, conflicts), login (valid/invalid), JWT payload
- **sanitize.pipe.spec.ts** — HTML stripping, XSS prevention, recursive sanitization
- **env.validation.spec.ts** — Required fields, provider validation, key matching
- **events.controller.spec.ts** — SSE JWT auth, event routing, user isolation

**Frontend:**
- **StatusBadge.test.tsx** — Component rendering for all statuses
- **api.test.ts** — Token injection, 401 handling, error parsing, AI endpoint payloads
- **AiToolbar.test.tsx** — Button states, disabled logic, loading labels, error display
- **ContentCard.test.tsx** — CRUD actions, edit mode, status-dependent UI, skeleton states

## Bonus Points Addressed

| Bonus | Status | Implementation |
|-------|--------|---------------|
| LangChain chaining | Done | LangGraph StateGraph pipeline (generate → translate → extract) |
| Multi-model comparison | Done | `/compare` endpoint runs all providers in parallel |
| Real-time | Done | SSE via NestJS `@Sse()` + EventEmitter2 |
| CI Pipeline | Done | GitHub Actions — typecheck, test, build for both projects |
| Automated tests | Done | Jest (backend) + Vitest (frontend), 173 tests across 15 suites |
| Kubernetes deploy | Done | Helm chart in `k8s/` — PostgreSQL StatefulSet, backend/frontend Deployments, Ingress |

## Project Structure

```
├── .github/workflows/ci.yml    # GitHub Actions CI
├── backend/
│   ├── prisma/                  # Schema + seed
│   ├── src/
│   │   ├── ai/                  # ModelFactory, LangGraph, prompts, AI service
│   │   ├── campaigns/           # Campaign CRUD module
│   │   ├── content/             # Content CRUD + status machine
│   │   ├── events/              # SSE controller
│   │   └── common/              # Prisma, sanitize pipe, env validation
│   ├── test/                    # E2E test config
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, CampaignDetail, ContentDetail
│   │   ├── components/          # StatusBadge
│   │   ├── hooks/               # useEventSource (SSE)
│   │   └── lib/                 # API client, types
│   ├── nginx.conf               # Production proxy config
│   └── Dockerfile
├── k8s/
│   └── acme-content/             # Helm chart for Kubernetes deployment
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/            # Backend, frontend, postgres, ingress, secrets
├── compose.yml
├── .env.example
└── docs/
    ├── ai-design.md              # ModelFactory + LangGraph architecture
    ├── workflow.md                # Status machine, SSE, authentication
    ├── decisions.md               # Assumptions, tradeoffs & design decisions
    ├── nginx.md                   # nginx config, reverse proxy, SSE streaming
    └── kubernetes.md              # K8s deployment architecture & Helm guide
```
