from __future__ import annotations

from uuid import UUID

import structlog
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt
from sqlalchemy import update as sa_update

from src.ai.graph.state import ContentWorkflowState, HumanFeedback
from src.db.enums import DraftStatus, WorkflowStatus
from src.db.models.draft import Draft
from src.db.models.workflow_run import WorkflowRun
from src.db.session import AsyncSessionLocal

logger = structlog.get_logger(__name__)


async def _persist_drafts_from_state(
    session: object,
    state: ContentWorkflowState,
    thread_id: str,
) -> None:
    """Write source draft + translations to DB and mark workflow as awaiting_human."""
    await session.execute(  # type: ignore[union-attr]
        sa_update(WorkflowRun)
        .where(WorkflowRun.langgraph_thread_id == thread_id)
        .values(status=WorkflowStatus.awaiting_human, current_node="await_human_review")
    )

    source_draft = Draft(
        content_piece_id=UUID(state["content_piece_id"]),
        language=state["source_language"],
        status=DraftStatus.suggested,
        ai_content=state["initial_draft"],
        content_metadata=state["metadata"],
    )
    session.add(source_draft)  # type: ignore[union-attr]

    # Only persist the latest batch of translations (last N entries where N = target count).
    # The `add` reducer accumulates across refine iterations; we only want the newest set.
    n_langs = len(state["target_languages"])
    latest = state["translations"][-n_langs:] if state["translations"] else []
    for translation in latest:
        session.add(  # type: ignore[union-attr]
            Draft(
                content_piece_id=UUID(state["content_piece_id"]),
                language=translation["language"],
                status=DraftStatus.suggested,
                ai_content=translation["content"],
            )
        )

    await session.commit()  # type: ignore[union-attr]


async def await_human_review(
    state: ContentWorkflowState,
    config: RunnableConfig,
) -> dict:
    thread_id: str = config["configurable"]["thread_id"]

    async with AsyncSessionLocal() as session:
        await _persist_drafts_from_state(session, state, thread_id)

    logger.info(
        "awaiting_human_review",
        content_piece_id=state["content_piece_id"],
        thread_id=thread_id,
        iteration=state["iteration"],
    )

    # Graph suspends here; resumes when Command(resume=feedback) is issued.
    feedback: HumanFeedback = interrupt(
        {
            "content_piece_id": state["content_piece_id"],
            "drafts_count": 1 + len(state["target_languages"]),
            "status": "awaiting_review",
        }
    )

    action = feedback["action"]

    if action == "regenerate" and state["iteration"] >= 5:
        return {
            "pending_feedback": feedback,
            "status": "failed",
            "error": (
                f"Maximum refinement iterations (5) reached after {state['iteration']} attempts."
            ),
        }

    if action in ("regenerate", "edit"):
        new_status = "refining"
    elif action == "approve":
        new_status = "approved"
    elif action == "reject":
        new_status = "rejected"
    else:
        new_status = action

    return {
        "pending_feedback": feedback,
        "status": new_status,
        "error": None,
    }
