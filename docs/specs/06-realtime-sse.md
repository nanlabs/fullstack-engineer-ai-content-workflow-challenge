# Spec 06 — Real-Time Updates with SSE

## Goal

Push to the frontend, in real time:
1. Workflow state changes (started, node transitions, awaiting_human, completed).
2. Draft state changes (suggested, approved, rejected, etc.).
3. **Bonus:** LLM token streaming while drafts are being generated.

All over SSE (Server-Sent Events). No WebSockets.

## Out of scope

- Consumer UI (specs 07-09).
- Auth (does not apply to MVP).

## Why SSE and not WebSockets

| Criterion | SSE | WebSockets |
|-----------|-----|------------|
| Direction | server → client | bidirectional |
| Reconnect | automatic in browser | manual |
| HTTP/2 | yes, multiplexed | no, requires upgrade |
| Crosses proxies/firewalls | natural (HTTP) | sometimes problematic |
| LLM token streaming | fits perfectly | overkill |
| FastAPI implementation | trivial (`StreamingResponse`) | requires extra lib |

Document in ADR 0004.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Backend                                                      │
│                                                               │
│  WorkflowService ──publish──▶ EventBus ──fan-out──▶ Subscribers│
│                                  ▲                            │
│                                  │                            │
│  LangGraph nodes ──publish──────┘                             │
│                                                               │
│                         InMemoryEventBus                      │
│                         (asyncio.Queue per topic)             │
│                                                               │
│                              ▲                                │
│                              │ subscribe                      │
└──────────────────────────────┼──────────────────────────────────
                               │
                  GET /api/campaigns/:id/events
                  GET /api/workflows/:thread_id/events
                               │
                               ▼
                          Frontend EventSource
```

## EventBus

`backend/src/events/`:

```
events/
├── __init__.py
├── types.py          # WorkflowEvent (partially defined in spec 05)
├── bus.py            # InMemoryEventBus
└── topics.py         # helpers for topic naming
```

### Event types (refined)

```python
from enum import StrEnum
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class EventType(StrEnum):
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_NODE_STARTED = "workflow.node.started"
    WORKFLOW_NODE_COMPLETED = "workflow.node.completed"
    WORKFLOW_TOKENS = "workflow.tokens"
    WORKFLOW_DRAFT_CREATED = "workflow.draft.created"
    WORKFLOW_AWAITING_HUMAN = "workflow.awaiting_human"
    WORKFLOW_RESUMED = "workflow.resumed"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    DRAFT_UPDATED = "draft.updated"


class Event(BaseModel):
    type: EventType
    timestamp: datetime
    campaign_id: UUID | None = None
    content_piece_id: UUID | None = None
    thread_id: str | None = None
    payload: dict
```

### EventBus interface

```python
class EventBus(Protocol):
    async def publish(self, topic: str, event: Event) -> None: ...
    def subscribe(self, topic: str) -> AsyncIterator[Event]: ...
```

### InMemoryEventBus (MVP)

```python
class InMemoryEventBus:
    def __init__(self):
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def publish(self, topic: str, event: Event) -> None:
        async with self._lock:
            queues = list(self._subscribers.get(topic, set()))
        for q in queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # subscriber is slow, drop. Log it.
                logger.warning("subscriber_queue_full", topic=topic)

    async def subscribe(self, topic: str) -> AsyncIterator[Event]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[topic].add(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            async with self._lock:
                self._subscribers[topic].discard(queue)
```

A **single singleton instance** via dependency injection:

```python
_bus = InMemoryEventBus()

def get_event_bus() -> EventBus:
    return _bus
```

> ⚠️ **Documented limitation (trade-off):** an in-memory bus only works with **a single worker**. If in the future you run with multiple uvicorn workers or multiple replicas, SSE clients connected to one worker do not receive events published from another. Solution: switch to `RedisEventBus` (Redis pub/sub). This is what the abstraction allows for, and it's a swap without touching callers. Document in README and ADR 0004.

### Topics

Standardize:
- `campaign:{id}` — all events of one campaign.
- `workflow:{thread_id}` — events specific to one workflow.
- `draft:{id}` — events of one draft (rare, you'll usually use the above).

Subscribers ask for the topics they care about. The frontend typically listens to `campaign:{id}` for the dashboard.

Each `publish()` can fan out to several topics:

```python
async def publish_workflow_event(bus, event: Event):
    if event.thread_id:
        await bus.publish(f"workflow:{event.thread_id}", event)
    if event.campaign_id:
        await bus.publish(f"campaign:{event.campaign_id}", event)
```

## SSE endpoints

`backend/src/api/routers/events.py`:

```python
@router.get("/campaigns/{campaign_id}/events")
async def campaign_events(
    campaign_id: UUID,
    bus: EventBus = Depends(get_event_bus),
):
    async def generator():
        last_heartbeat = time.monotonic()

        async for event in bus.subscribe(f"campaign:{campaign_id}"):
            yield f"event: {event.type}\ndata: {event.model_dump_json()}\n\n"

            # heartbeat every 15s
            if time.monotonic() - last_heartbeat > 15:
                yield ": heartbeat\n\n"
                last_heartbeat = time.monotonic()

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx friendly
            "Connection": "keep-alive",
        },
    )
```

Analogously for `/workflows/{thread_id}/events`.

### SSE event format

```
event: workflow.draft.created
data: {"type":"workflow.draft.created","timestamp":"...","content_piece_id":"...","payload":{"draft_id":"...","language":"en"}}

