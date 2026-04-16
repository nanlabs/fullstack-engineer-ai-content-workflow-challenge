# Implementation Plan — AI Content Workflow

> Step-by-step plan to build the ACME GLOBAL MEDIA AI Content Workflow system.
> Each phase is designed to be completed sequentially, with clear deliverables and acceptance criteria.

---

## Phase 0: Project Scaffolding & Infrastructure

**Goal:** Set up the monorepo structure, Docker infrastructure, and CI pipeline so that all subsequent development happens inside a reproducible environment.

### Step 0.1 — Initialize Monorepo Structure

- [ ] Create folder structure: `backend/`, `frontend/`, `docs/`, `.github/workflows/`
- [ ] Create root-level config files:
  - `.env.example` with all required environment variables
  - `.prettierrc.js` with shared formatting rules
  - `eslint.config.mjs` with shared linting rules
  - `.gitignore` (Node, Python, Docker, IDE files)

### Step 0.2 — Docker & Compose Setup

- [ ] Create `compose.yml` with services:
  - `db` — PostgreSQL 16 (volume for persistence, healthcheck)
  - `redis` — Redis 7 (healthcheck)
  - `backend` — NestJS app (depends on db, redis; hot-reload via volume mount)
  - `frontend` — Vite dev server (hot-reload via volume mount)
- [ ] Create `backend/Dockerfile` (multi-stage: deps → build → run)
- [ ] Create `frontend/Dockerfile` (multi-stage: deps → build → serve with nginx for prod; dev target for development)
- [ ] Verify: `docker compose up` starts all four services and they can communicate

### Step 0.3 — GitHub Actions CI

- [ ] Create `.github/workflows/ci.yml`:
  - Trigger on push to `main` and PRs
  - Jobs: lint, type-check, test (backend), test (frontend), docker build
- [ ] Ensure CI passes on an empty project (no tests yet = no failures)

**Deliverables:** Running Docker stack, CI pipeline, clean folder structure.

---

## Phase 1: Backend Foundation

**Goal:** Build the NestJS backend with database schema, core CRUD endpoints, and validation.

### Step 1.1 — Initialize NestJS Project

