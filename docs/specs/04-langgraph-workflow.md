# Spec 04 — LangGraph Content Workflow

## Goal

Model the complete cycle Draft → Suggested → Reviewed → Approved/Rejected as a LangGraph graph. This is **the heart of the solution** and the main differentiator vs candidates who treat the LLM as a wrapper.

## Out of scope

- The `interrupt()` and resume mechanics with human feedback: defined here, details in spec 05.
- SSE (spec 06).
- UI (specs 07-09).

## Mental model

> "The workflow state IS the graph state. We sync to the DB for queries and so it survives restarts; but the source of truth for control flow is the graph."

## Layout

```
backend/src/ai/graph/
├── __init__.py
├── state.py              # ContentWorkflowState TypedDict
├── nodes/
│   ├── __init__.py
│   ├── generate_draft.py
│   ├── extract_metadata.py
│   ├── translate.py
│   ├── await_human_review.py
│   └── refine.py
├── builder.py            # builds the StateGraph and compiles with checkpointer
├── runner.py             # interface used by the rest of the code
└── schemas.py            # pydantic models for structured outputs
```

## State definition

`backend/src/ai/graph/state.py`:

```python
from typing import TypedDict, Annotated, Literal
from operator import add


class TranslationDraft(TypedDict):
    language: str
    content: str
    draft_id: str | None  # populated when persisted


class ContentMetadata(TypedDict):
    sentiment: Literal["positive", "neutral", "negative"]
    tone: str
    keywords: list[str]
    estimated_reading_time_seconds: int


class HumanFeedback(TypedDict):
    action: Literal["approve", "reject", "edit", "regenerate"]
    edited_content: str | None
    notes: str | None


class ContentWorkflowState(TypedDict):
    # Input
    content_piece_id: str
    campaign_id: str
    content_type: str            # headline | description | cta | body
    brief: str
    source_language: str
    target_languages: list[str]
    source_text: str | None      # optional, extra brief from human

    # Working memory
    initial_draft: str | None
    metadata: ContentMetadata | None
    translations: Annotated[list[TranslationDraft], add]   # reducer: append

    # Human-in-the-loop
    pending_feedback: HumanFeedback | None
    iteration: int                # how many times went through refine

    # Output / control
    status: Literal["initializing", "generating", "extracting", "translating",
                    "awaiting_review", "refining", "approved", "rejected"]
    error: str | None
```

## Nodes

### `generate_draft`

```python
async def generate_draft(state: ContentWorkflowState) -> dict:
    provider = get_provider()
    prompt = registry.render(
        f"{state['content_type']}_generation",
        version=1,
        brief=state["brief"],
        content_type=state["content_type"],
        language=state["source_language"],
        source_text=state.get("source_text") or "(none)",
    )
    response = await provider.generate(prompt, temperature=0.8)
    return {
        "initial_draft": response.content,
        "status": "extracting",
    }
```

### `extract_metadata`

```python
async def extract_metadata(state: ContentWorkflowState) -> dict:
    provider = get_provider()
    prompt = registry.render(
        "metadata_extraction",
        text=state["initial_draft"],
    )
    metadata, _ = await provider.generate_structured(
        prompt,
        schema=ContentMetadata,  # pydantic model
        temperature=0.1,
    )
    return {"metadata": metadata.model_dump(), "status": "translating"}
```

### `translate` (fan-out)

For parallel fan-out in LangGraph use the `Send` API:

```python
from langgraph.types import Send


async def translate(state: ContentWorkflowState) -> dict:
    """No-op orchestrator. The fan-out happens via Send in the conditional edge."""
    return {"status": "translating"}


async def translate_to_language(state: dict) -> dict:
    """Each parallel branch."""
    provider = get_provider()
    prompt = registry.render(
        "translation",
        text=state["text"],
        source_language=state["source_language"],
        target_language=state["target_language"],
    )
    response = await provider.generate(prompt, temperature=0.3)
    return {
        "translations": [{
            "language": state["target_language"],
            "content": response.content,
            "draft_id": None,
        }],
    }
```

Conditional edge from `extract_metadata`:

```python
def fan_out_translations(state):
    return [
        Send("translate_to_language", {
            "text": state["initial_draft"],
            "source_language": state["source_language"],
            "target_language": lang,
        })
        for lang in state["target_languages"]
    ]
```

