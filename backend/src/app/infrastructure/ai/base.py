from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class GeneratedPayload:
    output_text: str | None
    structured_output: dict | None = None


class AIProvider(Protocol):
    provider_name: str
    model_name: str

    async def generate_draft(self, *, source_text: str, content_type: str, context: str | None) -> GeneratedPayload: ...

    async def translate(
        self,
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        context: str | None,
    ) -> GeneratedPayload: ...

    async def extract_metadata(self, *, source_text: str, content_type: str) -> GeneratedPayload: ...
