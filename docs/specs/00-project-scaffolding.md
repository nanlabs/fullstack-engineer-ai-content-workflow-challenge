# Spec 00 — Project Scaffolding & Tooling

## Goal

Leave the repo ready so any subsequent spec can be implemented without touching configuration. Python backend, React frontend, Docker, CI skeleton, pre-commit hooks, conventions enforced.

## Out of scope

- Business logic (lives in specs 01+).
- DB models (spec 01).
- Endpoints (spec 02).
- Any AI configuration (spec 03+).

## Expected final structure

```
.
├── CLAUDE.md
├── README.md                    ← stub, completed on day 3
├── compose.yml
├── .env.example
├── .gitignore
├── .pre-commit-config.yaml
├── .editorconfig
├── .python-version              ← "3.12"
├── .nvmrc                       ← "20"
├── .github/
│   ├── workflows/ci.yml         ← basic CI (lint + test)
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── adr/
│   │   └── 0001-stack-selection.md
│   ├── specs/                   ← already populated
│   └── architecture.md          ← stub
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── ruff.toml
│   ├── alembic.ini              ← stub, configured in spec 01
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py              ← FastAPI app with /health
│   │   └── config.py            ← Settings via pydantic-settings
│   └── tests/
│       ├── __init__.py
│       └── test_health.py
└── frontend/
    ├── package.json
    ├── pnpm-lock.yaml
    ├── vite.config.ts
    ├── tsconfig.json
    ├── components.json          ← shadcn/ui config
    ├── eslint.config.js
    ├── .prettierrc
    ├── Dockerfile
    ├── .dockerignore
    ├── index.html
    ├── public/
    └── src/
        ├── main.tsx
        ├── App.tsx              ← shows "ACME Content Workflow"
        ├── index.css            ← @import "tailwindcss"; + shadcn vars
        └── lib/
            └── utils.ts         ← cn() from shadcn
```

## Backend — configuration details

### `backend/pyproject.toml`

Pin runtime dependencies to known-good versions (latest stable as of April 2026):

```toml
[project]
name = "acme-content-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi==0.136.1",
    "uvicorn[standard]>=0.39.0",
    "pydantic==2.13.3",
    "pydantic-settings==2.14.0",
    "sqlalchemy[asyncio]==2.0.49",
    "asyncpg>=0.30.0",
    "alembic==1.18.4",
    "httpx>=0.28.0",
    "structlog>=25.1.0",
    "anthropic==0.97.0",
    "openai==2.32.0",
    "langchain==1.2.15",
    "langchain-anthropic==1.4.1",
    "langchain-openai==1.2.1",
    "langgraph==1.1.9",
    "langgraph-checkpoint-postgres==3.0.5",
]

[dependency-groups]
dev = [
    "pytest>=8.4.0",
    "pytest-asyncio>=0.25.0",
    "pytest-cov>=6.0.0",
    "ruff>=0.15.0",
    "mypy>=1.13.0",
]

[tool.uv]
package = false

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### `backend/ruff.toml`

```toml
target-version = "py312"
line-length = 100

[lint]
select = ["E", "F", "I", "B", "UP", "N", "S", "ASYNC"]
ignore = ["S101"]  # assert OK in tests

[lint.per-file-ignores]
"tests/*" = ["S"]
```

### `backend/src/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    default_llm_provider: str = "anthropic"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"


settings = Settings()
```

### `backend/src/main.py`

Minimal FastAPI app with:
- CORS enabled for `http://localhost:5173`
- `GET /health` returning `{"status": "ok"}`
- Placeholder router include (`app.include_router(...)`) added in later specs

### `backend/Dockerfile`

Multi-stage:
1. Builder using `uv` for installing deps.
2. Runtime on `python:3.12-slim`, copies `src/`, exposes 8000, runs `uvicorn`.

## Frontend — configuration details

### `package.json`

```json
{
  "name": "acme-content-frontend",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.6.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router": "^7.4.0",
    "@tanstack/react-query": "^5.99.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.468.0",
    "react-diff-viewer-continued": "^4.0.0",
    "sonner": "^1.7.4",
    "zod": "^3.24.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.2"
  },
  "devDependencies": {
    "vite": "^8.0.0",
    "@vitejs/plugin-react": "^6.0.0",
    "typescript": "^5.7.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "vitest": "^4.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.5.2",
    "msw": "^2.7.0",
    "jsdom": "^25.0.1",
    "eslint": "^9.18.0",
    "@typescript-eslint/parser": "^8.20.0",
    "@typescript-eslint/eslint-plugin": "^8.20.0",
    "eslint-plugin-react": "^7.37.4",
    "eslint-plugin-react-hooks": "^5.1.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.10"
  }
}
```

