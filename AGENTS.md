# AGENTS.md — AI Content Workflow Challenge

> Comprehensive project knowledge base for AI coding agents (Claude, GPT, Copilot, etc.).
> Read this file in full before making any changes to the codebase.

---

## 1. Project Overview

**Company:** ACME GLOBAL MEDIA (fictional)
**Domain:** Marketing content creation and review, powered by AI.
**Goal:** Build a fullstack system that manages **campaign-based content creation**, uses **LLMs** to generate/translate/analyze content, and provides a **human-in-the-loop review workflow** with real-time updates.

### Core Value Proposition

ACME produces ads, micro-sites, and marketing materials in multiple languages. This system replaces slow, error-prone manual content creation by:

1. **Generating** initial content drafts (headlines, descriptions, body copy) via AI.
2. **Translating/localizing** content into multiple target languages via AI.
3. **Extracting** structured metadata (keywords, tone, sentiment) from content.
4. **Tracking** a review workflow where humans accept, edit, or reject AI suggestions.
5. **Broadcasting** updates to all connected users in real-time.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | TypeScript + NestJS | Modular architecture, decorators, DI, first-class TypeScript support |
| **API** | REST + WebSockets | REST for standard CRUD; WebSockets (Socket.IO) for real-time push |
| **Frontend** | React + Vite + TypeScript | Fast dev server, modern tooling, lightweight |
| **UI Library** | Tailwind CSS + shadcn/ui | Utility-first styling, accessible component primitives |
| **Database** | PostgreSQL 16 | Primary relational store, JSONB for flexible AI metadata |
| **ORM** | Prisma | Type-safe queries, migrations, schema-first design |
| **AI - Primary** | OpenAI SDK (`openai`) | GPT-4o for content generation, translation, extraction |
| **AI - Secondary** | Anthropic SDK (`@anthropic-ai/sdk`) | Claude for multi-model comparison |
| **AI - Orchestration** | LangChain.js (`langchain`) | Chain tasks: generate → translate → summarize → extract |
| **Cache / PubSub** | Redis | Cache AI responses, pub/sub for real-time event fan-out |
| **Containerization** | Docker + docker-compose | Single `docker compose up` to run everything |
| **CI/CD** | GitHub Actions | Lint, test, build, Docker image validation |
| **Testing** | Jest (backend) + Vitest (frontend) | Unit and integration tests |

### Why REST instead of GraphQL?

REST is chosen as the primary API style because:
- The data model is well-defined and not deeply nested — campaigns have content pieces, content pieces have drafts.
- REST is simpler to cache (HTTP caching, Redis).
- Real-time is handled separately via WebSockets, which is more natural for push-based updates than GraphQL subscriptions for this use case.
- REST is universally understood and easier to debug.

WebSockets complement REST by pushing state changes (new draft generated, review status changed) to all connected clients without polling.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)            │
│  Campaign Dashboard │ Content Editor │ Review Panel     │
│  ───────────────────────────────────────────────────    │
│  REST API Client (fetch/axios) │ WebSocket Client (io)  │
└──────────────┬──────────────────────┬───────────────────┘
               │ HTTP                 │ WS
┌──────────────▼──────────────────────▼───────────────────┐
│                   Backend (NestJS)                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Campaigns   │  │ Content      │  │ AI            │  │
│  │ Module      │  │ Module       │  │ Module        │  │
│  └─────────────┘  └──────────────┘  └───────┬───────┘  │
│                                              │          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────▼───────┐  │
│  │ Review      │  │ WebSocket    │  │ LangChain     │  │
│  │ Module      │  │ Gateway      │  │ Service       │  │
│  └─────────────┘  └──────┬───────┘  └───────────────┘  │
│                          │                              │
│         ┌────────────────▼─────────────────┐            │
│         │          Redis (PubSub)          │            │
│         └──────────────────────────────────┘            │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────▼───────┐
       │  PostgreSQL    │
       │  (Prisma ORM)  │
       └───────────────┘
