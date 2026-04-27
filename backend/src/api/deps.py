from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import AsyncSessionLocal

MOCK_REVIEWER = "reviewer@acme.com"


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def get_current_user() -> str:
    # Auth is not implemented — hardcoded mock user (documented decision).
    return MOCK_REVIEWER
