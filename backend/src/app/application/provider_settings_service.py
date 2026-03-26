from __future__ import annotations

from datetime import UTC, datetime
from typing import Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import ProviderSettingsResponse, UpdateProviderSettingsRequest
from app.application.exceptions import ProviderNotConfiguredError
from app.config import Settings
from app.infrastructure.ai.base import AIProvider
from app.infrastructure.ai.factory import build_ai_provider_for_selection
from app.infrastructure.ai.provider_settings_crypto import decrypt_api_key, encrypt_api_key, fingerprint_api_key
from app.infrastructure.db.models import AIProviderSettings

GLOBAL_PROVIDER_SETTINGS_ID = "global"


class ProviderSettingsService:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        ai_provider: AIProvider | None = None,
        provider_builder: Callable[[str, str], AIProvider] | None = None,
    ) -> None:
        self.settings = settings
        self.ai_provider = ai_provider
        self.provider_builder = provider_builder

    async def get_provider_settings(self, session: AsyncSession) -> ProviderSettingsResponse:
        stored_settings = await session.get(AIProviderSettings, GLOBAL_PROVIDER_SETTINGS_ID)
        if stored_settings is not None:
            return ProviderSettingsResponse(
                provider=stored_settings.provider,
                configured=True,
                has_api_key=True,
                source="database",
            )

        provider, api_key = self._get_environment_provider_config()
        if provider and api_key:
            return ProviderSettingsResponse(
                provider=provider,
                configured=True,
                has_api_key=True,
                source="environment",
            )

        return ProviderSettingsResponse(
            provider=None,
            configured=False,
            has_api_key=False,
            source="missing",
        )

    async def update_provider_settings(
        self,
        session: AsyncSession,
        payload: UpdateProviderSettingsRequest,
    ) -> ProviderSettingsResponse:
        if self.settings is None:
            raise ValueError("Settings-backed provider configuration is unavailable.")

        stored_settings = await session.get(AIProviderSettings, GLOBAL_PROVIDER_SETTINGS_ID)
        api_key = (payload.api_key or "").strip()
        provider_changed = stored_settings is not None and stored_settings.provider != payload.provider

        if stored_settings is None and not api_key:
            raise ValueError("api_key is required when no database provider settings exist.")
        if provider_changed and not api_key:
            raise ValueError("api_key is required when switching provider.")

        now = datetime.now(UTC)
        if stored_settings is None:
            stored_settings = AIProviderSettings(
                id=GLOBAL_PROVIDER_SETTINGS_ID,
                provider=payload.provider,
                encrypted_api_key=encrypt_api_key(api_key, self.settings.ai_settings_encryption_key),
                api_key_fingerprint=fingerprint_api_key(api_key),
                created_at=now,
                updated_at=now,
            )
            session.add(stored_settings)
        else:
            stored_settings.provider = payload.provider
            if api_key:
                stored_settings.encrypted_api_key = encrypt_api_key(api_key, self.settings.ai_settings_encryption_key)
                stored_settings.api_key_fingerprint = fingerprint_api_key(api_key)
            stored_settings.updated_at = now

        await session.commit()
        return ProviderSettingsResponse(
            provider=stored_settings.provider,
            configured=True,
            has_api_key=True,
            source="database",
        )

    async def resolve_ai_provider(self, session: AsyncSession) -> AIProvider:
        if self.ai_provider is not None:
            return self.ai_provider
        if self.settings is None:
            raise ProviderNotConfiguredError("AI provider is not configured.")

        stored_settings = await session.get(AIProviderSettings, GLOBAL_PROVIDER_SETTINGS_ID)
        if stored_settings is not None:
            api_key = decrypt_api_key(
                stored_settings.encrypted_api_key,
                self.settings.ai_settings_encryption_key,
            )
            return self._build_provider(stored_settings.provider, api_key)

        provider, api_key = self._get_environment_provider_config()
        if provider and api_key:
            return self._build_provider(provider, api_key)

        raise ProviderNotConfiguredError("AI provider is not configured.")

    def _get_environment_provider_config(self) -> tuple[str | None, str | None]:
        if self.settings is None:
            return None, None
        if self.settings.ai_provider == "openai" and self.settings.openai_api_key:
            return "openai", self.settings.openai_api_key
        if self.settings.ai_provider == "gemini" and self.settings.gemini_api_key:
            return "gemini", self.settings.gemini_api_key
        return None, None

    def _build_provider(self, provider_name: str, api_key: str) -> AIProvider:
        if self.provider_builder is not None:
            return self.provider_builder(provider_name, api_key)
        if self.settings is None:
            raise ProviderNotConfiguredError("AI provider is not configured.")
        return build_ai_provider_for_selection(self.settings, provider_name, api_key)
