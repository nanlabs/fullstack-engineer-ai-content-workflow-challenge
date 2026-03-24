from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.infrastructure.db.models import Base


async def run_migrations(engine: AsyncEngine) -> None:
    if engine.dialect.name == "sqlite":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        return

    migrations_dir = Path(__file__).resolve().parents[4] / "migrations"

    async with engine.begin() as conn:
        await conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())"
            )
        )
        result = await conn.execute(text("SELECT version FROM schema_migrations"))
        applied = {row[0] for row in result.fetchall()}

        for migration in sorted(migrations_dir.glob("*.sql")):
            if migration.name in applied:
                continue
            statements = [
                statement.strip()
                for statement in migration.read_text(encoding="utf-8").split(";")
                if statement.strip()
            ]
            for statement in statements:
                await conn.execute(text(statement))
            await conn.execute(
                text("INSERT INTO schema_migrations (version) VALUES (:version)"),
                {"version": migration.name},
            )