### Tailwind v4 setup

Tailwind v4 with Vite drops `tailwind.config.js` and `postcss.config.js`. Configuration moves into the CSS file.

`vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true },  // Docker friendly
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

`src/test/setup.ts` (archivo de setup de vitest):

```ts
import "@testing-library/jest-dom";
```

`src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* shadcn theme tokens go here, in CSS variables — not in JS */
}

/* shadcn-generated `:root` and `.dark` blocks live below */
```

### Initialize shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Configure:
- Style: New York
- Color: Slate
- CSS variables: yes
- Path alias: `@/`

Components to install up-front (not used yet, just available):

```bash
pnpm dlx shadcn@latest add button card input textarea badge dialog tabs skeleton
```

> Note: shadcn's CLI is Tailwind v4 aware as of v2.x — it generates the right CSS variables in `index.css` instead of `tailwind.config.js`.

### `frontend/Dockerfile`

For dev: `node:20-alpine` image, install deps, command `pnpm dev --host 0.0.0.0`. We do not produce a production build for this challenge — the frontend is served in dev mode inside compose.

## Pre-commit hooks (`.pre-commit-config.yaml`)

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.15.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.1.0
    hooks:
      - id: prettier
        files: \.(ts|tsx|json|md|yml|yaml)$
```

## CI skeleton (`.github/workflows/ci.yml`)

Three jobs in parallel:

1. **backend-lint-test**
   - Setup Python 3.12 + uv
   - `uv sync`
   - `uv run ruff check src tests`
   - `uv run pytest`

2. **frontend-lint-test**
   - Setup Node 20 + pnpm 10
   - `pnpm install`
   - `pnpm lint`
   - `pnpm test --run`

3. **docker-build**
   - `docker compose build`

Trigger: push to any branch + PRs to main. Full details in spec 12.

## `.env.example`

```bash
# App
APP_ENV=development
LOG_LEVEL=INFO

# DB
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/acme_content

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEFAULT_LLM_PROVIDER=anthropic

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

## ADR to produce

`docs/adr/0001-stack-selection.md` — documents the choice of FastAPI + LangGraph + React.
Mention:
- Why Python over Node (AI role).
- Why LangGraph over plain LangChain.
- Why REST over GraphQL (preview, full ADR in next spec).

## Acceptance criteria

- [ ] `git clone && docker compose up` brings up backend on `:8000` and frontend on `:5173`.
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`.
- [ ] Opening `http://localhost:5173` shows a page titled "ACME Content Workflow" with a rendered shadcn button.
- [ ] `cd backend && uv run pytest` passes (at least `test_health` green).
- [ ] `cd frontend && pnpm test --run` passes (at least one smoke test on `App`).
- [ ] `cd backend && uv run ruff check src tests` clean.
- [ ] CI green on GitHub Actions.
- [ ] Pre-commit hooks installed (`pre-commit install`).
- [ ] ADR 0001 committed.

## Suggested commit plan

```
chore: initialize monorepo structure
chore(backend): scaffold fastapi with uv and ruff
chore(frontend): scaffold vite + react 19 + ts + tailwind 4
chore(frontend): integrate shadcn/ui
chore(docker): add Dockerfiles and compose.yml
chore(ci): add github actions workflow
chore: add pre-commit hooks
docs(adr): 0001 stack selection
```

## Notes

- All AI dependencies (anthropic/openai/langgraph) are declared in `pyproject.toml` from day 1 to avoid rebuilding the Docker image multiple times. They are NOT imported in code yet.
- Vite 8 requires Node 20.19+ or 22.12+. Document this in README's "Requirements" section.
- If Vite + Docker fails HMR, keep `server.host: '0.0.0.0'` and `watch: { usePolling: true }` — already in `vite.config.ts`.
- React Router v7 unifies `react-router` and `react-router-dom` into a single `react-router` package. Imports are `from "react-router"`.
- Tailwind v4 reads its theme from CSS — there is no `tailwind.config.js`. If you need to extend the theme, do it inside `@theme { ... }` in `index.css`.
