# Spec 12 — CI Pipeline (GitHub Actions)

## Goal

Every push and every PR to `main` runs lint + tests + Docker build in parallel. Green before merge. No deploy.

## Out of scope

- CD / deploys.
- Pushing Docker images to registries.
- Kubernetes / ArgoCD (mentioned as bonus in the challenge, justifiably out of scope).
- Security scans (mention as future work).

## Workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    name: Backend · Lint & Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: acme_content_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/acme_content_test
      DEFAULT_LLM_PROVIDER: mock
      APP_ENV: test
      LOG_LEVEL: WARNING

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install uv
        uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
          cache-dependency-glob: "backend/uv.lock"

      - name: Install dependencies
        working-directory: backend
        run: uv sync --frozen

      - name: Lint
        working-directory: backend
        run: |
          uv run ruff check src tests
          uv run ruff format --check src tests

      - name: Type check
        working-directory: backend
        run: uv run mypy src
        continue-on-error: true   # mypy strict via progressive adoption

      - name: Run migrations
        working-directory: backend
        run: uv run alembic upgrade head

      - name: Run tests
        working-directory: backend
        run: uv run pytest --cov=src --cov-report=xml --cov-report=term

      - name: Upload coverage
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: backend/coverage.xml

  frontend:
    name: Frontend · Lint & Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Lint
        working-directory: frontend
        run: pnpm lint

      - name: Type check
        working-directory: frontend
        run: pnpm exec tsc --noEmit

      - name: Test
        working-directory: frontend
        run: pnpm test --run

      - name: Build
        working-directory: frontend
        run: pnpm build
        env:
          VITE_API_BASE_URL: http://localhost:8000

  docker:
    name: Docker · Build verification
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build backend image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: false
          load: true
          tags: acme-backend:ci
          cache-from: type=gha,scope=backend
          cache-to: type=gha,scope=backend,mode=max

      - name: Build frontend image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: false
          load: true
          tags: acme-frontend:ci
          cache-from: type=gha,scope=frontend
          cache-to: type=gha,scope=frontend,mode=max

      - name: Validate compose file
        run: docker compose config

  ci-success:
    name: CI Success
    runs-on: ubuntu-latest
    needs: [backend, frontend, docker]
    if: always()
    steps:
      - name: Check all jobs passed
        run: |
          if [[ "${{ needs.backend.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.frontend.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.docker.result }}" != "success" ]]; then exit 1; fi
          echo "All jobs passed ✅"
```

## Decisions explained

### Why `DEFAULT_LLM_PROVIDER=mock` in CI

Zero real LLM calls. The mock provider already implemented (spec 03) covers all flows. If we want to validate real calls, there is an optional job (see below) that only runs manually.

### Why `concurrency` with `cancel-in-progress`

If you push 3 commits in a row to the same branch, only the last one runs. Saves minutes and gives faster feedback.

### Why parallel jobs (backend + frontend + docker)

Total time ≈ longest job, not the sum. Backend ~3min, frontend ~1min, docker ~2min → full CI in ~3min instead of 6.

### Why service postgres and not testcontainers

GitHub Actions services is native, faster, less boilerplate. Testcontainers makes sense if you want local-CI portability with the same config — the time cost doesn't pay off for this challenge.

### Why `mypy continue-on-error`

Applying strict mypy day 1 to a greenfield project is easy, but if an edge case arises in LangGraph (whose types aren't perfect), you don't want to block the merge. Better visible warning than block.

### Why build images but not push

The reviewer doesn't need images in a registry. Just verify they build. If deploy is needed later, add a conditional job `if: github.ref == 'refs/heads/main'`.

### Why `astral-sh/setup-uv@v6` and `pnpm/action-setup@v4`

These are the latest major versions of the actions as of April 2026. Pinning to a major (not `@latest`) protects from accidental breaking changes while staying current.

## Variables and secrets

**No** secrets are needed for CI to run (thanks to the mock provider).

If in the future you want to run `real_llm` tests:
- Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` as repository secrets.
- Manual `workflow_dispatch` job that uses them.

## Optional job: real LLM smoke test

To run occasionally and validate that real integrations haven't broken:

