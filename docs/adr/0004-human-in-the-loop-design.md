# ADR 0005 — Human-in-the-Loop & Workflow Resume Design

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Maximiliano Vitale

## Context

After the LangGraph graph generates drafts and pauses at `interrupt()`, the human reviewer must
be able to see the drafts, act on them (approve / reject / edit / request regeneration), and
have the graph resume accordingly. This requires a pause/feedback/resume cycle that spans HTTP
requests, database state, and the LangGraph checkpoint store. The key design questions are:
how does the human action get routed back into the graph, how do draft statuses update, and
what happens when a reviewer iterates multiple times.

## Decisions

### Resume via `Command(resume=feedback)` over re-invocation or separate graph

Human feedback is fed back into the paused graph using `Command(resume=feedback)` (LangGraph's
idiomatic resume primitive), not by starting a new graph run or routing around the checkpoint.

`Command(resume=...)` is the precise counterpart to `interrupt()`: it delivers the feedback
payload directly to the node that called `interrupt()`, which then returns it as the function's
result. No state reconstruction is needed — the graph resumes from the exact checkpoint with
all intermediate values intact. Starting a new run would require re-passing all inputs plus the
feedback, risking state divergence. A separate "review graph" would duplicate the workflow
logic. `Command(resume=...)` keeps the control-flow coherent inside a single graph thread.

### Draft-by-draft review over workflow-as-a-block

Each draft (source + each translation) is reviewed individually. Approving one draft does not
automatically approve the others; each can be in a different state simultaneously. The workflow
run status reflects the graph lifecycle, not the aggregate draft status.

Reviewing all drafts of a workflow as a block requires a more complex UX (a single action
affecting multiple records) and more complex service logic (determining which draft the action
applies to, what happens when some are pre-reviewed, etc.). Individual review is more flexible:
a reviewer can approve a translation immediately and regenerate the source draft separately.
The trade-off is that `workflow_run.status = completed` can coexist with `draft.status =
suggested` for unreviewed drafts — this is a documented design choice, not a bug. The graph
reaching END is the signal for workflow completion, not unanimous draft approval.

### `WorkflowService` as an injected class over module-level functions

The workflow logic is implemented as a class (`WorkflowService`) with constructor injection of
`WorkflowRunner`, `AsyncSession`, and `EventBus`, rather than as module-level functions receiving
those as parameters (the pattern used for `campaign_service`, `draft_service`, etc.).

The workflow service requires three collaborators — the LangGraph runner, the DB session, and
the event bus — whereas other services only need the session. Passing three parameters to every
function would be verbose and make the call sites in tests noisy. Constructor injection groups
the dependencies once and keeps method signatures focused on domain arguments. FastAPI's `Depends`
factory (`_get_service`) assembles the class per-request with zero boilerplate at the call site.

### `asyncio.create_task()` for background graph execution

`WorkflowService.start()` launches the graph via `asyncio.create_task(runner.run_graph(...))`,
not via FastAPI's `BackgroundTasks`. An explicit `session.commit()` is called before creating
the task.

`BackgroundTasks` would require the service interface to accept a FastAPI-specific object,
coupling the service layer to the HTTP transport. `asyncio.create_task()` keeps the service
transport-agnostic. The explicit `session.commit()` before the task is created mirrors the
reasoning from ADR 0003: the `WorkflowRun` row must be committed before the graph node that
updates it executes, since that node uses its own `AsyncSessionLocal()` session. In tests,
`asyncio.create_task` is patched out or `runner.run_graph` is mocked to return immediately.

### `reviewed_by` mocked to a fixed constant

All review actions (approve / reject / edit / regenerate) set `draft.reviewed_by =
"reviewer@acme.com"`. No authentication layer exists.

Authentication was explicitly out of scope for this challenge. Hardcoding a mock reviewer
avoids adding an auth middleware that adds complexity without demonstrating AI engineering
skill. The constant is defined in `workflow_service.py` and documented in README. Replacing it
with real auth is a one-line change per endpoint once an identity provider is integrated.

### Resume is conflict-checked but not idempotent across requests

`POST /workflows/{thread_id}/resume` returns 409 Conflict if the workflow is not in
`awaiting_human` status (including the case where a concurrent resume already moved it to
`running` or `completed`). Idempotency keys are not implemented.

Two concurrent resumes to the same paused thread would result in undefined graph state —
LangGraph checkpoints are not designed for concurrent writers on the same thread. The 409
ensures only one resume proceeds. Idempotency keys (where a second request with the same key
returns the first response) would require a separate store keyed on the idempotency token and
are overkill for a challenge with a single reviewer and no horizontal scaling requirement. The
409 approach is simple, correct, and surfaced clearly in the API contract.

### In-memory `EventBus` singleton for event publication

Workflow state changes (started, resumed, draft updated, completed, failed) publish
`WorkflowEvent` instances to an in-memory `EventBus` singleton. The bus stores subscribers in
a `defaultdict(list)` and dispatches them synchronously on publish. Spec 06 wires this bus to
SSE streams.

An event bus decouples the service from its consumers (the SSE handler, future audit log,
etc.) without requiring a message broker. In-memory is sufficient for a single-worker
deployment and trivially testable by mocking the bus. If multi-worker support is needed,
the bus implementation can be swapped for a Redis pub/sub backend without changing any
publisher or subscriber code. The trade-off is that events are lost if the process crashes
between publish and delivery — acceptable for a streaming UI where the client can poll as
fallback (spec 05 provides `GET /workflows/{thread_id}` for exactly this).

### Workflow run status reflects graph lifecycle, not draft aggregate status

`workflow_run.status = completed` is set when the graph reaches `END` (via approve, reject,
or edit actions). It does not require all drafts to be in a terminal state. `workflow_run.status
= failed` is set when the iteration cap is reached or the provider throws an unrecoverable error.

The graph lifecycle and the draft review lifecycle are independent: a reviewer could approve
one draft (graph reaches END, `workflow_run.status = completed`) while other drafts remain
`suggested`. This is consistent with the draft-by-draft review decision. The frontend can
display per-draft status independently from the overall workflow status without confusion.

## Consequences

- `POST /workflows/{thread_id}/resume` is a synchronous endpoint: it blocks until the graph
  completes or hits the next interrupt. For approve/reject/edit this is fast (no LLM calls).
  For regenerate, it blocks for the duration of one full refine → translate cycle (~5–30s).
  Spec 06 SSE mitigates this by streaming progress events while resume runs.
- Unreviewed drafts from earlier iterations persist in the DB with `status = suggested` even
  after regeneration creates new drafts. The frontend should sort by `created_at DESC` to
  surface the latest batch. Draft lineage is traceable via `parent_draft_id`.
- The `await_human_review` node updates `workflow_run.status` via its own `AsyncSessionLocal`
  session (and commits). The `WorkflowService.resume()` session must not overwrite this in the
  regenerate case — it checks `snapshot.next == ()` and only updates `workflow_run.status` when
  the graph has terminated.
- `GET /workflows/{thread_id}` includes `iteration` from graph state (`runner.get_state()`).
  If the runner is unavailable or the checkpoint has no state (workflow just started), iteration
  defaults to 0 with a logged warning — never a 500 error.
