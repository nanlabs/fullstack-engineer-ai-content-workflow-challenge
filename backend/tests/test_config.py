import pytest
from pydantic import ValidationError

from app.config import Settings, get_settings
from app.infrastructure.ai.factory import build_ai_provider


def test_database_url_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_database_url_must_use_postgres_async_driver(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./app.db")
    get_settings.cache_clear()

    with pytest.raises(ValidationError):
        get_settings()

    get_settings.cache_clear()


def test_gemini_is_default_provider_and_requires_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/app")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    get_settings.cache_clear()

    with pytest.raises(ValidationError):
        get_settings()

    monkeypatch.setenv("GEMINI_API_KEY", "gemini-key")
    settings = get_settings()
    provider = build_ai_provider(settings)

    assert settings.ai_provider == "gemini"
    assert provider.provider_name == "gemini"
    get_settings.cache_clear()


def test_openai_provider_can_be_selected_by_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/app")
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    get_settings.cache_clear()

    settings = get_settings()
    provider = build_ai_provider(settings)

    assert settings.ai_provider == "openai"
    assert provider.provider_name == "openai"
    get_settings.cache_clear()
