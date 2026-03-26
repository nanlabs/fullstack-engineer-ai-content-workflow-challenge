from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import AIActionResponse, GenerateDraftRequest, MetadataPayload, TranslateRequest
from app.application.content_piece_service import ContentPieceService
from app.application.events import WorkflowEventPublisher
from app.application.provider_settings_service import ProviderSettingsService
from app.application.serializers import WorkflowSerializer
from app.domain.enums import AISuggestionStatus, OperationType
from app.infrastructure.ai.base import AIProvider, GeneratedPayload
from app.infrastructure.ai.metadata_parser import parse_metadata_output
from app.infrastructure.db.models import AISuggestion


class AIWorkflowService:
    def __init__(
        self,
        *,
        provider_settings: ProviderSettingsService,
        content_pieces: ContentPieceService,
        serializer: WorkflowSerializer,
        events: WorkflowEventPublisher,
    ) -> None:
        self.provider_settings = provider_settings
        self.content_pieces = content_pieces
        self.serializer = serializer
        self.events = events

    async def generate_draft(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: GenerateDraftRequest,
    ) -> AIActionResponse:
        piece = await self.content_pieces.load_content_piece(session, content_piece_id)
        ai_provider = await self.provider_settings.resolve_ai_provider(session)
        generated = await self._safe_ai_call(
            operation=OperationType.GENERATE_DRAFT,
            invoke=lambda: ai_provider.generate_draft(
                source_text=piece.current_text,
                content_type=piece.type,
                context=payload.context,
            ),
        )
        suggestion, piece = await self._persist_suggestion(
            session,
            piece,
            generated,
            OperationType.GENERATE_DRAFT,
            ai_provider=ai_provider,
        )
        return AIActionResponse(
            suggestion=self.serializer.serialize_suggestion(suggestion),
            content_piece=self.serializer.serialize_content_piece(piece),
        )

    async def translate(
        self,
        session: AsyncSession,
        content_piece_id: str,
        payload: TranslateRequest,
    ) -> AIActionResponse:
        piece = await self.content_pieces.load_content_piece(session, content_piece_id)
        ai_provider = await self.provider_settings.resolve_ai_provider(session)
        generated = await self._safe_ai_call(
            operation=OperationType.TRANSLATE,
            invoke=lambda: ai_provider.translate(
                source_text=piece.current_text,
                source_language=payload.source_language,
                target_language=payload.target_language,
                context=payload.context,
            ),
        )
        piece.source_language = payload.source_language
        piece.target_language = payload.target_language
        suggestion, piece = await self._persist_suggestion(
            session,
            piece,
            generated,
            OperationType.TRANSLATE,
            ai_provider=ai_provider,
            source_language=payload.source_language,
            target_language=payload.target_language,
        )
        return AIActionResponse(
            suggestion=self.serializer.serialize_suggestion(suggestion),
            content_piece=self.serializer.serialize_content_piece(piece),
        )

    async def extract_metadata(self, session: AsyncSession, content_piece_id: str) -> AIActionResponse:
        piece = await self.content_pieces.load_content_piece(session, content_piece_id)
        ai_provider = await self.provider_settings.resolve_ai_provider(session)
        generated = await self._safe_ai_call(
            operation=OperationType.EXTRACT_METADATA,
            invoke=lambda: ai_provider.extract_metadata(
                source_text=piece.current_text,
                content_type=piece.type,
            ),
        )
        suggestion, piece = await self._persist_suggestion(
            session,
            piece,
            generated,
            OperationType.EXTRACT_METADATA,
            ai_provider=ai_provider,
        )
        return AIActionResponse(
            suggestion=self.serializer.serialize_suggestion(suggestion),
            content_piece=self.serializer.serialize_content_piece(piece),
        )

    async def _safe_ai_call(
        self,
        *,
        operation: OperationType,
        invoke,
    ) -> tuple[GeneratedPayload | None, AISuggestionStatus, str | None, dict | None]:
        try:
            generated: GeneratedPayload = await invoke()
            structured_output = generated.structured_output
            if operation == OperationType.EXTRACT_METADATA:
                if structured_output is None and generated.output_text:
                    structured_output = parse_metadata_output(generated.output_text)
                if structured_output is not None:
                    structured_output = MetadataPayload.model_validate(structured_output).model_dump()
            return generated, AISuggestionStatus.SUCCESS, generated.output_text, structured_output
        except (ValidationError, ValueError) as exc:
            return None, AISuggestionStatus.FAILED, str(exc), None
        except Exception as exc:  # pragma: no cover
            return None, AISuggestionStatus.FAILED, str(exc), None

    async def _persist_suggestion(
        self,
        session: AsyncSession,
        piece,
        generated_result: tuple[GeneratedPayload | None, AISuggestionStatus, str | None, dict | None],
        operation_type: OperationType,
        *,
        ai_provider: AIProvider,
        source_language: str | None = None,
        target_language: str | None = None,
    ):
        _, status, output_text, structured_output = generated_result
        suggestion = AISuggestion(
            id=str(uuid4()),
            content_piece_id=piece.id,
            provider=ai_provider.provider_name,
            model=ai_provider.model_name,
            operation_type=operation_type.value,
            input_text=piece.current_text,
            output_text=output_text,
            source_language=source_language,
            target_language=target_language,
            structured_output_json=structured_output,
            status=status.value,
            created_at=datetime.now(UTC),
        )
        session.add(suggestion)
        await session.commit()
        piece = await self.content_pieces.load_content_piece(session, piece.id)
        fresh_suggestion = await session.get(AISuggestion, suggestion.id)
        await self.events.publish_ai_event(piece, fresh_suggestion)
        return fresh_suggestion, piece
