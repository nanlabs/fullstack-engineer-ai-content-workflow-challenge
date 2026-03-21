# ACME Content Workflow — AI-Powered Content Management

Fullstack implementation of the **ACME Global Media AI Content Workflow** challenge. A system for managing marketing campaign content creation, AI-powered draft generation, multi-language translation, and human-in-the-loop review — all powered by LLM integration through a provider-agnostic architecture.

> See [CHALLENGE_BRIEF.md](CHALLENGE_BRIEF.md) for the original challenge requirements.

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — set at least one API key (GOOGLE_API_KEY is free via Google AI Studio)

# 2. Run with Docker Compose
docker compose up --build

# 3. Access
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000/api
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
| **Frontend** | React + Vite + TypeScript | Fast HMR, clean SPA, TanStack Query for server state, Tailwind CSS |
| **Database** | PostgreSQL + Prisma | Type-safe ORM with auto-generated types, migrations, seeding |
| **AI Orchestration** | LangGraph.js + LangChain.js | LangGraph for stateful multi-step workflows (generate → translate → extract pipeline); LangChain for individual LLM calls |
| **API Style** | REST | AI endpoints are action-based (POST /generate, /translate). Simple CRUD patterns don't benefit from GraphQL's flexibility. SSE covers real-time. |
| **Real-time** | Server-Sent Events (SSE) | Unidirectional server→client fits perfectly (status changes, AI completions). No WebSocket overhead. |
| **LLM Abstraction** | ModelFactory pattern | Provider-agnostic: switch between OpenAI / Anthropic / Gemini via env var or per-request. Enables multi-model comparison. |
| **Containerization** | Docker + Docker Compose | Multi-stage builds, single `docker compose up` for full stack |

### Why REST (not GraphQL)?

- AI trigger endpoints are actions (generate, translate, extract) — these map naturally to POST verbs, not query fields
- The data model is simple (campaigns → content pieces) — no deeply nested variable queries
- SSE handles real-time push, which GraphQL Subscriptions would also solve but with more complexity
- REST keeps the API surface explicit and easy to reason about for reviewers

### Why LangGraph (not just LangChain)?

- The job title is "AI Engineer — Agentic Systems"; LangGraph is the standard for building agent/workflow graphs
- The content pipeline has branching (translate to N languages), conditional logic, and potential human-in-the-loop interrupts
- StateGraph provides explicit, debuggable workflow visualization vs imperative chains

### ModelFactory — Provider-Agnostic LLM Design

```
.env: DEFAULT_LLM_PROVIDER=gemini   ← default for all AI endpoints
POST /api/content/:id/generate       ← uses default
POST /api/content/:id/generate { "model": "openai" }  ← per-request override
GET  /api/ai/providers               ← lists available + default
POST /api/content/:id/compare        ← runs all available providers in parallel
```

Set any combination of API keys to enable providers:
- `GOOGLE_API_KEY` → Gemini 2.0 Flash (free tier available)
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
| GET | `/api/events` | SSE stream for real-time updates |

## Security

- **Helmet** — HTTP security headers
- **CORS** — Restricted to `FRONTEND_URL`
- **Rate Limiting** — `@nestjs/throttler` on AI endpoints (10 req/min)
- **Input Validation** — `class-validator` + `class-transformer` on all DTOs
- **HTML Sanitization** — Global `SanitizePipe` using `sanitize-html`
- **UUID Validation** — `ParseUUIDPipe` on all ID params
- **Env Validation** — Startup check for required env vars

## Testing

```bash
# Backend (Jest) — 45 tests
cd backend && npm test

# Frontend (Vitest + Testing Library) — 6 tests
cd frontend && npm test
```

Test coverage:
- **status-machine.spec.ts** — All valid/invalid state transitions
- **model-factory.spec.ts** — Provider registration, default selection, error cases
- **campaigns.service.spec.ts** — CRUD operations with mocked Prisma
- **content.service.spec.ts** — CRUD, status transitions, event emission
- **StatusBadge.test.tsx** — Component rendering for all statuses

## Bonus Points Addressed

| Bonus | Status | Implementation |
|-------|--------|---------------|
| LangChain chaining | Done | LangGraph StateGraph pipeline (generate → translate → extract) |
| Multi-model comparison | Done | `/compare` endpoint runs all providers in parallel |
| Real-time | Done | SSE via NestJS `@Sse()` + EventEmitter2 |
| CI Pipeline | Done | GitHub Actions — typecheck, test, build for both projects |
| Automated tests | Done | Jest (backend) + Vitest (frontend), 51 tests total |

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
├── compose.yml
├── .env.example
└── docs/
```
