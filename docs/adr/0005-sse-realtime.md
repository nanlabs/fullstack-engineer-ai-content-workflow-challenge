# ADR 0005 — Real-Time Updates via SSE with In-Memory Event Bus

## Status

Accepted

## Context

The content workflow system needs to push state changes to the frontend in real time:

1. Workflow state transitions (started, node started/completed, awaiting human, completed, failed).
2. Draft state changes (created, updated after review).
3. LLM token streaming while drafts are being generated — for visual immediacy.

Three transport options were considered: polling, WebSockets, and Server-Sent Events (SSE).

For the pub/sub backend, the choice was between in-process queues and an external broker (Redis pub/sub).

## Decision

### Transport: SSE over WebSockets

| Criterion | SSE | WebSockets |
|-----------|-----|------------|
| Direction | server → client (fits our use case) | bidirectional (not needed) |
| Reconnect | automatic in browser (`EventSource`) | manual |
| HTTP/2 | multiplexed naturally | requires protocol upgrade |
| Proxy / firewall traversal | natural HTTP | sometimes problematic |
| LLM token streaming | fits perfectly | overkill |
| FastAPI implementation | `StreamingResponse` + async generator | requires extra library |

All traffic is server → client: workflow events, draft updates, token deltas. SSE is the right primitive. WebSockets would add complexity with no benefit.

**Polling** was rejected: token streaming cannot be done via polling without unacceptable latency; workflow state changes need sub-second feedback.

### Event Bus: In-Memory with asyncio.Queue

`InMemoryEventBus` uses one `asyncio.Queue(maxsize=100)` per subscriber. Events are published to **topics** (`campaign:{id}`, `workflow:{thread_id}`) and fan out to all queues registered for that topic.

Advantages:
- Zero infrastructure overhead (no Redis, no broker process).
- Async-native: no threads, no callbacks, pure `asyncio`.
- Swappable: callers use `InMemoryEventBus` behind `get_event_bus()`; a `RedisEventBus` can be dropped in without touching publishers or SSE endpoints.

**Documented limitation:** works only with a **single uvicorn worker**. If the application scales to multiple workers or replicas, SSE clients on worker A do not receive events published by worker B. The upgrade path is a `RedisEventBus` backed by Redis pub/sub — the abstraction boundary is already in place.

### Topic naming

- `campaign:{uuid}` — all events belonging to one campaign (used by the dashboard view).
- `workflow:{thread_id}` — events for a specific workflow run (detailed view).
- `draft:{uuid}` — per-draft events (rarely needed; callers usually subscribe to campaign or workflow).

`publish_workflow_event(bus, event)` fans out to both `workflow:{thread_id}` and `campaign:{campaign_id}` when those fields are set on the event.

### Token Streaming

The `generate_draft` graph node uses `provider.generate_stream()` instead of `provider.generate()`. Chunks are buffered (≥20 chars or ≥50 ms) before publishing `workflow.tokens` events to avoid flooding the queue. The frontend concatenates `delta` fields to display text being generated in real time.

### SSE Heartbeat

Each SSE endpoint uses `asyncio.wait_for(queue.get(), timeout=15s)`. On `TimeoutError`, it yields a comment (`": heartbeat\n\n"`) to keep the connection alive through proxies that close idle connections.

## Consequences

- `GET /api/campaigns/{id}/events` and `GET /api/workflows/{thread_id}/events` stream SSE indefinitely until the client disconnects.
- Headers `Cache-Control: no-cache` and `X-Accel-Buffering: no` prevent proxy buffering (nginx, Cloudflare).
- `EventSource` in browsers reconnects automatically on disconnection — no client-side retry logic needed.
- `EventSource` does not support custom `Authorization` headers. If auth is added in the future, use a cookie or a short-lived query-param token (documented as known limitation).
- Browsers limit ~6 HTTP/1.1 connections per origin; SSE uses one. With HTTP/2 this limit disappears. For the MVP (1-2 tabs) this is not an issue.
- Multi-worker deployment requires switching to `RedisEventBus` — this is the only breaking change, and it only affects `get_event_bus()`.
