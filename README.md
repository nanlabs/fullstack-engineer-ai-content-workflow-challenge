# AI Content Workflow

V1 implementation for the full-stack challenge using `Next.js + FastAPI + PostgreSQL + SSE`.

## Stack

- Frontend: `Next.js` App Router with SSR-friendly pages and client-side mutation panels
- Backend: `FastAPI` with async SQLAlchemy and explicit SQL migrations
- Database: `PostgreSQL` only
- Realtime: `Server-Sent Events (SSE)`
- AI provider: `Gemini` by default, `OpenAI` selectable through env
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
- Extract editorial metadata from the canonical text
- Review draft suggestions with `accept` and `reject` in the main editor flow
- Persist canonical content separately from AI suggestions
- Keep translation outputs as parallel versions without replacing canonical text
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

## Reviewer quick start

Use this path for the challenge review. It is the simplest way to run the full app locally.

```bash
docker compose --env-file .env.docker.example up --build
```

What this does:

- starts PostgreSQL, backend, and frontend
- runs the demo seed automatically
- leaves the campaign `ACME Media | Creator Launch Demo` available in the UI
- does not require an AI key to boot the stack or review the seeded workflow

Open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- API health: [http://localhost:8000/health](http://localhost:8000/health)

To test real AI after boot:

- set `GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env.docker.example` before running Compose, or
- open `Settings` in the app and save a provider there

Provider settings saved from the UI take priority over `.env`, and the API key is encrypted at rest and never returned by the API after it is saved.

## Development workflow

The default development loop is:

1. Copy the local env template to `.env`
2. Start PostgreSQL in Docker
3. Run the backend locally with `uv run dev`
4. Run the frontend locally with `bun run dev`

Code changes do not require rebuilding the app containers when the backend and frontend are running from your terminal. Rebuilds are only needed when you run the app services inside Docker.

### 1. Create your local env file

```bash
cp .env.example .env
```

### 2. Start only PostgreSQL

```bash
docker compose up -d db
```

### 3. Run the backend locally

```bash
cd backend
uv sync --dev
uv run dev
```

The backend reads `DATABASE_URL` and the rest of its settings from the repo root `.env` file.

AI provider selection:

- `AI_PROVIDER=gemini` uses `GEMINI_API_KEY` and `GEMINI_MODEL`
- `AI_PROVIDER=openai` uses `OPENAI_API_KEY` and `OPENAI_MODEL`
- `AI_SETTINGS_ENCRYPTION_KEY` is required to store provider settings from the UI

The backend can fall back to `.env` credentials when no provider settings are stored in the app. Once a provider is saved from Settings, the database-backed configuration takes priority and the API key is encrypted at rest.

### 4. Run the frontend locally

```bash
cd frontend
bun install
bun run dev
```

The frontend dev script also reads API-related environment values from the repo root `.env` file.

## Demo campaign

Use the seeded campaign to review the current V1 flow with realistic content instead of placeholder text.

Load or recreate the demo data locally:

```bash
cd backend
uv run seed-demo
```

The seed recreates the campaign by name: `ACME Media | Creator Launch Demo`.

In Docker reviewer mode, this seed runs automatically during `docker compose up --build`.

If the metadata schema changes, rerun `uv run seed-demo` so the demo dataset matches the current shape expected by the backend and UI.

After seeding, the dataset includes content pieces across these workflow states:

- `draft`
- `ai_suggested`
- `in_review`
- `approved`
- `rejected`

Recommended UI checks with the seeded data:

- campaign list on the dashboard
- content list inside the seeded campaign
- content piece editor for canonical text and AI draft review
- translation history in the right-side panel
- extracted metadata in the metadata panel
- accept and reject actions on AI draft suggestions

Important note:

- add `?lab=1` to a content piece editor URL to expose the full persisted LLM interaction flow for that piece
- the lab modal shows the chronological sequence of AI calls, including draft generation, translation/localization, and metadata extraction
- each step includes the stored input text, output or extracted metadata, provider/model, status, and timestamp

## Environment files

- `.env.example`: local development values, including `localhost` Postgres DSNs and optional AI provider credentials
- `.env.docker.example`: reviewer/container values, including automatic demo seeding support and optional AI provider credentials

The backend is Postgres-only. It will fail to start if `DATABASE_URL` is missing or uses a non-Postgres driver.

## Tests

### Backend

Backend tests run against PostgreSQL only.

1. Start the database container:
   ```bash
   docker compose up -d db
   ```
2. Run tests:
   ```bash
   cd backend
   uv sync --dev
   uv run pytest
   ```

If you want a non-default test database name, set `TEST_DATABASE_URL` in `.env` before running the suite.

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

The domain is relational and benefits from simple joins between campaigns, content pieces, AI suggestions, and review actions. SQLite was removed entirely from runtime and test execution so development matches the real data path.

### AI abstraction

Gemini is the default provider in V1, with OpenAI available through the same provider boundary. The workflow code does not depend on a specific vendor, so provider changes stay inside infrastructure and configuration.

### Lightweight backend structure

The backend is intentionally split into API, application, domain, and infrastructure modules. That is enough separation to scale later without turning the challenge into framework-heavy boilerplate.

## Notes for reviewers

- `spec-v1.md` is the current scope source of truth.
- Plans are stored under `docs/plans/`.
- `agents.md` contains the agent collaboration rules requested for this repo.
- The Stitch project `Generate content ACME Media` informed the V1 UI structure, but these screens remain backlog only:
  - `Dashboard Global - ACME Media`
  - `Historial de Versiones - ACME Media`
  - `Editorial Workbench (Master View)`
