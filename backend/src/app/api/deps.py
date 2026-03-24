from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services import WorkflowService


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory = request.app.state.session_factory
    async with session_factory() as session:
        yield session


def get_workflow_service(request: Request) -> WorkflowService:
    return request.app.state.workflow_service


SessionDep = Depends(get_session)
ServiceDep = Depends(get_workflow_service)