```

(Double newline at the end separates events.)

## LLM token streaming

This is the **visually impactful bonus**. When a graph node is generating a draft, the tokens stream live to the UI.

### How

Inside the `generate_draft` node, instead of `await provider.generate(...)`, use `provider.generate_stream(...)`:

```python
async def generate_draft(state):
    bus = get_event_bus()
    provider = get_provider()
    full_text = ""

    async for chunk in provider.generate_stream(prompt, ...):
        if chunk.is_final:
            await bus.publish_workflow_event(
                Event(type=EventType.WORKFLOW_NODE_COMPLETED, payload={"node": "generate_draft"}, ...)
            )
            return {"initial_draft": full_text, "status": "extracting"}

        full_text += chunk.delta
        await bus.publish_workflow_event(
            Event(
                type=EventType.WORKFLOW_TOKENS,
                payload={"node": "generate_draft", "delta": chunk.delta},
                ...
            )
        )
```

The frontend receives `workflow.tokens` with `delta` and concatenates them to show the text being generated.

### Throttling

If the provider streams too fast, it can flood the queue. Buffer up to N characters or every M ms and publish in batches:

```python
buffer = ""
last_flush = time.monotonic()
async for chunk in provider.generate_stream(...):
    buffer += chunk.delta
    if len(buffer) > 20 or time.monotonic() - last_flush > 0.05:
        await bus.publish(... payload={"delta": buffer})
        buffer = ""
        last_flush = time.monotonic()
```

> Trade-off: 50ms of visual latency vs stability under load. Acceptable.

## Frontend client (preview, full in spec 07)

`useEventStream(url)` hook:

```ts
function useEventStream<T>(url: string, onEvent: (event: T) => void) {
  useEffect(() => {
    const es = new EventSource(url, { withCredentials: false });
    es.onmessage = (e) => onEvent(JSON.parse(e.data));
    es.addEventListener("workflow.tokens", (e) => onEvent(JSON.parse((e as MessageEvent).data)));
    // ... other types
    es.onerror = () => {
      // EventSource auto-reconnects; we just log
    };
    return () => es.close();
  }, [url]);
}
```

## Tests

### `tests/events/test_bus.py`

- `test_publish_to_subscriber_delivers_event`
- `test_two_subscribers_both_receive`
- `test_subscriber_disconnect_doesnt_break_publish`
- `test_full_queue_drops_event_logs_warning`

### `tests/api/test_sse.py`

Trickier because of the stream. Strategy:
- Use `httpx.AsyncClient` with `stream("GET", ...)` and read `aiter_bytes()` with timeout.
- Trigger publish from a parallel task.
- Assert the client receives the expected event in SSE format.

```python
async def test_campaign_events_stream(client, bus):
    async with client.stream("GET", f"/api/campaigns/{campaign_id}/events") as response:
        async def consume():
            async for chunk in response.aiter_bytes():
                return chunk

        # publish from a separate task
        asyncio.create_task(bus.publish(f"campaign:{campaign_id}", Event(...)))

        chunk = await asyncio.wait_for(consume(), timeout=2)
        assert b"event: workflow.started" in chunk
```

## Acceptance criteria

- [ ] `curl -N http://localhost:8000/api/campaigns/{id}/events` stays open and shows events when actions happen.
- [ ] Trigger a workflow + review drafts → the SSE terminal shows: `workflow.started`, `workflow.node.started` (multiple), `workflow.tokens` (many if streaming on), `workflow.awaiting_human`, `draft.updated`, `workflow.completed`.
- [ ] Heartbeat appears every ~15s even with no events.
- [ ] Tests pass (including stream tests with timeouts).
- [ ] If `pnpm dev` of the frontend is open in two tabs, both reflect changes in real time.

## Suggested commit plan

```
feat(events): define event types and bus protocol
feat(events): in-memory event bus with queue per subscriber
feat(events): integrate bus into workflow service publishes
feat(api): SSE endpoint for campaign events
feat(api): SSE endpoint for workflow events
feat(graph): publish token streaming events from generate_draft
test(events): bus unit tests
test(api): sse stream integration tests
docs(adr): 0004 sse over websockets
```

## Trade-offs (ADR 0004)

- **In-memory bus vs Redis pub/sub:** in-memory for simplicity. Works perfectly with 1 worker (MVP case). Document the upgrade path.
- **SSE vs WebSockets:** SSE wins. Listed above.
- **SSE vs polling:** polling every N seconds is simpler but doesn't feel real-time, and for token streaming it's unviable.
- **Token streaming on by default:** yes, it's worth the visual feature.

## Notes

- In FastAPI, `StreamingResponse` with an async generator is the clean way.
- Headers `X-Accel-Buffering: no` and `Cache-Control: no-cache` prevent proxies (nginx, cloudflare) from buffering.
- In dev with Vite, configure the proxy so `/api/*/events` doesn't buffer (Vite proxy supports it natively).
- Browsers limit ~6 HTTP/1.1 connections per origin. SSE consumes one. If you open 6 tabs all with SSE, it stalls. **Mitigation:** with HTTP/2 this disappears. Not relevant for the challenge (1-2 tabs).
- `EventSource` in the browser does not allow custom headers (including `Authorization`). If auth becomes needed in the future, do it via cookie or query param. Document.