### `await_human_review`

This is where the magic happens. This node persists everything generated to the DB and then **interrupts**:

```python
from langgraph.types import interrupt


async def await_human_review(state: ContentWorkflowState) -> dict:
    # Persist initial_draft + translations as `Draft` rows with status='suggested'
    async with async_session_factory() as session:
        await persist_drafts_from_state(session, state)

    # Interrupt: the graph waits here
    feedback = interrupt({
        "content_piece_id": state["content_piece_id"],
        "drafts_count": 1 + len(state["translations"]),
        "status": "awaiting_review",
    })

    return {
        "pending_feedback": feedback,
        "status": "refining" if feedback["action"] in ("regenerate", "edit") else feedback["action"],
    }
```

### `refine`

If the human asked for `regenerate` (with `notes`) or accepted an edit and wants to regenerate other versions:

```python
async def refine(state: ContentWorkflowState) -> dict:
    feedback = state["pending_feedback"]
    provider = get_provider()
    refine_prompt = f"""
    Previous draft:
    {state["initial_draft"]}

    User feedback: {feedback["notes"]}

    Generate a new draft addressing this feedback.
    """
    response = await provider.generate(refine_prompt, temperature=0.7)
    return {
        "initial_draft": response.content,
        "iteration": state["iteration"] + 1,
        "status": "extracting",  # re-enters the cycle
    }
```

If `iteration > 5`, stop to avoid infinite loops. Final state is `failed` with a clear error.

## Graph wiring

`backend/src/ai/graph/builder.py`:

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver


def build_graph(checkpointer: BaseCheckpointSaver):
    builder = StateGraph(ContentWorkflowState)

    builder.add_node("generate_draft", generate_draft)
    builder.add_node("extract_metadata", extract_metadata)
    builder.add_node("translate_to_language", translate_to_language)
    builder.add_node("await_human_review", await_human_review)
    builder.add_node("refine", refine)

    builder.set_entry_point("generate_draft")
    builder.add_edge("generate_draft", "extract_metadata")
    builder.add_conditional_edges(
        "extract_metadata",
        fan_out_translations,
        ["translate_to_language"],
    )
    builder.add_edge("translate_to_language", "await_human_review")
    builder.add_conditional_edges(
        "await_human_review",
        route_after_review,
        {
            "refine": "refine",
            "done": END,
        },
    )
    builder.add_edge("refine", "extract_metadata")

    return builder.compile(checkpointer=checkpointer)


def route_after_review(state):
    feedback = state["pending_feedback"]
    if feedback["action"] in ("regenerate",) and state["iteration"] < 5:
        return "refine"
    return "done"
```

## Checkpointer

Using `langgraph-checkpoint-postgres`:

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


async def get_checkpointer() -> AsyncPostgresSaver:
    saver = AsyncPostgresSaver.from_conn_string(settings.database_url)
    await saver.setup()  # creates tables on first run
    return saver
```

> ⚠️ `setup()` is idempotent. Calling it on app startup is fine.

## Runner (public interface)

`backend/src/ai/graph/runner.py`:

```python
from langgraph.types import Command


class WorkflowRunner:
    def __init__(self, graph):
        self._graph = graph

    async def start(self, content_piece_id: UUID, **inputs) -> str:
        """Returns thread_id."""
        thread_id = str(uuid4())
        config = {"configurable": {"thread_id": thread_id}}

        # Persist workflow_run row
        async with async_session_factory() as session:
            run = WorkflowRun(
                content_piece_id=content_piece_id,
                langgraph_thread_id=thread_id,
                status=WorkflowStatus.RUNNING,
            )
            session.add(run)
            await session.commit()

        # Invoke (will run until interrupt or end)
        await self._graph.ainvoke(inputs, config=config)

        return thread_id

    async def resume(self, thread_id: str, feedback: HumanFeedback):
        config = {"configurable": {"thread_id": thread_id}}
        await self._graph.ainvoke(Command(resume=feedback), config=config)

    async def get_state(self, thread_id: str):
        config = {"configurable": {"thread_id": thread_id}}
        return await self._graph.aget_state(config)

    async def stream_events(self, thread_id: str, inputs: dict):
        config = {"configurable": {"thread_id": thread_id}}
        async for event in self._graph.astream_events(inputs, config=config, version="v2"):
            yield event
```