```yaml
# .github/workflows/real-llm.yml
name: Real LLM Smoke Tests

on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * 1"  # every Monday at 6am UTC

jobs:
  smoke:
    runs-on: ubuntu-latest
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      RUN_REAL_LLM_TESTS: "1"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - uses: astral-sh/setup-uv@v6
      - working-directory: backend
        run: uv sync --frozen
      - working-directory: backend
        run: uv run pytest -m real_llm
```

Mention in the README that this exists but is not part of default CI.

## PR template

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## What

<!-- Brief description of the change -->

## Why

<!-- Context: why is this change necessary? -->

## How

<!-- Implementation approach. Link to relevant spec if applicable. -->

## Checklist

- [ ] Relevant spec(s) consulted: `docs/specs/...`
- [ ] Tests added/updated where it matters
- [ ] Lint passes locally
- [ ] If schema changed, migration is included
- [ ] If significant decision, ADR added in `docs/adr/`
- [ ] `docker compose up` still works
```

## Badges for the README

```markdown
![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)
```

(Just the CI one; no coverage badge unless you want to upload to Codecov, which is NOT worth it for a challenge.)

## Acceptance criteria

- [ ] Push to a branch triggers the 3 jobs in parallel.
- [ ] Backend job passes all tests with the postgres service.
- [ ] Frontend job builds with TypeScript strict and tests with Vitest.
- [ ] Docker job builds both images and validates `docker compose config`.
- [ ] PR to main shows CI checks.
- [ ] Total time < 5 min.
- [ ] uv and pnpm cache reduces time on subsequent runs.
- [ ] CI badge shows green in README.

## Suggested commit plan

```
ci(github): add main workflow with backend, frontend, docker jobs
ci(github): wire postgres service for backend tests
ci(github): add concurrency cancel-in-progress
ci(github): add real-llm smoke workflow (manual + scheduled)
chore: add pull request template
docs(readme): add ci badge
```

## Documented trade-offs

- **Single workflow file vs multiple:** one for simplicity.
- **No deploy:** justified in README. It's a challenge, not a project.
- **No coverage upload to Codecov:** boilerplate without return.
- **No Python version matrix (3.11/3.12):** one version, the Dockerfile's. Coherence > redundancy.
- **mypy soft (continue-on-error):** progressive adoption.

## Notes

- `astral-sh/setup-uv@v6` is the official action. Don't use `pip install uv`, it's slower.
- `pnpm/action-setup@v4` requires `version` explicit or that the `package.json` has `packageManager: "pnpm@x.y.z"`.
- If a test depends on an environment variable (`ANTHROPIC_API_KEY`), but the provider is mock in CI, make sure `MockProvider` does NOT require the key. Already documented in spec 03.
- Docker cache (`type=gha`) is free and reduces builds from 2min to 30s on cache hits.
- `concurrency.group` with `${{ github.ref }}` avoids cancelling workflows of other branches when pushing.
- If the `ci-success` job seems redundant, it's useful for using as a **required check** in branch protection rules. With one fixed name you cover all internal jobs without configuring each as required.

## Future work documented

In the README, "Future work" or "Not implemented" section:
- CD pipeline with deploy to a PaaS (Fly.io, Railway).
- Image push to GHCR + Docker Hub with semver tags.
- Security scans (Trivy, Snyk) in the docker build job.
- Performance regression tests (k6 + bench fixtures).
- Lighthouse CI for frontend.
- E2E tests with Playwright.

## Deviations (implemented 2026-04-29)

- **`real-llm.yml` includes postgres service + `alembic upgrade head`** (not in spec) — the current `real_llm` test (`test_anthropic_provider_real_call`) does not require a DB, but the postgres service is added proactively so future real-LLM tests that exercise the full graph layer (which uses DB-backed checkpoints) can run without modifying the workflow. Cost is minimal (one service container).
- **Previous stub replaced in full** — the existing `ci.yml` stub (`backend-lint-test`, `frontend-lint-test`, `docker-build` jobs with no concurrency, no caching, no type checks, no build step) was replaced entirely with the spec's design. No backwards compatibility with the stub was preserved.
