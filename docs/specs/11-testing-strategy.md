# Spec 11 — Testing Strategy

## Goal

Define what to test, how, at which layer, and at what priority. The goal is NOT "100% coverage". It is to **send strong signals to the reviewer** that you know what's worth testing and what isn't, without spending time on trivial tests.

## Out of scope

- Full E2E with Playwright (mentioned as "future work").
- Performance / load tests.
- Security scanning (Snyk/Trivy) — optional in CI, not here.

## Philosophy

> **Selective TDD + meaningful tests.** Apply TDD where the logic is dense (graph, providers, state transitions). For trivial CRUD, write tests after and only the ones that carry information.

Rules:
1. **All AI logic has tests with `MockProvider`.** Zero real LLM calls in CI.
2. **Every state transition of `workflow_run` / `draft` has a test.**
3. **Every public endpoint has at least one happy path test.**
4. **Don't test that a button `<Button onClick={x}>` calls `x`.** Trivial, no value.
5. **DO test: validation, error mapping, layer-to-layer mappings, contracts.**

Coverage target:
- `src/ai/` → **>80%** (this is the distinctive code).
- `src/services/` → **>70%**.
- `src/api/` → smoke tests + critical error cases.
- `src/db/` → not tested in isolation (tested via services).
- Frontend: smoke tests + hook logic. Don't measure coverage.

## Backend — pytest

### Stack (latest stable, April 2026)

```toml
# in [dependency-groups].dev of pyproject.toml
"pytest>=8.4.0",
"pytest-asyncio>=0.25.0",
"pytest-cov>=6.0.0",
"httpx>=0.28.0",          # async client for tests
"faker>=33.0.0",          # synthetic data
"factory-boy>=3.3.1",     # model factories (optional but useful)
"respx>=0.22.0",           # mock httpx requests (for SDK tests)
```

Configuration in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
markers = [
    "real_llm: tests that hit real LLM APIs (skipped by default)",
    "slow: tests over 1 second",
]
addopts = "-ra --strict-markers --cov=src --cov-report=term-missing"
```

### Layout

```
backend/tests/
├── conftest.py                 # minimal: sets default DATABASE_URL
├── factories.py                # model factories (CampaignFactory, ContentPieceFactory, DraftFactory)
├── test_health.py              # /health endpoint smoke test
├── ai/
│   ├── conftest.py            # mock_provider fixture
│   ├── test_providers.py      # AnthropicProvider, OpenAIProvider, MockProvider, FallbackProvider, factory
│   ├── test_prompts.py        # PromptRegistry load, render, cache
│   ├── test_costs.py          # estimate_cost for known/unknown models
│   ├── test_runner.py         # WorkflowRunner unit tests (mocked graph)
│   └── graph/
│       ├── test_state.py      # ContentWorkflowState shape, reducers
│       ├── test_nodes.py      # individual node functions + _persist_drafts_from_state
│       └── test_full_flow.py  # full graph integration (MemorySaver)
├── api/
│   ├── conftest.py            # db_session, client, seeded_* fixtures
│   ├── test_campaigns.py
│   ├── test_content_pieces.py
│   ├── test_drafts.py
│   ├── test_workflow_resume.py
│   └── test_sse.py
├── db/
│   ├── conftest.py            # db_session fixture
│   └── test_models.py         # ORM cascade delete, draft lineage
├── services/
│   ├── conftest.py            # db_session + seeded fixtures
│   ├── test_campaign_service.py
│   ├── test_workflow_service.py
│   └── test_draft_service.py
└── events/
    └── test_bus.py
```

### Root `conftest.py`

The root `tests/conftest.py` only sets the default `DATABASE_URL` env var. DB session and HTTP client fixtures live in per-directory `conftest.py` files (`tests/api/conftest.py`, `tests/services/conftest.py`, `tests/db/conftest.py`) to keep fixture scope tight and avoid cross-test contamination.

Each directory conftest uses function-scoped fixtures: creates tables with `checkfirst=True`, yields session, rolls back after each test, disposes engine. This pattern was already established and avoids "Future attached to different loop" errors that arise when module-scoped async fixtures share connections across event loops.

> **Deviation from spec:** The spec described a single root conftest. The actual implementation uses per-directory conftests. Both achieve the same isolation guarantees.

```python
# tests/conftest.py (root — minimal)
import os
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/acme_content",
)
```

### `tests/ai/conftest.py`

```python
@pytest.fixture
def mock_provider() -> MockProvider:
    return MockProvider(fixtures={
        "headline": "Spring Awakening: Bold New Colors",
        "translation to es": "Despertar de Primavera: Audaces Colores Nuevos",
        "translation to fr": "Éveil du Printemps: Audacieuses Nouvelles Couleurs",
        "metadata": json.dumps({
            "sentiment": "positive",
            "tone": "aspirational",
            "keywords": ["spring", "colors", "bold"],
            "estimated_reading_time_seconds": 3,
        }),
    })