```

### Module Breakdown

| Module | Responsibility |
|---|---|
| `CampaignsModule` | CRUD for campaigns, query campaigns with nested content |
| `ContentModule` | CRUD for content pieces, manage content within campaigns |
| `AiModule` | Orchestrate AI generation, translation, extraction via LangChain |
| `ReviewModule` | State machine for review workflow, transition validation |
| `WebSocketModule` | Gateway for real-time events, broadcasts state changes |
| `RedisModule` | Shared Redis client, pub/sub helpers |
| `PrismaModule` | Database client, connection management |

---

## 4. Data Model

### Entity Relationship Diagram

```
Campaign 1──* ContentPiece 1──* AiDraft
                                  │
                                  * AiDraftReview (embedded in AiDraft state)
```

### Campaign

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique identifier |
| `name` | VARCHAR(255) | Campaign name |
| `description` | TEXT | Campaign brief/description |
| `status` | ENUM | `active`, `paused`, `completed`, `archived` |
| `targetLanguages` | TEXT[] | Array of ISO 639-1 language codes (e.g. `["es", "fr", "de"]`) |
| `sourceLanguage` | VARCHAR(5) | Default source language (e.g. `"en"`) |
| `createdAt` | TIMESTAMP | Auto-generated |
| `updatedAt` | TIMESTAMP | Auto-updated |

### ContentPiece

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique identifier |
| `campaignId` | UUID (FK) | References Campaign |
| `type` | ENUM | `headline`, `description`, `body`, `cta`, `tagline` |
| `originalText` | TEXT | The original/seed text (may be empty if AI generates from scratch) |
| `language` | VARCHAR(5) | Language of this content piece |
| `metadata` | JSONB | Flexible field for keywords, tone, sentiment, etc. |
| `createdAt` | TIMESTAMP | Auto-generated |
| `updatedAt` | TIMESTAMP | Auto-updated |

### AiDraft

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique identifier |
| `contentPieceId` | UUID (FK) | References ContentPiece |
| `provider` | ENUM | `openai`, `anthropic` |
| `model` | VARCHAR(100) | Model identifier (e.g. `gpt-4o`, `claude-sonnet-4-20250514`) |
| `taskType` | ENUM | `generation`, `translation`, `extraction`, `summarization` |
| `targetLanguage` | VARCHAR(5) | Target language (for translations), NULL for other tasks |
| `generatedText` | TEXT | The AI-generated content |
| `metadata` | JSONB | Extracted data: `{ keywords, tone, sentiment, confidence }` |
| `reviewState` | ENUM | `draft`, `ai_suggested`, `reviewed`, `approved`, `rejected` |
| `reviewerNotes` | TEXT | Human reviewer comments |
| `editedText` | TEXT | Human-edited version of the generated text (NULL if unedited) |
| `createdAt` | TIMESTAMP | Auto-generated |
| `updatedAt` | TIMESTAMP | Auto-updated |

### Review State Machine

```
  ┌───────┐     AI generates     ┌──────────────┐
  │ draft │ ──────────────────▶  │ ai_suggested  │
  └───────┘                      └──────┬───────┘
                                        │
                                  human reviews
                                        │
                                 ┌──────▼───────┐
                                 │   reviewed    │
                                 └──────┬───────┘
                                        │
                          ┌─────────────┼─────────────┐
                          ▼                           ▼
                   ┌──────────┐                ┌──────────┐
                   │ approved │                │ rejected │
                   └──────────┘                └──────────┘
                                                     │
                                               can regenerate
                                                     │
                                               ┌─────▼─────┐
                                               │   draft    │
                                               └───────────┘
```

**Valid transitions:**
- `draft` → `ai_suggested` (AI generates content)
- `ai_suggested` → `reviewed` (human opens and reviews)
- `reviewed` → `approved` (human approves)
- `reviewed` → `rejected` (human rejects)
- `rejected` → `draft` (reset for regeneration)

---

## 5. API Design

### Base URL: `/api/v1`

### Campaigns

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/campaigns` | Create a new campaign |
| `GET` | `/campaigns` | List all campaigns (with pagination, filters) |
| `GET` | `/campaigns/:id` | Get campaign with nested content pieces and drafts |
| `PATCH` | `/campaigns/:id` | Update campaign details |
| `DELETE` | `/campaigns/:id` | Soft-delete / archive a campaign |

