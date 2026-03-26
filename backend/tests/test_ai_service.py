from app.api.schemas import CampaignCreate, ContentPieceCreate, ContentPieceUpdate, GenerateDraftRequest, TranslateRequest
from app.domain.enums import AISuggestionStatus, ReviewState


async def test_generate_draft_updates_state_and_persists_suggestion(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                source_text="New season drop",
            ),
        )
        response = await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="homepage hero"),
        )

    assert response.suggestion.status == AISuggestionStatus.SUCCESS
    assert response.content_piece.review_state == ReviewState.AI_SUGGESTED
    assert response.content_piece.latest_suggestion is not None
    assert response.content_piece.latest_suggestion.output_text == "Draft for content: New season drop"


async def test_invalid_metadata_is_saved_as_failed(session_factory, workflow_service, fake_ai_provider) -> None:
    fake_ai_provider.fail_metadata = True
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                source_text="Soft cotton jacket",
            ),
        )
        response = await workflow_service.extract_metadata(session, piece.id)

    assert response.suggestion.status == AISuggestionStatus.FAILED
    assert response.content_piece.review_state == ReviewState.DRAFT
    assert response.content_piece.latest_metadata is None


async def test_metadata_does_not_replace_latest_reviewable_suggestion(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                source_text="Spring campaign body copy",
            ),
        )
        draft_response = await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="landing page"),
        )
        metadata_response = await workflow_service.extract_metadata(session, piece.id)

    assert metadata_response.content_piece.latest_suggestion is not None
    assert metadata_response.content_piece.latest_suggestion.operation_type.value == "extract_metadata"
    assert metadata_response.content_piece.latest_reviewable_suggestion is not None
    assert metadata_response.content_piece.latest_reviewable_suggestion.id == draft_response.suggestion.id


async def test_translation_versions_only_include_translate_suggestions(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                source_text="Hola equipo",
            ),
        )
        await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="homepage"),
        )
        translated = await workflow_service.translate(
            session,
            piece.id,
            TranslateRequest(source_language="es", target_language="en", context="homepage"),
        )
        metadata_response = await workflow_service.extract_metadata(session, piece.id)

    assert len(metadata_response.content_piece.translation_versions) == 1
    assert metadata_response.content_piece.translation_versions[0].id == translated.suggestion.id


async def test_ai_call_history_is_chronological_and_uses_canonical_input(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="Base launch line"),
        )
        await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="homepage"),
        )
        await workflow_service.update_content_piece(
            session,
            piece.id,
            ContentPieceUpdate(current_text="Updated canonical launch line"),
        )
        await workflow_service.translate(
            session,
            piece.id,
            TranslateRequest(source_language="en", target_language="es", context="regional"),
        )
        metadata_response = await workflow_service.extract_metadata(session, piece.id)

    history = metadata_response.content_piece.ai_call_history

    assert [item.operation_type.value for item in history] == [
        "generate_draft",
        "translate",
        "extract_metadata",
    ]
    assert history[-1].input_text == "Updated canonical launch line"
    assert history[-1].structured_output_json is not None
    assert history[1].source_language == "en"
    assert history[1].target_language == "es"