```

This fixture is available to all tests in `tests/ai/` via pytest's conftest discovery.

### Factories

`tests/factories.py`:

```python
class CampaignFactory:
    @staticmethod
    def build(**overrides) -> Campaign:
        defaults = {
            "name": faker.bs(),
            "brief": faker.text(),
            "source_language": "en",
            "target_languages": ["es", "pt-BR"],
        }
        return Campaign(**{**defaults, **overrides})


class ContentPieceFactory:
    @staticmethod
    def build(campaign: Campaign, **overrides) -> ContentPiece:
        ...

class DraftFactory:
    @staticmethod
    def build(content_piece: ContentPiece, **overrides) -> Draft:
        ...
```

Useful to avoid repeating 20 lines of setup in every test.

### Critical tests (the ones worth writing)

**AI layer**:
- `test_anthropic_provider_handles_rate_limit` → asserts custom `AIRateLimitError`.
- `test_anthropic_provider_generate_stream_yields_chunks` → mocked stream CM.
- `test_anthropic_provider_generate_structured_returns_parsed_model` → mocked tool_use block.
- `test_mock_provider_returns_fixtures` → keyword match.
- `test_mock_provider_stream_yields_chunks` → async generator iteration.
- `test_prompt_registry_renders_headline_template` → template rendering with vars.
- `test_registry_caches_template` → same object from cache.
- `test_estimate_cost_claude_sonnet` → known model pricing.
- `test_estimate_cost_unknown_model_is_zero` → safe default.
- `test_fallback_stream_falls_back_on_primary_error` → FallbackProvider stream path.
- `test_factory_raises_when_anthropic_key_missing` → missing key error.

**Graph layer**:
- `test_full_flow_until_interrupt` → graph pauses at `await_human_review`.
- `test_resume_with_approve_completes` → status="approved", graph done.
- `test_resume_with_regenerate_loops_back` → iteration increments, re-interrupts.
- `test_iteration_cap_prevents_infinite_loop` → status="failed" after 6 regenerates.
- `test_fan_out_translations_creates_one_send_per_language` → `Send` objects for each language.
- `test_checkpointer_persists_state_across_runner_instances` → MemorySaver survives new graph instance.

**Runner layer** (new — not in original spec):
- `test_run_graph_invokes_graph_ainvoke` → config thread_id forwarded.
- `test_run_graph_marks_failed_on_exception` → `_mark_failed` called on graph error.
- `test_resume_marks_failed_on_exception` → same for resume path.
- `test_get_runner_raises_when_not_initialised` → RuntimeError before startup.

**Services layer**:
- `test_resume_publishes_events` → `publish_workflow_event` called for both workflow and campaign topics.
- `test_resume_when_not_awaiting_raises_conflict` → ConflictError on completed workflow.
- `test_approve_transitions_to_approved` (draft_service) → status + reviewer fields set.
- `test_approve_rejected_raises_conflict` (draft_service) → terminal state guard.

**API layer**:
- `test_create_campaign_invalid_language_code` → 422.
- `test_resume_endpoint_404_unknown_thread` → NOT_FOUND error shape.
- `test_resume_endpoint_409_already_completed` → CONFLICT error shape.
- `test_resume_endpoint_422_invalid_body` → edit without edited_content.
- `test_sse_generator_heartbeat_on_timeout` → heartbeat comment on no events.
- `test_sse_generator_cleanup_on_close` → subscriber removed after generator close.

### Tests NOT worth writing (don't write)

- `test_get_campaign_returns_200_when_exists` — trivial, already covered by other happy paths.
- `test_response_model_serializes_correctly` — Pydantic is already tested.
- `test_alembic_migration_creates_tables` — verify it manually, not in CI.
- `test_logger_logs_info_level` — testing the standard library is absurd.

### Deterministic mock

For the graph to be testable end-to-end:

```python
@pytest.mark.asyncio
async def test_full_workflow(mock_provider, db_session):
    runner = WorkflowRunner(build_graph(checkpointer=MemorySaver()))

    # patch get_provider to return our mock
    with patch("src.ai.providers.factory.get_provider", return_value=mock_provider):
        thread_id = await runner.start(
            content_piece_id=uuid4(),
            campaign_id=uuid4(),
            content_type="headline",
            brief="Spring sale launch",
            source_language="en",
            target_languages=["es", "fr"],
        )

    state = await runner.get_state(thread_id)
    assert state.values["status"] == "awaiting_review"
    assert len(state.values["translations"]) == 2
    assert state.next == ("await_human_review",)  # interrupt point