### Content Pieces

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/campaigns/:campaignId/content` | Create a content piece in a campaign |
| `GET` | `/campaigns/:campaignId/content` | List content pieces for a campaign |
| `GET` | `/content/:id` | Get a content piece with its drafts |
| `PATCH` | `/content/:id` | Update a content piece |
| `DELETE` | `/content/:id` | Delete a content piece |

### AI Drafts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/content/:contentId/generate` | Generate an AI draft for a content piece |
| `POST` | `/content/:contentId/translate` | Translate content to target language(s) |
| `POST` | `/content/:contentId/extract` | Extract metadata (keywords, tone, sentiment) |
| `GET` | `/content/:contentId/drafts` | List all AI drafts for a content piece |
| `GET` | `/drafts/:id` | Get a single draft |

### Review

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/drafts/:id/review` | Transition draft to `reviewed` state |
| `PATCH` | `/drafts/:id/approve` | Approve a reviewed draft (with optional edited text) |
| `PATCH` | `/drafts/:id/reject` | Reject a reviewed draft (with reviewer notes) |
| `PATCH` | `/drafts/:id/reset` | Reset rejected draft back to `draft` state |

### WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `draft:created` | Server → Client | `{ draftId, contentPieceId, campaignId, provider }` |
| `draft:updated` | Server → Client | `{ draftId, reviewState, updatedAt }` |
| `campaign:updated` | Server → Client | `{ campaignId, field, value }` |
| `content:updated` | Server → Client | `{ contentPieceId, campaignId }` |

Clients join rooms by `campaignId` to receive only relevant updates.

---

## 6. AI Integration Design

### LangChain Pipeline

The AI module uses LangChain to chain tasks in a composable pipeline:

```
ContentPiece.originalText
       │
       ▼
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Generate    │ ──▶ │  Translate    │ ──▶ │  Extract     │
│  (draft)     │     │  (localize)   │     │  (metadata)  │
└──────────────┘     └───────────────┘     └──────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
   AiDraft             AiDraft(s)           metadata JSON
   (source lang)       (per target lang)    { keywords, tone,
                                              sentiment }
