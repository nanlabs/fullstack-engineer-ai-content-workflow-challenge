from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog

from src.events.types import Event

logger = structlog.get_logger(__name__)

# Module-level singleton — swap for RedisEventBus in multi-worker deployments (ADR 0005).
_bus: InMemoryEventBus | None = None


class InMemoryEventBus:
    """Async pub/sub bus backed by one asyncio.Queue per subscriber.

    Single-worker only. See ADR 0005 for the Redis upgrade path.
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[Event]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def publish(self, topic: str, event: Event) -> None:
        logger.debug("event_published", topic=topic, event_type=event.type)
        async with self._lock:
            queues = list(self._subscribers.get(topic, set()))
        for q in queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("subscriber_queue_full", topic=topic)

    @asynccontextmanager
    async def subscription(self, topic: str) -> AsyncGenerator[asyncio.Queue[Event], None]:
        """Context manager that registers a bounded queue for *topic* and removes it on exit."""
        queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[topic].add(queue)
        try:
            yield queue
        finally:
            async with self._lock:
                self._subscribers[topic].discard(queue)

    async def subscribe(self, topic: str) -> AsyncGenerator[Event, None]:
        """Async generator that yields events as they arrive. Cleans up on exit."""
        queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[topic].add(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            async with self._lock:
                self._subscribers[topic].discard(queue)


def get_event_bus() -> InMemoryEventBus:
    global _bus
    if _bus is None:
        _bus = InMemoryEventBus()
    return _bus
