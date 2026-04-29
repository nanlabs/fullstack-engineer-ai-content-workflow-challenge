# ACME Content Workflow — AI Engineer Challenge

[![CI](https://github.com/maxivitale/fullstack-engineer-ai-content-workflow-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/maxivitale/fullstack-engineer-ai-content-workflow-challenge/actions/workflows/ci.yml)

Full-stack system for **ACME GLOBAL MEDIA** to manage a multilingual content workflow (creation, translation, review) powered by LLMs, with human-in-the-loop review.

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                     │
│  :5173 — Campaigns dashboard, Review UI, SSE token stream   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP + SSE
┌────────────────────▼────────────────────────────────────────┐
│  FastAPI backend                                            │
│  :8000 — REST API, SSE endpoints, LangGraph runner         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LangGraph content workflow (human-in-the-loop)      │   │
│  │  generate_draft → await_human_review → refine/done   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ asyncpg
┌────────────────────▼────────────────────────────────────────┐
│  PostgreSQL 16                                              │
│  :5432 — campaigns, content_pieces, drafts, workflow_runs   │
│           + LangGraph checkpoint store                      │
└─────────────────────────────────────────────────────────────┘
```

**Key design decision:** the review workflow (Draft → Suggested → Reviewed → Approved/Rejected) is modeled as a **LangGraph graph with `interrupt()` for human-in-the-loop**, not as loose CRUD endpoints. See [`docs/adr/`](docs/adr/) for all architectural decision records.

## Quick start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 26+ with Compose v2 (`docker compose`, not `docker-compose`)
- An Anthropic or OpenAI API key (optional — the app works with `MockProvider` without one)

### 1. Clone and configure

```bash
git clone <repo-url>
cd fullstack-engineer-ai-content-workflow-challenge

cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY or OPENAI_API_KEY
```

### 2. Start everything

```bash
docker compose up
```

On first run this will:
1. Pull `postgres:16-alpine` and build the backend/frontend images (~2 min)
2. Wait for Postgres to be healthy
3. Run Alembic migrations automatically
4. Seed demo data (idempotent — safe to run multiple times)
5. Start Uvicorn with hot-reload and Vite with HMR

Once up:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API docs (Swagger):** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

## Development commands

```bash
# Start everything
docker compose up

# Rebuild after dependency changes (pyproject.toml / package.json)
docker compose up --build

# Start in background
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Enter the backend container
docker compose exec backend bash

# Run backend tests inside the container
docker compose exec backend uv run pytest

# Run backend linter/formatter
docker compose exec backend uv run ruff check src tests scripts alembic
docker compose exec backend uv run ruff format src tests scripts alembic

# Apply a new migration
docker compose exec backend alembic revision --autogenerate -m "add_something"
docker compose exec backend alembic upgrade head

# Reset the DB (tear down volumes + restart from scratch)
docker compose down -v && docker compose up

# Start only the database (useful for local backend dev outside Docker)
docker compose up db -d
```

## Running outside Docker (local dev)

### Backend

```bash
cd backend
uv sync
cp ../.env.example ../.env   # fill in your keys

# Start Postgres first (see above), then:
uv run alembic upgrade head
uv run python -m scripts.seed
uv run uvicorn src.main:app --reload
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Pydantic v2 + SQLAlchemy 2 async + Alembic |
| AI agent | LangGraph + LangChain + Anthropic SDK + OpenAI SDK |
| Database | PostgreSQL 16 (also used as LangGraph checkpoint store) |
| Real-time | Server-Sent Events (SSE) |
| Frontend | Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui + TanStack Query |
| Tests | pytest + pytest-asyncio (back) / Vitest + RTL (front) |
| Lint/Format | Ruff (Python) / ESLint + Prettier (TypeScript) |
| Containers | Docker + Docker Compose v2 |
| CI | GitHub Actions (lint + test) |

## Tech decisions & tradeoffs

### Why LangGraph?

The review workflow is fundamentally a state machine: generate → await human → (approve / reject / regenerate). LangGraph models this natively with `interrupt()` for suspending the graph at the human review node and resuming it with feedback. This makes the flow explicit, auditable, and easy to extend (e.g. adding auto-approve rules).

### Why SSE over WebSockets?

All real-time communication in this app is **server → client** (token streaming, workflow status updates). SSE is simpler, works over plain HTTP/2, and doesn't require a separate upgrade handshake. WebSockets add bidirectional complexity we don't need.

### Why REST over GraphQL?

The domain is small and well-defined. REST endpoints map cleanly to the entities (campaigns, content pieces, drafts, workflows). SSE complements REST for streaming. GraphQL subscriptions would add complexity with no benefit at this scale.

### Why in-memory pub/sub?

MVP uses `asyncio.Queue` per SSE subscriber. A Redis pub/sub backend can be swapped in for multi-worker deployments — the `InMemoryEventBus` interface is already designed for this.

### Auth

Authentication is **intentionally not implemented**. The app uses a hardcoded mock reviewer (`reviewer@acme.com`). Adding auth (e.g. JWT + OAuth) would be the next step for a production deployment.

### Frontend in dev mode (not nginx)

The Docker setup serves the frontend via `pnpm dev` (Vite HMR) rather than a production nginx build. This was a deliberate choice:
- The challenge is evaluated locally, not deployed
- HMR lets reviewers experiment without rebuilding
- A production multi-stage build + nginx would be straightforward to add

## Troubleshooting

| Symptom | Likely cause | Solution |
|---------|--------------|----------|
| `compose up` hangs at "Waiting for postgres" | Port 5432 taken on host | `lsof -i :5432` and kill, or change the host port in compose.yml |
| Frontend doesn't hot-reload on edit | Polling not active in Docker Desktop | Verify `usePolling: true` in `frontend/vite.config.ts` |
| Backend won't start: `cannot connect to postgres` | Postgres not ready yet | Check healthcheck logs: `docker compose logs db` |
| No AI drafts generated | Missing API keys | Copy `.env.example` → `.env` and fill in your key |
| `docker compose up --build` fails on `pnpm install` | Network / cache issue | `docker system prune -af && docker compose build --no-cache` |
| SSE doesn't receive events in browser | Proxy buffering | Verify response header `X-Accel-Buffering: no` |
| `pnpm install` fails on Windows host | pnpm virtual store incompatibility | `frontend/.npmrc` sets `node-linker=hoisted` to fix this |
| `ImportError: no pq wrapper available` | Missing libpq5 | Already patched in Dockerfile; rebuild with `docker compose up --build` |

## Project structure

```
.
├── compose.yml                # Docker Compose orchestration
├── .env.example               # Template for required env vars
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   └── specs/                 # Per-module implementation specs
├── backend/
│   ├── src/
│   │   ├── api/               # FastAPI routers
│   │   ├── ai/                # LLM providers, prompts, LangGraph
│   │   ├── db/                # SQLAlchemy models + Alembic
│   │   ├── services/          # Business logic / use cases
│   │   └── events/            # In-memory pub/sub for SSE
│   ├── scripts/
│   │   ├── seed.py            # Demo data seed (idempotent)
│   │   └── start.sh           # Container startup (migrate + seed + serve)
│   ├── tests/
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── features/          # campaigns/, review/
    │   ├── api/               # HTTP client + SSE hook
    │   └── components/        # shadcn/ui + custom components
    └── Dockerfile
```

## CI

GitHub Actions runs lint + tests + Docker build verification on every push and PR targeting `main`. Three parallel jobs (`backend`, `frontend`, `docker`) plus a `ci-success` gate job used for branch protection rules.

No secrets are required — the backend job uses `DEFAULT_LLM_PROVIDER=mock` so no real LLM calls are made.

A separate [real-llm workflow](.github/workflows/real-llm.yml) runs smoke tests against real APIs on manual trigger or every Monday at 6am UTC (requires `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` repository secrets).

## Not implemented / future work

- **CD pipeline** — deploy to a PaaS (Fly.io, Railway) on merge to main
- **Image push to registry** — push to GHCR/Docker Hub with semver tags
- **Security scans** — Trivy or Snyk in the Docker build job
- **Performance regression tests** — k6 + bench fixtures
- **Lighthouse CI** — frontend performance budget
- **E2E tests** — Playwright smoke tests against the running stack