```

### Multi-Model Support

Both OpenAI and Anthropic are available. The user can:
- Choose a provider per generation request.
- Trigger **comparison mode**: generate with both providers simultaneously and review side-by-side.

### Prompt Design

Prompts are stored as templates in `backend/src/ai/prompts/` and use LangChain's `PromptTemplate`:

- `generation.prompt.ts` — Generate marketing content given campaign context and content type.
- `translation.prompt.ts` — Translate while preserving tone, brand voice, and cultural nuance.
- `extraction.prompt.ts` — Extract structured JSON: keywords, tone (formal/casual/urgent), sentiment (-1 to 1).
- `summarization.prompt.ts` — Summarize content for campaign overview.

### Error Handling for AI Calls

- Retry with exponential backoff (3 attempts).
- Fallback to secondary provider if primary fails.
- Store partial results; never lose data on timeout.
- Rate-limit AI calls per campaign to prevent abuse.

---

## 7. Frontend Architecture

### Page Structure

```
/                       → Redirect to /campaigns
/campaigns              → Campaign list/dashboard
/campaigns/new          → Create new campaign form
/campaigns/:id          → Campaign detail with content pieces
/campaigns/:id/content/:contentId → Content piece detail with drafts & review
```

### Key Components

| Component | Purpose |
|---|---|
| `CampaignDashboard` | Grid/list of all campaigns with status indicators |
| `CampaignDetail` | Campaign info + list of content pieces + progress stats |
| `ContentPieceCard` | Card showing content piece with latest draft status |
| `AiGenerationPanel` | Controls to trigger AI generation (provider, options) |
| `DraftComparison` | Side-by-side view of OpenAI vs Anthropic outputs |
| `ReviewPanel` | Human review interface: approve/edit/reject with notes |
| `TranslationGrid` | Grid showing content across all target languages |
| `RealTimeIndicator` | Visual indicator when live updates arrive |

### State Management

- **Server state:** TanStack Query (React Query) for API data fetching, caching, and optimistic updates.
- **WebSocket state:** Custom hook `useRealtimeUpdates` that listens to Socket.IO events and invalidates relevant React Query caches.
- **Form state:** React Hook Form for campaign/content creation forms.
- **UI state:** Local component state (no global store needed for this scope).

---

## 8. Folder Structure

```
/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                    # Lint, test, build pipeline
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── PLAN.md                       # Implementation plan
│   ├── architecture.md               # Architecture decisions
│   └── api-examples.md               # API usage examples
├── backend/
│   ├── src/
│   │   ├── main.ts                   # NestJS bootstrap
│   │   ├── app.module.ts             # Root module
│   │   ├── common/                   # Shared utilities, guards, pipes
│   │   │   ├── dto/                  # Shared DTOs
│   │   │   ├── filters/              # Exception filters
│   │   │   ├── interceptors/         # Logging, transform interceptors
│   │   │   └── pipes/               # Validation pipes
│   │   ├── prisma/                   # Prisma module & service
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── schema.prisma
│   │   ├── campaigns/                # Campaigns module
│   │   │   ├── campaigns.module.ts
│   │   │   ├── campaigns.controller.ts
│   │   │   ├── campaigns.service.ts
│   │   │   ├── dto/
│   │   │   └── campaigns.spec.ts
│   │   ├── content/                  # Content pieces module
│   │   │   ├── content.module.ts
│   │   │   ├── content.controller.ts
│   │   │   ├── content.service.ts
│   │   │   ├── dto/
│   │   │   └── content.spec.ts
│   │   ├── ai/                       # AI integration module
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── openai.provider.ts
│   │   │   │   └── anthropic.provider.ts
│   │   │   ├── chains/
│   │   │   │   ├── generation.chain.ts
│   │   │   │   ├── translation.chain.ts
│   │   │   │   └── extraction.chain.ts
│   │   │   ├── prompts/
│   │   │   │   ├── generation.prompt.ts
│   │   │   │   ├── translation.prompt.ts
│   │   │   │   └── extraction.prompt.ts
│   │   │   └── ai.spec.ts
│   │   ├── drafts/                   # AI drafts module
│   │   │   ├── drafts.module.ts
│   │   │   ├── drafts.controller.ts
│   │   │   ├── drafts.service.ts
│   │   │   ├── dto/
│   │   │   └── drafts.spec.ts
│   │   ├── review/                   # Review workflow module
│   │   │   ├── review.module.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── review.service.ts
│   │   │   ├── review-state.machine.ts
│   │   │   └── review.spec.ts
│   │   └── websocket/                # WebSocket gateway
│   │       ├── websocket.module.ts
│   │       ├── websocket.gateway.ts
│   │       └── websocket.spec.ts
│   ├── test/
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── Dockerfile
│   ├── tsconfig.json
│   ├── package.json
│   └── nest-cli.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Root component + router
│   │   ├── api/                      # API client layer
│   │   │   ├── client.ts             # Axios/fetch instance
│   │   │   ├── campaigns.ts          # Campaign API functions
│   │   │   ├── content.ts            # Content API functions
│   │   │   ├── drafts.ts             # Draft API functions
│   │   │   └── types.ts              # Shared API types
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useCampaigns.ts
│   │   │   ├── useContent.ts
│   │   │   ├── useDrafts.ts
│   │   │   └── useRealtimeUpdates.ts
│   │   ├── components/               # Reusable UI components
│   │   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── layout/               # Shell, sidebar, nav
│   │   │   ├── campaigns/            # Campaign-specific components
│   │   │   ├── content/              # Content-specific components
│   │   │   ├── ai/                   # AI generation & comparison
│   │   │   └── review/               # Review workflow components
│   │   ├── pages/                    # Page-level components
│   │   │   ├── CampaignListPage.tsx
│   │   │   ├── CampaignDetailPage.tsx
│   │   │   ├── CreateCampaignPage.tsx
│   │   │   └── ContentDetailPage.tsx
│   │   ├── lib/                      # Utilities
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   └── types/                    # TypeScript types
│   │       └── index.ts
│   ├── public/
│   ├── index.html
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── compose.yml                       # Docker Compose (all services)
├── .env.example                      # Environment variable template
├── AGENTS.md                         # This file
├── README.md                         # Setup instructions + decisions
├── .prettierrc.js
└── eslint.config.mjs
```

---

## 9. Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/acme_content?schema=public

# Redis
REDIS_URL=redis://redis:6379

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# App
BACKEND_PORT=3000
FRONTEND_PORT=5173
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

---

## 10. Docker Services

```yaml
services:
  db:        # PostgreSQL 16 — port 5432
  redis:     # Redis 7 — port 6379
  backend:   # NestJS app — port 3000
  frontend:  # Vite dev server — port 5173
