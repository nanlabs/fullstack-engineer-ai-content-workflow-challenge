# Spec 10 — Docker Compose & Dev Experience

## Goal

Anyone with Docker and an API key can run the entire app with a single command. `docker compose up` brings up postgres, backend, frontend, and wires everything together. Migrations are applied automatically at boot.

## Out of scope

- Production-optimized images (not a goal of this challenge).
- Kubernetes / Helm.
- Build pipelines for Docker Hub / ECR.

## Services

```
┌─────────────────────────────────────────────┐
│  compose.yml                                │
│                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │postgres │←───│ backend │←───│frontend │  │
│  │  :5432  │    │  :8000  │    │  :5173  │  │
│  └─────────┘    └─────────┘    └─────────┘  │
└─────────────────────────────────────────────┘
```

### `compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: acme_content
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      APP_ENV: development
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/acme_content
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      DEFAULT_LLM_PROVIDER: ${DEFAULT_LLM_PROVIDER:-anthropic}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      CORS_ORIGINS: http://localhost:5173
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src           # hot reload in dev
      - ./backend/alembic:/app/alembic
      - ./backend/scripts:/app/scripts
    command: >
      sh -c "uv run alembic upgrade head &&
             uv run python -m scripts.seed --idempotent &&
             uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/index.html:/app/index.html
      - ./frontend/vite.config.ts:/app/vite.config.ts
      # Do NOT mount node_modules
    command: pnpm dev --host 0.0.0.0

volumes:
  postgres_data:
```

## Backend Dockerfile

`backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1

# uv for deps
RUN pip install --no-cache-dir uv

WORKDIR /app

# install deps first (better cache)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# copy source
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`backend/.dockerignore`:

```
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
.venv
venv
.git
.env
.env.local
tests/
```

## Frontend Dockerfile

`frontend/Dockerfile` (dev mode, not a prod build):

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
```

> Note: Vite 8 requires Node `20.19+` or `22.12+`. `node:20-alpine` should be on a recent patch. If you hit issues, pin `node:20.19-alpine` or upgrade to `node:22-alpine`.

`frontend/.dockerignore`:

```
node_modules
dist
.git
.env
.env.local
```

> **Decision:** we serve the frontend in dev mode (with HMR) instead of building static assets. Reasons:
> 1. The challenge is tested locally, not deployed.
> 2. HMR helps the reviewer if they want to experiment.
> 3. A static build adds 50 MB of image with no value for this case.
>
> For real production we'd do a multi-stage build with nginx. Documented in README.

## Hot reload

- **Backend:** `uvicorn --reload` already watches `src/`. Volume mount makes it work.
- **Frontend:** Vite HMR. In Docker requires `host: '0.0.0.0'` and sometimes `usePolling: true` in `server.watch` (especially on macOS Docker Desktop). Already configured in `vite.config.ts`.

## CORS

The backend has to accept requests from the frontend (`http://localhost:5173`):

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

For SSE specifically, ensure the preflight does not break (test from browser, not just curl).

## Environment variables

`.env.example` (in root):

```bash
# REQUIRED to use real LLMs (otherwise app uses MockProvider)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# Optional
DEFAULT_LLM_PROVIDER=anthropic   # or "openai" or "mock"
LOG_LEVEL=INFO
```

`.env` (NEVER commit):
```bash
ANTHROPIC_API_KEY=your_real_key
```

`.gitignore`:
```
.env
.env.local
*.env
```

## Healthchecks

- Postgres: already in compose.
- Backend: add to the `Dockerfile`:
  ```dockerfile
  HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
    CMD curl -f http://localhost:8000/health || exit 1
  ```
- Frontend: skip (not critical).

## Documented commands

In the README, "Development" section:

```bash
# Start everything
docker compose up

# Rebuild after dependency changes
docker compose up --build

# Start in background
docker compose up -d

# View logs
docker compose logs -f backend

# Enter the container
docker compose exec backend bash

# Run tests inside the container
docker compose exec backend uv run pytest

# Reset DB
docker compose down -v && docker compose up

# Apply a new migration
docker compose exec backend uv run alembic revision --autogenerate -m "msg"
docker compose exec backend uv run alembic upgrade head
```

## Seed script

`scripts/seed.py` must be **idempotent** (running it twice does not break):

```python
async def seed():
    async with async_session_factory() as session:
        existing = await session.scalar(
            select(Campaign).where(Campaign.name == "Spring Sale 2026")
        )
        if existing:
            print("Seed already applied, skipping.")
            return
        # ... create data
```

CLI:
```bash
uv run python -m scripts.seed             # creates if not exists
uv run python -m scripts.seed --reset     # wipes everything and recreates
```

## Troubleshooting documentation

In the README, add a "Troubleshooting" section:

| Symptom | Likely cause | Solution |
|---------|--------------|----------|
| `compose up` hangs at "Waiting for postgres" | Port 5432 taken on host | `lsof -i :5432` and kill, or change port in compose |
| Frontend doesn't hot-reload on edit | Polling not active in Docker Desktop | Verify `usePolling: true` in vite.config |
| Backend won't start: `cannot connect to postgres` | Postgres container not ready yet | Check healthcheck, wait |
| No AI drafts get generated | Missing API keys | Create `.env` from `.env.example` |
| `docker compose up --build` fails on `pnpm install` | Network or cache | `docker system prune -af && docker compose build --no-cache` |
| SSE doesn't receive events in browser | Proxy buffering | Verify header `X-Accel-Buffering: no` |

## Acceptance criteria

- [ ] `git clone <repo> && cd <repo> && docker compose up` brings up everything on a clean machine without prior Docker config.
- [ ] After `up`, in < 30s all healthchecks are green.
- [ ] `curl http://localhost:8000/health` returns 200.
- [ ] Browser at `http://localhost:5173` shows the app loaded.
- [ ] Editing a Python file in `backend/src/` causes the backend to reload.
- [ ] Editing a TSX file in `frontend/src/` triggers HMR in the browser.
- [ ] `docker compose down -v && docker compose up` brings everything up from scratch (including migration + seed) with no manual intervention.
- [ ] Without API keys configured, the app still works with MockProvider (generation returns fake text but the whole flow works).

## Suggested commit plan

```
chore(docker): postgres service with healthcheck and volume
chore(docker): backend Dockerfile with uv
chore(docker): frontend Dockerfile with pnpm
chore(docker): compose.yml with hot reload volumes
chore(docker): backend service runs migrations and seed on boot
chore(env): add .env.example with all keys documented
docs(readme): add development commands and troubleshooting
```

## Trade-offs

- **Hot-reload via volumes vs build every time:** volumes. Better DX.
- **Frontend in dev mode vs nginx static:** dev mode. Sufficient for the challenge, better for experimentation.
- **Postgres in compose vs external:** in compose. Zero setup for the reviewer.
- **No profiles:** single `compose.yml` for simplicity. If dev/test split is later needed, profiles drop in cleanly.

## Notes

- `docker compose` (no hyphen) is the modern command (Compose v2). If anyone has `docker-compose` (v1), warn them in the README to upgrade.
- The `--idempotent` seed must be robust to multiple executions.
- If the backend `command` becomes too long, split into `scripts/start.sh`:
  ```bash
  #!/bin/sh
  set -e
  uv run alembic upgrade head
  uv run python -m scripts.seed --idempotent
  exec uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- pnpm/node_modules volumes: do NOT mount `node_modules` from host because your host may have incompatible binaries (macOS vs alpine). Let the container use its own. Mount ONLY `src/`.
- If the backend explodes at startup because the DB isn't ready, check that `depends_on` uses `service_healthy`, not just `service_started`.
