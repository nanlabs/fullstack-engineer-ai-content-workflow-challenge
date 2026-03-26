import pytest
from pydantic import ValidationError

from app.config import Settings
from app.infrastructure.ai.factory import build_ai_provider_for_selection


def test_database_url_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_database_url_must_use_postgres_async_driver(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./app.db")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_gemini_is_default_provider_without_env_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/app")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    settings = Settings(_env_file=None)

    assert settings.ai_provider == "gemini"
    assert settings.gemini_api_key == ""


def test_openai_provider_can_be_selected_by_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/app")
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    settings = Settings(_env_file=None)
    provider = build_ai_provider_for_selection(settings, "openai", "openai-key")

    assert settings.ai_provider == "openai"
    assert provider.provider_name == "openai"
