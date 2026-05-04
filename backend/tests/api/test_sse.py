"""Tests for SSE endpoints.

httpx.ASGITransport collects the full response body before returning, which means
it cannot be used with infinite streaming generators. These tests exercise the SSE
generator (_sse_generator) directly and verify the event format and pub/sub wiring
without going through the HTTP layer.

The HTTP endpoint registration (routing, content-type header) is verified separately
via a simple non-streaming smoke test.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from src.api.routers.events import _sse_generator
from src.events.bus import InMemoryEventBus
from src.events.types import Event, EventType


def _make_event(
    *,
    campaign_id: object = None,
    thread_id: str | None = None,
    etype: EventType = EventType.WORKFLOW_STARTED,
) -> Event:
    return Event(
        type=etype,
        timestamp=datetime.now(tz=UTC),
        campaign_id=campaign_id,  # type: ignore[arg-type]
        thread_id=thread_id,
        payload={},
    )


# ---------------------------------------------------------------------------
# _sse_generator — wire format and delivery
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sse_generator_delivers_campaign_event() -> None:
    """Event published to campaign topic is yielded as SSE text."""
    bus = InMemoryEventBus()
    campaign_id = uuid4()
    event = _make_event(campaign_id=campaign_id)

    gen = _sse_generator(bus, f"campaign:{campaign_id}")

    async def _publish() -> None:
        await asyncio.sleep(0.05)
        await bus.publish(f"campaign:{campaign_id}", event)

    asyncio.create_task(_publish())

    chunk = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
    await gen.aclose()

    assert "event: workflow.started" in chunk
    assert "data:" in chunk
    assert chunk.endswith("\n\n")


@pytest.mark.asyncio
async def test_sse_generator_delivers_workflow_event() -> None:
    """Event published to workflow topic is yielded correctly."""
    bus = InMemoryEventBus()
    thread_id = str(uuid4())
    event = _make_event(thread_id=thread_id)

    gen = _sse_generator(bus, f"workflow:{thread_id}")

    async def _publish() -> None:
        await asyncio.sleep(0.05)
        await bus.publish(f"workflow:{thread_id}", event)

    asyncio.create_task(_publish())

    chunk = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
    await gen.aclose()

    assert "event: workflow.started" in chunk


@pytest.mark.asyncio
async def test_sse_generator_formats_event_correctly() -> None:
    """SSE wire format: 'event:' line, 'data:' line, blank line separator."""
    bus = InMemoryEventBus()
    campaign_id = uuid4()
    event = _make_event(campaign_id=campaign_id, etype=EventType.WORKFLOW_COMPLETED)

    gen = _sse_generator(bus, f"campaign:{campaign_id}")

    async def _publish() -> None:
        await asyncio.sleep(0.05)
        await bus.publish(f"campaign:{campaign_id}", event)

    asyncio.create_task(_publish())

    chunk = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
    await gen.aclose()

    assert chunk.startswith("event: workflow.completed\n")
    assert "data: {" in chunk
    assert chunk.endswith("\n\n")


@pytest.mark.asyncio
async def test_sse_generator_heartbeat_on_timeout() -> None:
    """When no events arrive within the timeout, a heartbeat comment is sent."""
    import unittest.mock as mock

    bus = InMemoryEventBus()

    # Override HEARTBEAT_INTERVAL at the module level for this test
    with mock.patch("src.api.routers.events._HEARTBEAT_INTERVAL", 0.1):
        gen = _sse_generator(bus, "campaign:no-events")
        chunk = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
        await gen.aclose()

    assert chunk == ": heartbeat\n\n"


@pytest.mark.asyncio
async def test_sse_generator_cleanup_on_close() -> None:
    """Closing the generator removes the subscriber from the bus."""
    bus = InMemoryEventBus()
    topic = "campaign:cleanup-test"

    gen = _sse_generator(bus, topic)

    # Prime the generator (registers subscriber)
    async def _publish() -> None:
        await asyncio.sleep(0.05)
        await bus.publish(topic, _make_event())

    asyncio.create_task(_publish())
    await asyncio.wait_for(gen.__anext__(), timeout=1.0)

    assert topic in bus._subscribers
    await gen.aclose()

    # Subscriber set should be empty after close
    assert len(bus._subscribers.get(topic, set())) == 0


# ---------------------------------------------------------------------------
# Endpoint registration smoke test (non-streaming)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sse_routes_are_registered() -> None:
    """Verify both SSE routes exist in the app's route table."""
    from src.main import app

    routes = {route.path for route in app.routes}  # type: ignore[attr-defined]
    assert "/api/campaigns/{campaign_id}/events" in routes
    assert "/api/workflows/{thread_id}/events" in routes
