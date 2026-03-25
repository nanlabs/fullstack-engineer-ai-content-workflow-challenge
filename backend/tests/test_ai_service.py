from app.api.schemas import CampaignCreate, ContentPieceCreate, GenerateDraftRequest
from app.domain.enums import AISuggestionStatus, ReviewState


async def test_generate_draft_updates_state_and_persists_suggestion(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                type="headline",
                source_text="New season drop",
                source_language="en",
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
    assert response.content_piece.latest_suggestion.output_text == "Draft for headline: New season drop"


async def test_invalid_metadata_is_saved_as_failed(session_factory, workflow_service, fake_ai_provider) -> None:
    fake_ai_provider.fail_metadata = True
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                type="description",
                source_text="Soft cotton jacket",
                source_language="en",
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
                type="description",
                source_text="Spring campaign body copy",
                source_language="en",
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