- [ ] Scaffold NestJS project inside `backend/` with TypeScript strict mode
- [ ] Install dependencies:
  - `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
  - `@nestjs/config` (environment variables)
  - `@nestjs/swagger` (auto-generated API docs)
  - `class-validator`, `class-transformer` (DTO validation)
  - `prisma`, `@prisma/client`
- [ ] Configure global validation pipe, exception filter, CORS
- [ ] Set up Swagger at `/api/docs`

### Step 1.2 — Prisma Schema & Database

- [ ] Create `prisma/schema.prisma` with models:
  - `Campaign` — id, name, description, status, targetLanguages, sourceLanguage, timestamps
  - `ContentPiece` — id, campaignId, type, originalText, language, metadata, timestamps
  - `AiDraft` — id, contentPieceId, provider, model, taskType, targetLanguage, generatedText, metadata, reviewState, reviewerNotes, editedText, timestamps
- [ ] Define enums: `CampaignStatus`, `ContentType`, `AiProvider`, `TaskType`, `ReviewState`
- [ ] Create initial migration: `npx prisma migrate dev --name init`
- [ ] Create `PrismaModule` and `PrismaService` (global module)
- [ ] Create `prisma/seed.ts` with sample data (2 campaigns, 4 content pieces each)

### Step 1.3 — Campaigns Module

- [ ] Generate `CampaignsModule` with controller and service
- [ ] Implement DTOs:
  - `CreateCampaignDto` — name (required), description, targetLanguages, sourceLanguage
  - `UpdateCampaignDto` — partial of create + status
  - `CampaignQueryDto` — pagination (page, limit), filter by status, search by name
- [ ] Implement endpoints:
  - `POST /api/v1/campaigns` — create campaign
  - `GET /api/v1/campaigns` — list with pagination and filtering
  - `GET /api/v1/campaigns/:id` — get with nested content pieces and their draft counts
  - `PATCH /api/v1/campaigns/:id` — update
  - `DELETE /api/v1/campaigns/:id` — soft-delete (set status to `archived`)
- [ ] Write unit tests for `CampaignsService` (Jest)

### Step 1.4 — Content Pieces Module

- [ ] Generate `ContentModule` with controller and service
- [ ] Implement DTOs:
  - `CreateContentPieceDto` — type (required), originalText, language
  - `UpdateContentPieceDto` — partial of create
- [ ] Implement endpoints:
  - `POST /api/v1/campaigns/:campaignId/content` — create content piece
  - `GET /api/v1/campaigns/:campaignId/content` — list content pieces for campaign
  - `GET /api/v1/content/:id` — get content piece with drafts
  - `PATCH /api/v1/content/:id` — update
  - `DELETE /api/v1/content/:id` — delete
- [ ] Write unit tests for `ContentService`

### Step 1.5 — Drafts Module (CRUD only, no AI yet)

- [ ] Generate `DraftsModule` with controller and service
- [ ] Implement endpoints:
  - `GET /api/v1/content/:contentId/drafts` — list drafts
  - `GET /api/v1/drafts/:id` — get a draft
- [ ] These will be populated by the AI module in Phase 2

**Deliverables:** Full CRUD API for campaigns, content, drafts. Swagger docs. Unit tests. Seed data.

---

## Phase 2: AI Integration

**Goal:** Integrate OpenAI and Anthropic via LangChain to generate, translate, and extract metadata from content.

### Step 2.1 — AI Module Setup

- [ ] Create `AiModule` with `AiService`
- [ ] Install dependencies:
  - `openai` (OpenAI SDK)
  - `@anthropic-ai/sdk` (Anthropic SDK)
  - `langchain`, `@langchain/openai`, `@langchain/anthropic`, `@langchain/core`
- [ ] Create provider abstraction:
  - `OpenAiProvider` — wraps OpenAI SDK via LangChain's `ChatOpenAI`
  - `AnthropicProvider` — wraps Anthropic SDK via LangChain's `ChatAnthropic`
- [ ] Configure via `@nestjs/config` with API keys from environment

### Step 2.2 — Content Generation Chain

- [ ] Create prompt template `generation.prompt.ts`:
  - Input: campaign context (name, description), content type, source language
  - Output: generated marketing content
  - Include system prompt establishing the AI as a marketing copywriter
- [ ] Create `GenerationChain` using LangChain's `RunnableSequence`:
  - Prompt → LLM → Output parser (string)
- [ ] Implement endpoint: `POST /api/v1/content/:contentId/generate`
  - Body: `{ provider: "openai" | "anthropic", options?: { tone, style } }`
  - Creates `AiDraft` with `taskType: "generation"`, `reviewState: "ai_suggested"`
  - Returns the created draft
- [ ] Support comparison mode: `{ provider: "both" }` generates with both providers in parallel

### Step 2.3 — Translation Chain

- [ ] Create prompt template `translation.prompt.ts`:
  - Input: source text, source language, target language, brand/tone context
  - Output: translated/localized text
  - Instruct the model to preserve marketing tone and cultural nuances
- [ ] Create `TranslationChain` using LangChain
- [ ] Implement endpoint: `POST /api/v1/content/:contentId/translate`
  - Body: `{ targetLanguages: ["es", "fr"], provider: "openai" | "anthropic" }`
  - Creates one `AiDraft` per target language
  - Returns array of created drafts

### Step 2.4 — Metadata Extraction Chain

- [ ] Create prompt template `extraction.prompt.ts`:
  - Input: text content
  - Output: structured JSON `{ keywords: string[], tone: string, sentiment: number, summary: string }`
  - Use LangChain's `StructuredOutputParser` for reliable JSON extraction
- [ ] Create `ExtractionChain`
- [ ] Implement endpoint: `POST /api/v1/content/:contentId/extract`
  - Extracts metadata and stores in the content piece's `metadata` JSONB field
  - Returns the extracted metadata

### Step 2.5 — Full Pipeline Chain (Bonus)

- [ ] Create a composite chain: generate → translate (all target languages) → extract metadata
- [ ] Implement endpoint: `POST /api/v1/content/:contentId/pipeline`
  - Runs the full chain
  - Creates multiple drafts (original + translations) + updates metadata
- [ ] Use LangChain's `RunnableParallel` for concurrent translations

### Step 2.6 — AI Error Handling & Resilience

- [ ] Implement retry logic with exponential backoff (3 attempts)
- [ ] Add rate limiting on AI endpoints (e.g., 10 requests per minute per campaign)
- [ ] Handle token limit errors gracefully (truncate input, inform user)
- [ ] Log all AI interactions (prompt, response, latency, tokens used) for debugging
- [ ] Write unit tests for AI service (mock LLM responses)

**Deliverables:** Working AI generation, translation, and extraction. Multi-model support. LangChain pipelines. Tests with mocked AI responses.

---

## Phase 3: Review Workflow

**Goal:** Implement the state machine for reviewing AI drafts with validation and audit trail.

### Step 3.1 — Review State Machine

- [ ] Create `review-state.machine.ts` with:
  - Valid states: `draft`, `ai_suggested`, `reviewed`, `approved`, `rejected`
  - Valid transitions (see AGENTS.md for diagram)
  - Transition validation function: `canTransition(from, to): boolean`
  - Transition side-effects (e.g., timestamps, notifications)
- [ ] Write thorough unit tests for all valid and invalid transitions

### Step 3.2 — Review Endpoints

- [ ] Create `ReviewModule` with controller and service
- [ ] Implement endpoints:
  - `PATCH /api/v1/drafts/:id/review` — mark as reviewed
  - `PATCH /api/v1/drafts/:id/approve` — approve (body: `{ editedText? }`)
  - `PATCH /api/v1/drafts/:id/reject` — reject (body: `{ reviewerNotes }`)
  - `PATCH /api/v1/drafts/:id/reset` — reset rejected to draft
- [ ] Each endpoint validates the state transition, returns 409 Conflict if invalid
- [ ] Write integration tests for the full review flow

### Step 3.3 — Bulk Review Operations

- [ ] `POST /api/v1/drafts/bulk-approve` — approve multiple drafts at once
  - Body: `{ draftIds: string[] }`
  - Returns results per draft (success/failure with reason)
- [ ] Useful for approving all translations of a content piece at once

**Deliverables:** Complete review workflow with state validation. Bulk operations. Tests.

---

## Phase 4: Real-Time Updates

**Goal:** Push state changes to all connected clients via WebSockets.

### Step 4.1 — WebSocket Gateway Setup

- [ ] Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- [ ] Create `WebSocketModule` with `WebSocketGateway`
- [ ] Configure CORS for WebSocket connections
- [ ] Implement room-based subscriptions:
  - Client joins room `campaign:{campaignId}` when viewing a campaign
  - Client leaves room when navigating away

### Step 4.2 — Redis Pub/Sub Integration

- [ ] Install `ioredis`
- [ ] Create `RedisModule` with pub/sub service
- [ ] When a service mutates state, it publishes an event to Redis
- [ ] WebSocket gateway subscribes to Redis channels and broadcasts to rooms
- [ ] This decouples the gateway from business logic and enables horizontal scaling

### Step 4.3 — Event Emission

- [ ] Modify `CampaignsService` to emit events on create/update/delete
- [ ] Modify `ContentService` to emit events on create/update/delete
- [ ] Modify `DraftsService` to emit events on draft creation
- [ ] Modify `ReviewService` to emit events on state transitions
- [ ] Events include: `draft:created`, `draft:updated`, `campaign:updated`, `content:updated`

### Step 4.4 — Frontend WebSocket Client

- [ ] Install `socket.io-client`
- [ ] Create `useRealtimeUpdates` hook:
  - Connects to WebSocket server on mount
  - Joins campaign room when user navigates to a campaign
  - Listens for events and invalidates relevant React Query caches
  - Shows toast notification for remote updates
- [ ] Add `RealTimeIndicator` component (green dot when connected, red when disconnected)

**Deliverables:** Real-time updates across all clients. Redis-backed pub/sub. Connection status indicator.

---

## Phase 5: Frontend Application

**Goal:** Build a polished React frontend with campaign dashboard, AI controls, and review interface.

### Step 5.1 — Initialize React Project

- [ ] Scaffold Vite + React + TypeScript project in `frontend/`
- [ ] Install dependencies:
  - `react-router-dom` (routing)
  - `@tanstack/react-query` (server state)
  - `tailwindcss`, `@tailwindcss/typography` (styling)
  - `shadcn/ui` components (button, card, dialog, dropdown, input, select, badge, toast, tabs)
  - `lucide-react` (icons)
  - `react-hook-form`, `zod` (forms + validation)
  - `socket.io-client` (WebSocket)
  - `date-fns` (date formatting)
- [ ] Set up Tailwind CSS, shadcn/ui, and dark mode support
- [ ] Create `api/client.ts` with base axios/fetch instance pointing to backend

### Step 5.2 — Layout & Navigation

- [ ] Create `AppLayout` component:
  - Sidebar with navigation: Campaigns, (future: Settings)
  - Top bar with app title and connection status indicator
  - Main content area
- [ ] Set up React Router with routes:
  - `/campaigns` — campaign list
  - `/campaigns/new` — create campaign
  - `/campaigns/:id` — campaign detail
  - `/campaigns/:id/content/:contentId` — content detail

### Step 5.3 — Campaign Dashboard (List Page)

- [ ] Create `CampaignListPage`:
  - Grid of campaign cards showing: name, status badge, language tags, content count, progress bar (% approved)
  - Search bar and status filter dropdown
  - "New Campaign" button
  - Pagination controls
- [ ] Create `useCampaigns` hook wrapping React Query
- [ ] Responsive design: grid on desktop, stack on mobile

### Step 5.4 — Create Campaign Page

- [ ] Create `CreateCampaignPage` with form:
  - Name (required)
  - Description (textarea)
  - Source language (dropdown)
  - Target languages (multi-select)
- [ ] Use React Hook Form + Zod schema validation
- [ ] On submit: POST to API, navigate to campaign detail

### Step 5.5 — Campaign Detail Page

- [ ] Create `CampaignDetailPage`:
  - Campaign header: name, description, status, edit button
  - Stats bar: total content pieces, drafts generated, approved %, rejected count
  - Content pieces list:
    - Each card shows: type badge, original text preview, latest draft status, language
    - Quick actions: generate, translate, view drafts
  - "Add Content Piece" button/modal
- [ ] Create `useContent` hook for fetching content pieces
- [ ] Wire up real-time updates (drafts updating status in real time)

### Step 5.6 — Content Detail Page with AI Controls

- [ ] Create `ContentDetailPage`:
  - Content piece info: type, original text (editable), language
  - **AI Generation Panel:**
    - Provider selector (OpenAI / Anthropic / Both)
    - Optional tone/style controls
    - "Generate Draft" button with loading state
  - **Translation Panel:**
    - Shows target languages from campaign
    - "Translate All" or individual translate buttons
    - Grid showing translation status per language
  - **Metadata Panel:**
    - "Extract Metadata" button
    - Displays keywords as tags, tone, sentiment gauge
  - **Drafts List:**
    - All drafts sorted by creation date
    - Each shows: provider badge, task type, review state badge, preview text
    - Click to expand full text and review controls
- [ ] Create `useDrafts` hook

### Step 5.7 — Review Interface

- [ ] Create `ReviewPanel` component:
  - Original text on the left, AI-generated text on the right (diff view for edited)
  - Provider and model information displayed
  - Actions:
    - "Approve" button (green) — optionally with inline edit
    - "Reject" button (red) — requires reviewer notes (textarea)
    - "Request Regeneration" button — resets to draft
  - Inline text editor for making edits before approving
  - Review history / audit trail
- [ ] Create `DraftComparison` component:
  - Side-by-side view when multiple providers generated for same content
  - Highlight differences between OpenAI and Anthropic outputs
- [ ] Visual state indicators: color-coded badges for each review state

### Step 5.8 — Real-Time Integration

- [ ] Integrate `useRealtimeUpdates` hook across all pages
- [ ] When a draft is generated (by another tab/user), it appears live on the dashboard
- [ ] When a review state changes, badges update in real time
- [ ] Toast notifications: "New draft generated for [content piece name]"
- [ ] Optimistic updates for user's own actions

**Deliverables:** Complete, polished React frontend with all features. Real-time updates. Responsive design.

---

## Phase 6: Testing & Quality

**Goal:** Ensure reliability with automated tests and code quality tools.

### Step 6.1 — Backend Unit Tests

- [ ] `CampaignsService` — CRUD operations, validation, edge cases
- [ ] `ContentService` — CRUD, campaign association validation
- [ ] `AiService` — generation, translation, extraction (mocked LLM)
- [ ] `ReviewService` — all state transitions, invalid transition handling
- [ ] `WebSocketGateway` — event emission, room management
- [ ] Target: 80% coverage on services, 70% on controllers

### Step 6.2 — Backend Integration Tests (E2E)

- [ ] Full campaign lifecycle: create → add content → generate → review → approve
- [ ] Invalid state transition returns 409
- [ ] Pagination and filtering work correctly
- [ ] Use `@nestjs/testing` with in-memory database or test container

### Step 6.3 — Frontend Tests

- [ ] Component tests with React Testing Library:
  - `CampaignCard` renders correctly with various states
  - `ReviewPanel` shows correct actions based on draft state
  - `AiGenerationPanel` calls API and handles loading/error states
- [ ] Hook tests:
  - `useCampaigns` fetches and caches correctly
  - `useRealtimeUpdates` handles connection/disconnection
- [ ] Target: key user flows covered

### Step 6.4 — Linting & Formatting

- [ ] Configure Prettier: single quotes, trailing commas, 100 char line width
- [ ] Configure ESLint: TypeScript strict rules, import ordering, no unused vars
- [ ] Add lint-staged + husky for pre-commit hooks
- [ ] Ensure CI runs lint + type-check

**Deliverables:** Test suites passing. CI green. Code quality enforced.

---

## Phase 7: Documentation & Submission

**Goal:** Prepare the project for submission with thorough documentation.

### Step 7.1 — README.md

- [ ] Rewrite `README.md` as the project documentation:
  - **Quick Start:** `docker compose up` and done
  - **Architecture Overview:** brief summary with link to docs
  - **Tech Stack:** table with each technology and why it was chosen
  - **API Documentation:** link to Swagger docs at `/api/docs`
  - **Tech Decisions & Tradeoffs:** REST vs GraphQL justification, ORM choice, AI provider abstraction, real-time approach
  - **AI Design Choices:** prompt engineering approach, LangChain pipelines, multi-model strategy
  - **Testing:** how to run tests, coverage report
  - **Environment Variables:** table of all required vars

### Step 7.2 — Architecture Documentation

- [ ] Create `docs/architecture.md`:
  - System architecture diagram (ASCII or Mermaid)
  - Module dependency graph
  - Data flow for key scenarios (generation, review, real-time update)
  - Database schema diagram
- [ ] Create `docs/api-examples.md`:
  - cURL examples for every endpoint
  - Example request/response payloads

### Step 7.3 — Pull Request

- [ ] Create feature branch: `feat/ai-content-workflow`
- [ ] Commit history with meaningful messages:
  - `feat: scaffold project structure and Docker setup`
  - `feat: add Prisma schema and database migrations`
  - `feat: implement campaign CRUD API`
  - `feat: implement content piece CRUD API`
  - `feat: integrate OpenAI and Anthropic via LangChain`
  - `feat: add content generation, translation, and extraction endpoints`
  - `feat: implement review workflow state machine`
  - `feat: add WebSocket real-time updates with Redis pub/sub`
  - `feat: build React frontend with campaign dashboard`
  - `feat: add AI generation controls and review interface`
  - `feat: add real-time updates to frontend`
  - `test: add backend unit and integration tests`
  - `test: add frontend component tests`
  - `docs: add architecture documentation and API examples`
  - `ci: add GitHub Actions workflow`
- [ ] Open PR using the provided template

### Step 7.4 — Final Checklist

- [ ] `docker compose up` starts cleanly from scratch
- [ ] Seed data loads automatically
- [ ] All API endpoints work via Swagger
- [ ] Frontend renders and all features work
- [ ] Real-time updates work across multiple browser tabs
- [ ] AI generation works with at least one provider (graceful fallback if API key missing)
- [ ] Review workflow transitions correctly
- [ ] Tests pass in CI
- [ ] No linting errors
- [ ] README is clear and complete
- [ ] PR description is thorough

**Deliverables:** Complete submission ready for review.

---

## Implementation Order Summary

```
Phase 0: Scaffolding & Docker          (~2 hours)
Phase 1: Backend CRUD                   (~4 hours)
Phase 2: AI Integration                 (~4 hours)
Phase 3: Review Workflow                (~2 hours)
Phase 4: Real-Time (WebSockets)         (~2 hours)
Phase 5: Frontend                       (~6 hours)
Phase 6: Testing & Quality              (~3 hours)
Phase 7: Documentation & Submission     (~2 hours)
                                        ─────────
                                Total:  ~25 hours
