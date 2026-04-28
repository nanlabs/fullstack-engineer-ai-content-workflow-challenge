# ADR 0003 — LangGraph Content Workflow Design

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Maximiliano Vitale

## Context

The core business process is a content lifecycle: an LLM generates a draft, the draft gets
translated into multiple languages, a human reviewer approves, rejects, or requests changes,
and the cycle may repeat. This is fundamentally a state machine with persistent state,
conditional branching, human interruption points, and parallel fan-out. The implementation
decision is how to model this in code.

## Decisions

### LangGraph `StateGraph` over plain LangChain chains

The workflow is modelled as a LangGraph `StateGraph` rather than as a sequence of LangChain
chain calls orchestrated by application code.

LangGraph was designed for exactly this class of problem: stateful, multi-step, cyclical agent
workflows with human-in-the-loop. It provides out-of-the-box: a typed shared state with
reducers, conditional branching with routing functions, parallel fan-out via `Send`, interrupt
and resume mechanics with checkpointed state, and an async-native execution model. Plain
LangChain would require reimplementing all of this — checkpointing, interrupt semantics,
fan-out, the cycle back to earlier nodes — essentially rebuilding 80% of LangGraph on top of
LangChain primitives. The domain IS a state machine; modelling it as one is the right
abstraction.

### `interrupt()` for human-in-the-loop over polling or webhooks

The `await_human_review` node calls `interrupt()` to pause graph execution and resume it via
`Command(resume=feedback)`, rather than having the graph end and a separate API trigger a new
run, or having the client poll for state changes.

`interrupt()` preserves the full in-flight graph state in the checkpointer, including the
exact node where execution paused. On resume, the graph continues from that point — no state
reconstruction, no re-running completed nodes, no risk of losing intermediate results. A
polling approach would require externalising all intermediate state to the DB and rebuilding
it on each trigger; a webhook approach would require the external system to know how to resume
the correct graph thread. `interrupt()` keeps the control-flow logic inside the graph where
it belongs.

### Fan-out with the `Send` API for parallel translations

Translations for all target languages are executed in parallel using `Send("translate_to_language", {...})` from a conditional edge, not via `asyncio.gather` in a loop or sequential `ainvoke` calls.

`Send` is LangGraph's native mechanism for map-reduce fan-out: each `Send` creates an
independent branch that runs concurrently, and their results are merged back into the shared
state via the `add` reducer on the `translations` field. Total translation latency equals the
slowest single translation, not the sum of all translations. Using `asyncio.gather` inside a
single node would work for concurrency but would bypass LangGraph's checkpointing per branch,
losing partial results if the process restarts mid-fan-out.

### PostgreSQL as the checkpointer store

`AsyncPostgresSaver` (from `langgraph-checkpoint-postgres`) stores graph checkpoints in the
same PostgreSQL instance used for application data, rather than a separate Redis instance or
SQLite.

PostgreSQL is already a required dependency. Adding Redis solely for the checkpointer would be
infrastructure overhead with no other benefit at this scale. The checkpoint tables are managed
by `saver.setup()` which is idempotent and runs on startup. A single DB connection pool serves
both application queries and checkpoint reads/writes. SQLite was considered for simplicity but
ruled out because it does not support concurrent async writes without WAL mode, and the
production deployment uses PostgreSQL anyway.

### Persisting drafts atomically in `await_human_review`, not in each node

Draft rows are written to the DB in a single transaction inside `await_human_review` —
after generation, extraction, and translation have all completed — rather than after each
individual node.

The graph checkpoint already preserves all intermediate outputs. If the process crashes
between `translate` and `await_human_review`, the checkpoint allows the graph to resume from
the last saved state — no data is lost, and the `await_human_review` node will retry and
persist atomically on the next run. Persisting after each node would produce partial draft
records in the DB with uncertain status, complicate the DB schema with intermediate states,
and require rollback logic if a later node fails. The trade-off is one larger transaction
instead of several small ones; this is acceptable given the low volume.

### Iteration cap of 5 regenerate cycles

The `await_human_review` node enforces a hard cap: if `action == "regenerate"` and
`iteration >= 5`, it returns `status = "failed"` without entering `refine`. The
`route_after_review` function then routes to `END`.

Without a cap, a reviewer who always requests regeneration creates an infinite loop. Five
iterations is an arbitrary but defensible limit: enough creative rounds for any real use case,
few enough to prevent runaway LLM costs. The limit is enforced in `await_human_review` (where
the feedback action is known) rather than in `route_after_review` (which can only read
existing state) or in `refine` (which would require a conditional edge back to `END`).

### `WorkflowRun` created in the API endpoint with explicit `commit()` before background task

The `POST /content-pieces/{id}/generate` endpoint creates the `WorkflowRun` row and calls
`session.commit()` explicitly before scheduling `runner.run_graph` as a FastAPI
`BackgroundTask`, rather than letting the runner create the row inside the background coroutine.

FastAPI's generator dependency cleanup (where the session auto-commits via `async with`) runs
*after* background tasks complete, not before. If the `WorkflowRun` were created only inside
the background coroutine, the `await_human_review` node's `UPDATE workflow_run ...` would
execute against a row that has not yet been committed — a race condition. The explicit commit
in the endpoint guarantees the row is durable before the background task can reference it.
The `thread_id` is generated in the endpoint so it can be returned in the 202 response without
waiting for the graph to start.

## Consequences

- The full Draft → Suggested → Reviewed → Approved/Rejected lifecycle is encoded as graph
  edges and routing functions, not as conditional CRUD logic scattered across service methods.
- Resuming a paused workflow after a server restart is a single `runner.resume(thread_id,
  feedback)` call — the graph rebuilds its context from the PostgreSQL checkpoint.
- Graph state is inspectable at any point via `runner.get_state(thread_id)`, and streamable
  per-node via `runner.stream_events(thread_id, ...)` (used by the SSE endpoint in spec 06).
- `AsyncPostgresSaver` requires `psycopg` (psycopg3) and `libpq` at runtime. The import is
  deferred inside `get_checkpointer()` to avoid an `ImportError` at module load time in
  environments without a local PostgreSQL client library (e.g. Windows dev machines).
- The `translations` field uses an `add` reducer and accumulates entries across refine
  iterations. `_persist_drafts_from_state` slices the last `N` entries (`N = len(target_languages)`) to persist only the current iteration's translations.
