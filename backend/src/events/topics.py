from __future__ import annotations

from uuid import UUID

from src.events.bus import InMemoryEventBus
from src.events.types import Event


def campaign_topic(campaign_id: UUID | str) -> str:
    return f"campaign:{campaign_id}"


def workflow_topic(thread_id: str) -> str:
    return f"workflow:{thread_id}"


def draft_topic(draft_id: UUID | str) -> str:
    return f"draft:{draft_id}"


async def publish_workflow_event(bus: InMemoryEventBus, event: Event) -> None:
    """Fan-out a workflow event to all relevant topics (workflow + campaign)."""
    if event.thread_id:
        await bus.publish(workflow_topic(event.thread_id), event)
    if event.campaign_id is not None:
        await bus.publish(campaign_topic(str(event.campaign_id)), event)