```

### Critical Path

The longest dependency chain is:

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 7
                                              ↓
                                         Phase 5 (can start after Phase 1, iterate as backend grows)
                                              ↓
                                         Phase 6 (can start after Phase 1, grow with each phase)
```

**Parallel work opportunities:**
- Frontend (Phase 5) can start as soon as backend CRUD (Phase 1) is done, and evolve in parallel with Phases 2-4.
- Tests (Phase 6) can be written alongside each phase rather than all at the end.
- Documentation (Phase 7.1-7.2) can be drafted incrementally.

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| AI API keys unavailable | Mock AI responses with realistic data; feature flags to skip AI calls |
| Docker build issues | Multi-stage builds with explicit base images; test `docker compose up` early |
| Prisma migration conflicts | Single migration per schema change; test migrations in CI |
| WebSocket complexity | Start with simple polling, add WebSockets as enhancement |
| Time overrun | Each phase has a clear stopping point; MVP is Phases 0-3 + minimal Phase 5 |
| Rate limiting / cost | Cache AI responses in Redis; mock in development |

---

## Minimum Viable Submission (if time-constrained)

If time is limited, prioritize:

1. **Phase 0** — Docker setup (required)
2. **Phase 1** — Backend CRUD (required)
3. **Phase 2** — AI integration with at least one provider (required)
4. **Phase 3** — Review workflow (required)
5. **Phase 5.1-5.5** — Basic frontend showing campaigns + content (required)
6. **Phase 7.1** — README with setup instructions (required)

Nice-to-haves that can be dropped:
- Phase 4 (real-time) — replace with polling
- Phase 5.7 (comparison view) — show drafts in list instead
- Phase 6 (extensive testing) — keep only critical path tests
- Phase 2.5 (full pipeline chain) — generate and translate separately
