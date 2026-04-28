from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.events.bus import InMemoryEventBus, get_event_bus

router = APIRouter()

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",  # prevent nginx buffering
    "Connection": "keep-alive",
}
_HEARTBEAT_INTERVAL = 15.0  # seconds


async def _sse_generator(bus: InMemoryEventBus, topic: str) -> AsyncGenerator[str, None]:
    async with bus.subscription(topic) as queue:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_INTERVAL)
                yield f"event: {event.type}\ndata: {event.model_dump_json()}\n\n"
            except TimeoutError:
                yield ": heartbeat\n\n"


@router.get("/campaigns/{campaign_id}/events")
async def campaign_events(
    campaign_id: UUID,
    bus: InMemoryEventBus = Depends(get_event_bus),
) -> StreamingResponse:
    return StreamingResponse(
        _sse_generator(bus, f"campaign:{campaign_id}"),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/workflows/{thread_id}/events")
async def workflow_events(
    thread_id: str,
    bus: InMemoryEventBus = Depends(get_event_bus),
) -> StreamingResponse:
    return StreamingResponse(
        _sse_generator(bus, f"workflow:{thread_id}"),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