## API endpoint that triggers the graph

`POST /api/content-pieces/{id}/generate`

Body:
```json
{
  "provider": "anthropic"
}
```

Response 202 Accepted:
```json
{
  "workflow_run_id": "uuid",
  "thread_id": "uuid",
  "status": "running"
}
```

The endpoint launches the graph in the background (with FastAPI's `BackgroundTasks`) and returns the `thread_id` immediately. The client subsequently subscribes via SSE (spec 06).

## Tests

`tests/ai/graph/`:

- `test_state_initial_shape`: validate TypedDict.
- `test_generate_draft_node`: with `MockProvider`, assert it updates `initial_draft`.
- `test_extract_metadata_returns_structured`: `MockProvider` returns fixture, assert metadata.
- `test_translate_fan_out`: 3 languages → 3 entries in `translations`.
- `test_full_flow_until_interrupt`: invoke graph, assert it stops at `await_human_review` with correct state.
- `test_resume_with_approve_completes`: invoke + resume with `approve`, assert status `approved`.
- `test_resume_with_regenerate_loops`: same with `regenerate`, assert it loops back to generate.
- `test_iteration_cap_prevents_infinite_loop`: force 6 sequential regenerate, last one must end as `failed` or `rejected`.
- `test_checkpointer_persists_state`: invoke, simulate restart (new runner instance), recover state by thread_id.

For all: use `MockProvider` with deterministic fixtures. Zero calls to real LLMs.

## Acceptance criteria

- [ ] `POST /api/content-pieces/{id}/generate` returns 202 with `thread_id`.
- [ ] After a few seconds, drafts exist in DB with status `suggested` (in source_lang + each target_lang).
- [ ] The `workflow_run` has status `awaiting_human`.
- [ ] LangGraph checkpointer created its tables in the DB.
- [ ] Tests pass, coverage > 80% on `src/ai/graph/`.
- [ ] The graph can be inspected visually: `runner.get_graph().draw_mermaid()` produces a renderable mermaid. Paste it into `docs/architecture.md`.

## Suggested commit plan

```
feat(graph): define ContentWorkflowState typeddict and schemas
feat(graph): implement generate_draft and extract_metadata nodes
feat(graph): implement translate fan-out with send api
feat(graph): scaffold await_human_review node (interrupt placeholder)
feat(graph): implement refine node with iteration cap
feat(graph): wire stategraph and conditional edges
feat(graph): integrate postgres checkpointer
feat(graph): runner facade with start/resume/state/stream
feat(api): expose POST /content-pieces/{id}/generate
test(graph): node-level unit tests with mock provider
test(graph): full flow integration test until interrupt
docs(adr): 0003 langgraph workflow design
```

## Documented trade-offs

- **Why LangGraph and not plain LangChain:** the domain IS a state machine with humans-in-the-loop. LangGraph was designed exactly for this. Plain LangChain would force us to reimplement checkpoints, persistence, fan-out, interrupts… 80% of LangGraph's value that you don't want to throw away.
- **Why fan-out with `Send` and not `ainvoke` in a loop:** real parallelism in translations, total latency ≈ slowest translation, not the sum.
- **Why iteration cap:** prevents infinite loops if the human always asks for regenerate. 5 is arbitrary but defensible.
- **Why persist drafts in `await_human_review` and not in each node:** fewer writes, atomic transaction, consistent state. Trade-off: if the graph crashes between `translate` and `await_human_review`, you lose the outputs (but the checkpoint has them → you can re-run by resuming the graph, nothing is lost).
- **Why async everywhere:** I/O bound. Real perf, not theoretical.

## Notes

- LangGraph 1.x changed APIs. Verify `interrupt()` and `Command(resume=...)` are present in your installed version (they are in 1.1.0).
- `astream_events` with `version="v2"` gives granular per-node and per-LLM-chunk events. Required for SSE (spec 06).
- For `generate_structured` inside a node, do not call the SDK directly — use `provider.generate_structured` we already have.
- If LangGraph + async Postgres gives you connection pool issues, fall back to the sync `langgraph.checkpoint.postgres.PostgresSaver` in a threadpool. Not ideal but functional.
- Render the graph: add `scripts/render_graph.py` that writes the mermaid to `docs/graph.md`.