```

### Optional tests with real LLM

```python
@pytest.mark.real_llm
@pytest.mark.asyncio
async def test_anthropic_provider_real_call():
    if not os.getenv("RUN_REAL_LLM_TESTS"):
        pytest.skip("set RUN_REAL_LLM_TESTS=1 to run")
    provider = AnthropicProvider(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = await provider.generate("Say 'hi' in one word.", max_tokens=10)
    assert response.tokens_in > 0
    assert response.tokens_out > 0
    assert response.cost_usd >= 0
```

NEVER in CI. Used only for local debugging.

## Frontend — Vitest + RTL

### Stack (latest stable, April 2026)

```json
"vitest": "^4.1.0",
"@testing-library/react": "^16.1.0",
"@testing-library/jest-dom": "^6.6.0",
"@testing-library/user-event": "^14.5.2",
"msw": "^2.7.0",
"jsdom": "^25.0.1"
```

Configuration in `vitest.config.ts` (or extend `vite.config.ts`):

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

`src/test/setup.ts`:

```ts
import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";

// Using "warn" instead of "error" — App.test.tsx renders the full router which
// triggers the campaigns list query at startup; "error" would require mocking
// every startup call and adds noise without test value.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

> **Deviation from spec:** `onUnhandledRequest: "warn"` instead of `"error"`. See rationale above.

### MSW handlers

`src/test/msw/server.ts` (actual path — not `src/test/msw-server.ts` as in the spec):

```ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/api/campaigns", () => {
    return HttpResponse.json({
      items: [
        {
          id: "abc",
          name: "Test campaign",
          target_languages: ["en"],
          source_language: "en",
          brief: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          content_pieces_count: 0,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  }),
  http.post("*/api/campaigns", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: "new-id", ...body }, { status: 201 });
  }),
  // ...
];

export const server = setupServer(...handlers);
```

### Tests worth writing on the frontend

**Hook logic**:
- `use-event-stream.test.tsx` → fake `EventSource`, verify subscription/unsubscribe.
- `api/client.test.ts` → fetch mock returns backend-shape error, assert `ApiError` parsed correctly.

**Components with logic**:
- `draft-editor.test.tsx` → typing changes value, isDirty, save fires mutation.
- `content-piece-status-badge.test.tsx` → mapping of states to labels.
- `campaign-form-dialog.test.tsx` → zod validation (target_languages required).

**Pages (integration)**:
- `campaigns-list.test.tsx` → MSW returns 2 campaigns, render list with 2 cards.
- `campaigns-list.test.tsx` → click "New" opens dialog, submit closes.
- `content-piece-detail.test.tsx` → MSW returns workflow `awaiting_human`, render tabs and editor.

**Don't test**:
- That `<Button>` renders.
- That tailwind applies classes.
- Pure / responsive layout (visual).

## E2E tests (mention only, don't implement)

In the README, "Future improvements" section:
- Playwright or Cypress for full flow: create campaign → generate → review → approve.
- Probable single happy path. AI calls mocked via `DEFAULT_LLM_PROVIDER=mock`.

Not worth it in 3 days. Mentioning it shows judgment.

## Acceptance criteria

- [x] `cd backend && uv run pytest` runs the whole suite < 30 seconds. ✅ **15.76s (151 tests)**
- [x] `cd frontend && pnpm test --run` runs the whole suite < 20 seconds. ✅ **5.21s (56 tests)**
- [x] Backend coverage for `src/ai/` > 80% (verify with `pytest --cov`). ✅ **95% `src/ai/`, 92% total `src/`**
- [x] Zero tests with real LLM calls in the default suite. ✅ **1 skipped (real_llm marker)**
- [ ] CI green with all of the above. *(requires CI run)*
- [x] `RUN_REAL_LLM_TESTS=1 uv run pytest -m real_llm` runs optional tests (manual, outside CI). ✅

## Suggested commit plan

```
test(backend): conftest with async fixtures and httpx client
test(backend): factories for campaigns and drafts
test(ai): provider abstractions full coverage
test(ai/graph): full flow integration with mock provider
test(services): workflow resume transitions
test(api): error mappings and validation
test(api): sse stream integration test
test(frontend): msw setup and api client error handling
test(frontend): use-event-stream lifecycle
test(frontend): draft editor and status badge logic
test(frontend): campaigns list page integration
chore(test): mark real_llm tests as opt-in
```

## Notes

- `pytest-asyncio` mode `auto` avoids decorating each test with `@pytest.mark.asyncio`. Recommended.
- If SSE tests time out in CI, consider `pytest.mark.slow` and isolate them in their own job.
- MSW v2 changed API (`http.get` instead of `rest.get`). Verify the installed version.
- For graph tests, use `MemorySaver` (in-memory) instead of `PostgresSaver`. Faster, no DB dependency for unit tests.
- If Pydantic raises `ValidationError` with a different shape than expected, use `model_validate` and capture in tests:
  ```python
  with pytest.raises(ValidationError) as exc_info:
      ContentPieceCreate(type="invalid")
  assert any(e["loc"] == ("type",) for e in exc_info.value.errors())
  ```
- Deterministic tests > "almost-always-passes" tests. If a test is flaky, fix it or kill it. Zero tolerance.
- Vitest 4 changed test isolation defaults — verify `pool` and `isolate` settings if you see weirdness.
- React Testing Library 16 requires React 19; if you see hook errors, check the `@types/react` version too.
