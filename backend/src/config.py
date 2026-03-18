from functools import lru_cache
from pydantic import BaseModel
import os


class Settings(BaseModel):
    app_name: str = "ACME AI Content Workflow"
    environment: str = os.getenv("ENVIRONMENT", "local")

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://acme:acme@db:5432/acme_content",
    )

    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

    ai_provider: str = os.getenv("AI_PROVIDER", "openai")


@lru_cache
def get_settings() -> Settings:
    return Settings()

