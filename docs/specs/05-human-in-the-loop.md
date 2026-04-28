# Spec 05 — Human-in-the-Loop & Workflow Resume

## Goal

Implement the pause/feedback/resume mechanics of the workflow. The graph interrupts waiting for human input (Approve / Reject / Edit / Regenerate); the API receives the feedback and resumes the graph. DB drafts reflect the result.

## Out of scope

- The graph and the nodes themselves (spec 04).
- SSE streaming of workflow events (spec 06).
- Review UI (spec 09).

## Mental model

```
                  start workflow
                        │
                        ▼
        ┌─────────────────────────────────┐
        │  Graph runs nodes synchronously  │
        │  generate → metadata → translate │
        └────────────────┬────────────────┘
                         ▼
                  await_human_review
                  ─ persists drafts to DB (status='suggested')
                  ─ updates workflow_run.status = 'awaiting_human'
                  ─ INTERRUPT
                         │
                         ▼
        (graph paused, state in checkpoint table)

                         │
                         │  ←── user reviews drafts via UI
                         │      sends action via API
                         ▼
              POST /workflows/:id/resume
              { action, edited_content?, notes? }
                         │
                         ▼
              graph.resume(feedback)
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
       refine (loop back)       END (approved/rejected)
                                update drafts to final status
```

## API endpoints

### `POST /api/workflows/{thread_id}/resume`

Body:
```json
{
  "action": "approve" | "reject" | "edit" | "regenerate",
  "draft_id": "uuid",
  "edited_content": "string?",
  "notes": "string?"
}
```

Validations:
- `action=edit` → `edited_content` is required.
- `action=regenerate` → `notes` is required (the LLM needs feedback to refine).
- `action=approve|reject` → `notes` is optional.
- `draft_id` must belong to the workflow_run for this `thread_id`.

Response 200:
```json
{
  "workflow_run_id": "uuid",
  "thread_id": "uuid",
  "new_status": "awaiting_human" | "completed" | "running",
  "draft": { ...DraftRead }
}
```

Errors:
- 404 if `thread_id` does not exist.
- 409 if the workflow is not in `awaiting_human` (`Workflow is not awaiting input, current status: completed`).
- 422 if payload validation fails.

### `GET /api/workflows/{thread_id}`

Status snapshot of the workflow:
```json
{
  "thread_id": "uuid",
  "content_piece_id": "uuid",
  "status": "running" | "awaiting_human" | "completed" | "failed",
  "current_node": "translate_to_language",
  "iteration": 0,
  "started_at": "...",
  "finished_at": "...",
  "error": null,
  "drafts": [...]
}
```

Useful so the frontend can poll if SSE is unavailable (degraded fallback).

### `GET /api/workflows`

Query params: `content_piece_id`, `status`, `limit`, `offset`.
List of workflow runs.

## Resume service

`backend/src/services/workflow_service.py`:

```python
class WorkflowService:
    def __init__(
        self,
        runner: WorkflowRunner,
        session: AsyncSession,
        events: EventBus,  # spec 06
    ):
        ...

    async def start(self, content_piece_id: UUID) -> WorkflowRun:
        # Load content_piece + its campaign
        # Build inputs dict from those
        # Call runner.start(...)
        # Return WorkflowRun row
        ...

    async def resume(
        self,
        thread_id: str,
        action: ReviewAction,
        draft_id: UUID,
        edited_content: str | None,
        notes: str | None,
    ) -> ResumeResult:
        # 1. Load workflow_run, check status == awaiting_human
        # 2. Load target draft
        # 3. Apply local effects to the draft (status update, edited_content, etc.)
        # 4. Build HumanFeedback dict for the graph
        # 5. Call runner.resume(thread_id, feedback)
        # 6. After resume returns, re-read graph state to know final status
        # 7. Update workflow_run row accordingly
        # 8. Publish event to bus for SSE
        # 9. Return result with updated draft
        ...
```

### Effects per action

| Action | Effect on Draft (this draft) | Graph behavior |
|--------|------------------------------|----------------|
| `approve` | `status=approved`, `reviewed_at=now`, `reviewed_by=mock_user` | Graph proceeds → `END` |
| `reject` | `status=rejected`, `reviewed_at=now`, `review_notes=notes` | Graph proceeds → `END` |
| `edit` | `status=reviewed`, `edited_content=...`, `reviewed_at=now` | Graph proceeds → `END` |
| `regenerate` | `status=rejected`, `review_notes=notes` (this draft becomes rejected) | Graph loops to `refine` → eventually new drafts created with `parent_draft_id` set |

> **Decision:** approve/reject/edit are **terminal**. Regenerate is **iterative**.

> **Decision:** approve/reject/edit applies to the **specific draft** the human reviewed. Other drafts of the same workflow (e.g. translations) stay in `suggested` until reviewed individually. This means technically each draft can be in a different state.
>
> **Documented trade-off:** simplifies the MVP. The alternative (review all drafts of the workflow as a block) is more UX-complex and less flexible. Hence we choose draft-by-draft.

## Workflow_run states

```
  pending ─→ running ─→ awaiting_human ─┬─→ running (refine loop)
                                        ├─→ completed
                                        └─→ failed
```