```

**Startup order:** `db` → `redis` → `backend` (runs prisma migrate + seed) → `frontend`

---

## 11. Coding Conventions

### General
- **Language:** TypeScript (strict mode) everywhere.
- **Formatting:** Prettier with project config.
- **Linting:** ESLint flat config.
- **Naming:** camelCase for variables/functions, PascalCase for classes/components/types, SCREAMING_SNAKE for constants.
- **Imports:** Absolute imports where possible (`@/` prefix in frontend, `src/` paths in backend via `tsconfig.paths`).

### Backend (NestJS)
- One module per domain entity.
- Controllers handle HTTP concerns only (validation, serialization). Business logic lives in services.
- Use DTOs with `class-validator` decorators for all inputs.
- Use Prisma for all database access — no raw SQL unless absolutely necessary.
- Every service method that mutates state must emit a WebSocket event via the gateway.
- AI calls are always async and wrapped in try/catch with structured error responses.

### Frontend (React)
- Functional components only.
- Custom hooks for all data fetching (wrapping TanStack Query).
- Components are pure where possible; side effects live in hooks.
- Pages are thin: compose components, pass data down.
- Use TypeScript strict types matching the backend DTOs.

### Testing
- Backend: Jest with `@nestjs/testing` for unit tests; supertest for e2e.
- Frontend: Vitest + React Testing Library.
- Minimum coverage targets: services 80%, controllers 70%.

---

## 12. Key Decisions & Tradeoffs

| Decision | Rationale | Tradeoff |
|---|---|---|
| REST over GraphQL | Simpler for this scope, easier caching, WS handles real-time | Less flexible for complex nested queries |
| Prisma over TypeORM | Better DX, type safety, schema-first migrations | Less mature for complex raw queries |
| Socket.IO over SSE | Bi-directional, rooms support, auto-reconnect | Heavier than SSE for one-way push |
| LangChain for AI | Composable chains, provider abstraction, structured output parsing | Extra dependency, abstraction overhead |
| Redis for pub/sub | Decouples WS gateway from business logic, scales horizontally | Extra infrastructure component |
| JSONB for metadata | Flexible schema for varying AI extraction results | Harder to query/index than normalized columns |
| shadcn/ui over MUI | Lightweight, composable, no runtime CSS-in-JS overhead | More manual styling effort |

---

## 13. Common Tasks for Agents

### Adding a new API endpoint
1. Define the DTO in the module's `dto/` folder with `class-validator` decorators.
2. Add the route handler in the controller.
3. Implement business logic in the service.
4. If it mutates state, emit a WebSocket event.
5. Add a unit test for the service method.

### Adding a new AI task type
1. Create a new prompt template in `backend/src/ai/prompts/`.
2. Create a new LangChain chain in `backend/src/ai/chains/`.
3. Add the task type to the `taskType` enum in the Prisma schema.
4. Expose it via a new endpoint in the AI controller.
5. Add a corresponding frontend trigger button and hook.

### Adding a new frontend page
1. Create the page component in `frontend/src/pages/`.
2. Add the route in `App.tsx`.
3. Create any needed API functions in `frontend/src/api/`.
4. Create a custom hook in `frontend/src/hooks/` if data fetching is needed.
5. Build/reuse components from `frontend/src/components/`.

---

## 14. Error Handling Strategy

- **Backend:** Global exception filter catches all unhandled errors and returns consistent JSON: `{ statusCode, message, error, timestamp }`.
- **Validation:** DTOs with `class-validator` + NestJS `ValidationPipe` (global) return 400 with field-level errors.
- **AI failures:** Caught at the service level, stored as failed drafts with error details in metadata. Client receives 202 (accepted) for async generation and polls or receives WS update.
- **Frontend:** TanStack Query `onError` handlers show toast notifications. Network errors trigger retry logic (3 attempts with backoff).

---

## 15. Security Considerations

- All user inputs validated and sanitized via DTOs.
- CORS restricted to frontend origin.
- Rate limiting on AI generation endpoints (to prevent API key abuse).
- Environment variables for all secrets (never committed).
- Docker containers run as non-root users.
- SQL injection prevented by Prisma parameterized queries.
