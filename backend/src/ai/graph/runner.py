from __future__ import annotations

from datetime import UTC, datetime

import structlog
from langgraph.types import Command
from sqlalchemy import update as sa_update

from src.ai.graph.state import HumanFeedback
from src.config import settings
from src.db.enums import WorkflowStatus
from src.db.models.workflow_run import WorkflowRun
from src.db.session import AsyncSessionLocal

# AsyncPostgresSaver is imported lazily inside init_runner() to avoid triggering
# the psycopg / libpq import chain at module load time (which fails if libpq is absent).

logger = structlog.get_logger(__name__)

# Module-level singletons initialised on app startup via init_runner().
_runner: WorkflowRunner | None = None
# Holds the async context manager so we can exit it cleanly on shutdown.
_checkpointer_cm: object | None = None


def _checkpoint_db_url() -> str:
    """Convert the SQLAlchemy asyncpg URL to a psycopg3-compatible URL."""
    return settings.database_url.replace("+asyncpg", "")


async def init_runner() -> None:
    """Called once on application startup to initialise the graph and checkpointer."""
    global _runner, _checkpointer_cm
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver  # lazy — needs libpq

    from src.ai.graph.builder import build_graph

    # from_conn_string() is an @asynccontextmanager in langgraph-checkpoint-postgres v3.
    cm = AsyncPostgresSaver.from_conn_string(_checkpoint_db_url())
    saver = await cm.__aenter__()
    await saver.setup()  # idempotent — creates LangGraph checkpoint tables if missing
    _checkpointer_cm = cm

    graph = build_graph(saver)
    _runner = WorkflowRunner(graph)
    logger.info("workflow_runner_initialised")


async def shutdown_runner() -> None:
    """Called on application shutdown to release the checkpointer connection pool."""
    global _checkpointer_cm
    if _checkpointer_cm is not None:
        await _checkpointer_cm.__aexit__(None, None, None)
        _checkpointer_cm = None


def get_runner() -> WorkflowRunner:
    if _runner is None:
        raise RuntimeError("WorkflowRunner not initialised — call init_runner() on startup.")
    return _runner


class WorkflowRunner:
    def __init__(self, graph: object) -> None:
        self._graph = graph

    async def run_graph(self, thread_id: str, inputs: dict) -> None:
        """Execute the graph (background task). Updates WorkflowRun status on failure."""
        config = {"configurable": {"thread_id": thread_id}}
        try:
            await self._graph.ainvoke(inputs, config=config)
            # Normal exit: graph paused at interrupt (awaiting_human already set in node)
            # or completed (approved/rejected). No extra update needed.
        except Exception as exc:
            logger.exception("graph_execution_failed", thread_id=thread_id, error=str(exc))
            await self._mark_failed(thread_id, str(exc))

    async def resume(self, thread_id: str, feedback: HumanFeedback) -> None:
        """Resume a paused graph with human feedback."""
        config = {"configurable": {"thread_id": thread_id}}
        try:
            await self._graph.ainvoke(Command(resume=feedback), config=config)
        except Exception as exc:
            logger.exception("graph_resume_failed", thread_id=thread_id, error=str(exc))
            await self._mark_failed(thread_id, str(exc))

    async def get_state(self, thread_id: str) -> object:
        config = {"configurable": {"thread_id": thread_id}}
        return await self._graph.aget_state(config)

    async def stream_events(self, thread_id: str, inputs: dict):  # type: ignore[return]
        config = {"configurable": {"thread_id": thread_id}}
        async for event in self._graph.astream_events(inputs, config=config, version="v2"):
            yield event

    def get_graph(self) -> object:
        return self._graph

    async def _mark_failed(self, thread_id: str, error: str) -> None:
        async with AsyncSessionLocal() as session:
            await session.execute(
                sa_update(WorkflowRun)
                .where(WorkflowRun.langgraph_thread_id == thread_id)
                .values(
                    status=WorkflowStatus.failed,
                    error=error,
                    finished_at=datetime.now(tz=UTC),
                )
            )
            await session.commit()
