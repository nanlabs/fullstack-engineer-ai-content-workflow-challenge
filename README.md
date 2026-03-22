# ACME Global Media – AI Content Workflow

A fullstack system for managing AI-powered content creation and review workflows for international marketing campaigns.

## Features

- **Campaign management** – create and organize campaigns with target languages
- **AI content generation** – generate headlines, descriptions, CTAs, and more using Claude 3.5 Sonnet or GPT-4o
- **Side-by-side model comparison** – run both AI providers in parallel and compare outputs
- **Structured AI metadata** – each draft includes extracted keywords, tone, and sentiment
- **Translation & localization** – AI-powered translation into 8+ languages, preserving brand voice
- **Review workflow** – human-in-the-loop state machine: `Draft → AI Suggested → Under Review → Approved/Rejected`
- **Real-time updates** – live UI updates via WebSocket (Socket.io) when drafts are generated or content is reviewed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10 + TypeScript + Fastify |
| Database | PostgreSQL 16 + Prisma ORM |
| Frontend | Next.js 14 (App Router) + TailwindCSS |
| AI | Anthropic Claude 3.5 Sonnet + OpenAI GPT-4o |
| Real-time | Socket.io WebSockets |
| Containerization | Docker + Docker Compose |
| CI | GitHub Actions |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- An Anthropic API key and/or OpenAI API key

### 1. Clone and configure

```bash
git clone <repo-url>
cd fullstack-engineer-ai-content-workflow-challenge

cp .env.example .env
# Edit .env and fill in your API keys
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

This will:
- Start PostgreSQL and wait for it to be healthy
- Run Prisma migrations automatically on the backend container
- Start the backend API on `http://localhost:4000`
- Start the frontend on `http://localhost:3000`

### 3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

### Running locally (without Docker)

**Backend:**
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL to a local PostgreSQL instance
npm install
npx prisma migrate dev
npm run start:dev
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## API Reference

Base URL: `http://localhost:4000/api`

### Campaigns

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | List all campaigns |
| POST | `/campaigns` | Create a campaign |
| GET | `/campaigns/:id` | Get campaign with content |
| PUT | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |

### Content Pieces

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns/:id/content` | List content for campaign |
| POST | `/campaigns/:id/content` | Create content piece |
| GET | `/campaigns/:id/content/:cid` | Get piece with drafts & translations |
| PUT | `/campaigns/:id/content/:cid` | Update content piece |
| DELETE | `/campaigns/:id/content/:cid` | Delete content piece |
| POST | `/campaigns/:id/content/:cid/review` | Update review status |
| POST | `/campaigns/:id/content/:cid/select-draft/:draftId` | Select an AI draft |

### AI Operations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/campaigns/:id/content/:cid/generate` | Generate AI draft |
| POST | `/campaigns/:id/content/:cid/translate` | Translate content |
| POST | `/campaigns/:id/content/:cid/compare` | Compare Claude vs GPT-4o |

### WebSocket Events (Socket.io)

| Event | Payload | Description |
|-------|---------|-------------|
| `content:updated` | `{ campaignId, contentPiece }` | Status or review changed |
| `draft:generated` | `{ campaignId, draft }` | New AI draft created |
| `translation:created` | `{ campaignId, translation }` | New translation created |

## Project Structure

```
/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── docs/
│   └── architecture.md         # Design decisions & diagrams
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── campaigns/          # Campaign CRUD
│   │   ├── content/            # Content CRUD + review
│   │   ├── ai/                 # AI generation & translation
│   │   ├── gateway/            # Socket.io WebSocket gateway
│   │   └── prisma/             # Prisma client module
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Data fetching hooks
│   │   ├── lib/                # API client, socket, utils
│   │   └── types/              # Shared TypeScript types
│   └── Dockerfile
├── compose.yml
├── .env.example
└── README.md
```

## Design Decisions

**REST over GraphQL** – The access patterns here are straightforward CRUD plus state transitions, so REST keeps things simple and universally readable. GraphQL would add value if clients needed flexible nested queries.

**NestJS + Fastify** – NestJS's module system and DI container fit well for a multi-domain app (campaigns, content, AI, gateway). Fastify gives ~2x throughput over Express with minimal config change.

**Prisma over TypeORM** – Cleaner API, stronger TypeScript inference from the schema, and automatic migration tracking.

**Socket.io over SSE** – Bidirectional capability for future use, better reconnection handling, and easy room support to scope events per campaign.

**AI as a dedicated module** – `AiService` is provider-agnostic. Adding a new provider (Gemini, Mistral) means implementing one private method and updating the model enum — no controller or database changes needed.

**Synchronous AI calls** – For simplicity. In production, these would be queued (BullMQ/Kafka) with status polling or SSE to avoid blocking HTTP requests during model inference.

See [docs/architecture.md](docs/architecture.md) for full diagrams and tradeoff table.

## Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend e2e tests (requires a running DB)
cd backend && npm run test:e2e

# Frontend lint + build check
cd frontend && npm run lint && npm run build
```

## CI Pipeline

GitHub Actions runs on every push to `main`/`develop` and on PRs:

1. **Backend** – install, generate Prisma client, run migrations against a test DB, lint, test
2. **Frontend** – install, lint, build
3. **Docker** – build both images with Compose (runs after both pass)