`completed` is reached when:
- All drafts in the workflow are in a terminal state (`approved`, `rejected`, `reviewed`).
- OR the graph reached END.

Note: the graph can reach END but leave drafts unreviewed. **Decision:** `workflow_run.status` reflects the **graph** state (terminated or not). Drafts have their own independent lifecycle. Document this.

## Events published to the bus (consumed by SSE)

Each workflow action publishes events. Define them in `src/events/types.py`:

```python
class WorkflowEvent(BaseModel):
    type: str
    thread_id: str
    content_piece_id: UUID
    timestamp: datetime
    payload: dict


# Types:
# workflow.started
# workflow.node.started        { node_name }
# workflow.node.completed      { node_name, duration_ms }
# workflow.tokens              { delta }      # streaming, see spec 06
# workflow.draft.created       { draft_id, language }
# workflow.awaiting_human      { drafts_count }
# workflow.resumed             { action }
# workflow.draft.updated       { draft_id, status }
# workflow.completed
# workflow.failed              { error }
```

In this spec, the important part: on every change in draft or workflow state, **publish the corresponding event**. The bus implementation lives in spec 06.

## Tests

### `tests/services/test_workflow_service.py`

- `test_start_creates_workflow_run_and_returns_thread_id`
- `test_resume_approve_sets_draft_approved_and_completes_run`
- `test_resume_edit_persists_edited_content`
- `test_resume_regenerate_loops_back_and_creates_new_drafts`
- `test_resume_with_invalid_action_raises_validation`
- `test_resume_when_not_awaiting_raises_conflict`
- `test_resume_with_missing_edited_content_when_action_edit_raises`
- `test_resume_publishes_events`

### `tests/api/test_workflow_resume.py`

- `test_resume_endpoint_happy_path`
- `test_resume_endpoint_404_unknown_thread`
- `test_resume_endpoint_409_already_completed`
- `test_resume_endpoint_422_invalid_body`

All with `MockProvider` and seeded data.

## Edge cases to handle

- **Resume with thread_id of a `completed` workflow:** 409 Conflict, clear message.
- **Resume while the graph is still running (`running`):** 409 Conflict (`Workflow is busy, current node: translate_to_language`).
- **Crash between `await_human_review` interrupt and resume:** OK because state is checkpointed. Restart the app and resume keeps working.
- **Iteration cap reached (>5 regenerate):** `workflow_run.status = completed`, latest draft with `review_notes = "max iterations reached"`. Document in README.
- **Provider fails during refine:** `workflow_run.status = failed`, error message. UI shows retry option.

## Observability

Log (with `structlog`) every event:
```
workflow_started thread_id=... content_piece_id=...
workflow_node_started node=generate_draft thread_id=...
workflow_node_completed node=generate_draft duration_ms=1245
workflow_awaiting_human thread_id=... drafts=4
workflow_resumed thread_id=... action=edit
workflow_completed thread_id=...
```

This also helps for local debugging.

## Acceptance criteria

- [ ] Manual end-to-end flow:
  1. `POST /api/content-pieces/{id}/generate` → receive `thread_id`.
  2. Wait (logs show progress) until `workflow_run.status = awaiting_human`.
  3. `GET /api/workflows/{thread_id}` shows drafts in `suggested`.
  4. `POST /api/workflows/{thread_id}/resume` with `action=approve` → draft moves to `approved`, workflow to `completed`.
- [ ] Service and API tests pass.
- [ ] Structured logs show clear traceability.
- [ ] Crash test: kill the process after the interrupt, restart, resume still works.

## Suggested commit plan

```
feat(api): expose GET /workflows and GET /workflows/{thread_id}
feat(api): expose POST /workflows/{thread_id}/resume
feat(services): workflow service with start and resume
feat(services): apply review action effects to drafts
feat(events): define workflow event types
feat(services): publish events on workflow state changes
test(services): workflow service unit tests
test(api): workflow resume endpoint integration tests
docs(adr): 0005 human-in-the-loop design
```

## Trade-offs and decisions for ADR 0004

- **Draft-by-draft vs workflow-as-a-block:** chose draft-by-draft for simplicity and UX flexibility.
- **`approve` and `reject` do not affect other drafts of the same workflow:** conscious decision, document it.
- **Iteration cap = 5:** arbitrary but protects against infinite cost.
- **`reviewed_by` mocked to a fixed string:** auth was not requested, clarified in README.
- **Resume is idempotent only within the same transition:** if a client sends two resumes in a row to the same thread, the second gets 409. Do NOT implement idempotency keys (overkill for the challenge).

## Notes

- LangGraph's `interrupt()` takes a dict payload — that lives in the checkpoint state and is returned when you call `aget_state()`. Useful for showing in UI "what needs review".
- `Command(resume=feedback_dict)` is the idiomatic way to resume.
- If you serialize `HumanFeedback` (TypedDict) when passing to `Command(resume=...)`, remember that LangGraph serializes state via pickle by default — `pydantic-validate` it before passing to prevent corrupted state.
- `runner.aget_state(config)` is the query you'll call most; cache it per request if you call it multiple times.
