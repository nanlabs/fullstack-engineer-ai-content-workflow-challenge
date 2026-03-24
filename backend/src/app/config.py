from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Content Workflow API"
    database_url: str = "sqlite+aiosqlite:///./app.db"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    cors_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
