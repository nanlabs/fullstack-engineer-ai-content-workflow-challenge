# AI Content Workflow

V1 implementation for the full-stack challenge using `Next.js + FastAPI + PostgreSQL + SSE`.

## Stack

- Frontend: `Next.js` App Router with SSR-friendly pages and client-side mutation panels
- Backend: `FastAPI` with async SQLAlchemy and explicit SQL migrations
- Database: `PostgreSQL`
- Realtime: `Server-Sent Events (SSE)`
- AI provider: `OpenAI` behind a provider abstraction
- Tooling: `bun`, `uv`, `uvicorn`, `docker compose`

## Repo layout

```txt
.
├── agents.md
├── backend/
├── compose.yml
├── docs/
│   └── plans/
├── frontend/
├── spec-v1.md
└── README.md
```

## Features in V1

- Create campaigns
- Create content pieces inside campaigns
- Generate AI drafts
- Generate translations/localizations
- Extract metadata (`keywords`, `tone`, `sentiment`)
- Review content with `start_review`, `accept`, `edit`, and `reject`
- Persist canonical content separately from AI suggestions
- Stream content updates through SSE

## API surface

- `POST /campaigns`
- `GET /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns/:id/content-pieces`
- `GET /content-pieces/:id`
- `PATCH /content-pieces/:id`
- `POST /content-pieces/:id/ai/generate-draft`
- `POST /content-pieces/:id/ai/translate`
- `POST /content-pieces/:id/ai/extract-metadata`
- `POST /content-pieces/:id/review`
- `GET /events`

## Workflow rules

- New content pieces start in `draft`
- Successful AI operations move the piece to `ai_suggested`
- Manual editing through `PATCH /content-pieces/:id` moves the piece to `in_review`
- `start_review` moves the piece to `in_review`
- `accept` and `edit` end in `approved`
- `reject` ends in `rejected`
- `current_text` is canonical and is updated only by manual edit or review acceptance/editing
- Failed AI operations are stored as failed suggestions and do not mutate canonical content

## Local setup with Docker

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
2. Set `OPENAI_API_KEY` in `.env` if you want real provider calls.
3. Start the stack:
   ```bash
   docker compose up --build
   ```
4. Open:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:8000](http://localhost:8000)
   - API health: [http://localhost:8000/health](http://localhost:8000/health)

## Local setup without Docker

### Backend

```bash
cd backend
uv sync --dev
DATABASE_URL=sqlite+aiosqlite:///./local.db uv run uvicorn app.main:create_app --factory --reload
```

### Frontend

```bash
cd frontend
bun install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 INTERNAL_API_BASE_URL=http://localhost:8000 bun run dev
```

## Tests

### Backend

```bash
cd backend
uv sync --dev
uv run pytest
```

### Frontend

```bash
cd frontend
bun install
bun run test
```

## Tech decisions and tradeoffs

### REST over GraphQL

REST is enough for this workflow because the domain is resource-oriented and the UI needs a small number of predictable operations. It keeps the API surface simple for a challenge submission and reduces backend/frontend coordination overhead.

### SSE over WebSockets

SSE covers the actual V1 need: broadcasting server-side updates when AI work completes or review state changes. It is lighter than WebSockets and keeps the transport one-directional until the product actually needs collaborative bidirectional interactions.

### PostgreSQL only

The domain is relational and benefits from simple joins between campaigns, content pieces, AI suggestions, and review actions. Adding another datastore in V1 would only increase operational and modeling complexity.

### AI abstraction

Only OpenAI is implemented in V1, but the provider boundary is explicit so Anthropic or mock providers can be added later without changing route handlers or workflow rules.

### Lightweight backend structure

The backend is intentionally split into API, application, domain, and infrastructure modules. That is enough separation to scale later without turning the challenge into framework-heavy boilerplate.

## Notes for reviewers

- `spec-v1.md` is the current scope source of truth.
- Plans are stored under `docs/plans/`.
- `agents.md` contains the agent collaboration rules requested for this repo.
