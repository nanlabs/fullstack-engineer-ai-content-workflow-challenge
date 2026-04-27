from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    app_env: str = "development"
    database_url: str
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    default_llm_provider: str = "anthropic"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"


settings = Settings()
