"""Unit tests for InMemoryEventBus."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from unittest.mock import patch

import pytest

from src.events.bus import InMemoryEventBus
from src.events.types import Event, EventType


def _event(**kwargs: object) -> Event:
    return Event(
        type=EventType.WORKFLOW_STARTED,
        timestamp=datetime.now(tz=UTC),
        payload={},
        **kwargs,  # type: ignore[arg-type]
    )


@pytest.mark.asyncio
async def test_publish_to_subscriber_delivers_event() -> None:
    bus = InMemoryEventBus()
    received: list[Event] = []

    async def consume() -> None:
        async for e in bus.subscribe("workflow:t1"):
            received.append(e)
            break

    task = asyncio.create_task(consume())
    await asyncio.sleep(0.01)  # let subscriber register
    await bus.publish("workflow:t1", _event())
    await asyncio.wait_for(task, timeout=1.0)

    assert len(received) == 1
    assert received[0].type == EventType.WORKFLOW_STARTED


@pytest.mark.asyncio
async def test_two_subscribers_both_receive() -> None:
    bus = InMemoryEventBus()
    received_a: list[Event] = []
    received_b: list[Event] = []

    async def consume_a() -> None:
        async for e in bus.subscribe("workflow:t2"):
            received_a.append(e)
            break

    async def consume_b() -> None:
        async for e in bus.subscribe("workflow:t2"):
            received_b.append(e)
            break

    task_a = asyncio.create_task(consume_a())
    task_b = asyncio.create_task(consume_b())
    await asyncio.sleep(0.01)
    await bus.publish("workflow:t2", _event())
    await asyncio.wait_for(asyncio.gather(task_a, task_b), timeout=1.0)

    assert len(received_a) == 1
    assert len(received_b) == 1


@pytest.mark.asyncio
async def test_subscriber_disconnect_doesnt_break_publish() -> None:
    bus = InMemoryEventBus()
    received: list[Event] = []

    async def consume() -> None:
        async for e in bus.subscribe("workflow:t3"):
            received.append(e)
            break  # disconnect after first event

    task = asyncio.create_task(consume())
    await asyncio.sleep(0.01)
    await bus.publish("workflow:t3", _event())
    await asyncio.wait_for(task, timeout=1.0)

    # Subscriber removed — second publish must not raise
    await bus.publish("workflow:t3", _event())
    assert len(received) == 1


@pytest.mark.asyncio
async def test_full_queue_drops_event_logs_warning() -> None:
    bus = InMemoryEventBus()
    topic = "workflow:overflow"

    # Inject a full queue directly to simulate a slow subscriber
    full_queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=1)
    async with bus._lock:
        bus._subscribers[topic].add(full_queue)

    await bus.publish(topic, _event())  # fills the queue (maxsize=1)

    with patch("src.events.bus.logger") as mock_logger:
        await bus.publish(topic, _event())  # should drop and warn
        mock_logger.warning.assert_called_once_with("subscriber_queue_full", topic=topic)

    # Cleanup
    async with bus._lock:
        bus._subscribers[topic].discard(full_queue)


@pytest.mark.asyncio
async def test_subscription_context_manager_cleans_up() -> None:
    bus = InMemoryEventBus()
    topic = "workflow:ctx"

    async with bus.subscription(topic) as queue:
        assert topic in bus._subscribers
        assert queue in bus._subscribers[topic]

    assert queue not in bus._subscribers.get(topic, set())


@pytest.mark.asyncio
async def test_publish_to_unknown_topic_does_not_raise() -> None:
    bus = InMemoryEventBus()
    # No subscribers for this topic — should be a no-op
    await bus.publish("workflow:nobody", _event())
