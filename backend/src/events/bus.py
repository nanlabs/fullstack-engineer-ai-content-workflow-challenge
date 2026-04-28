from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Coroutine
from typing import Any

import structlog

from src.events.types import WorkflowEvent

logger = structlog.get_logger(__name__)

# Module-level singleton — replaced by Redis in multi-worker setup (documented trade-off).
_bus: EventBus | None = None


class EventBus:
    """In-memory pub/sub bus for workflow events. Spec 06 wires this to SSE."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Callable[..., Coroutine[Any, Any, None]]]] = defaultdict(
            list
        )

    async def publish(self, event: WorkflowEvent) -> None:
        logger.info(
            "event_published",
            event_type=event.type,
            thread_id=event.thread_id,
        )
        for handler in list(self._subscribers.get(event.type, [])):
            await handler(event)
        for handler in list(self._subscribers.get("*", [])):
            await handler(event)

    def subscribe(
        self, event_type: str, handler: Callable[..., Coroutine[Any, Any, None]]
    ) -> None:
        self._subscribers[event_type].append(handler)


def get_event_bus() -> EventBus:
    global _bus
    if _bus is None:
        _bus = EventBus()
    return _bus
