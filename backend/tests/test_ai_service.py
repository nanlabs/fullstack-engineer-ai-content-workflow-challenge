from app.api.schemas import CampaignCreate, ContentPieceCreate, ContentPieceUpdate, GenerateDraftRequest, ReviewRequest, TranslateRequest
from app.domain.enums import AISuggestionStatus, ReviewState
from app.infrastructure.ai.base import GeneratedPayload


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
    assert response.content_piece.review_state == ReviewState.DRAFT
    assert response.content_piece.latest_suggestion is not None
    assert response.content_piece.latest_suggestion.output_text == "Draft for content: New season drop"
    assert len(response.content_piece.draft_history) == 1
    assert response.content_piece.draft_history[0].decision_status.value == "pending"


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
    assert response.content_piece.latest_metadata_attempt is not None
    assert response.content_piece.latest_metadata_attempt.status == AISuggestionStatus.FAILED


async def test_expanded_metadata_payload_is_returned(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                source_text="Soft launch campaign for growth marketers with a focused landing page CTA.",
            ),
        )
        response = await workflow_service.extract_metadata(session, piece.id)

    assert response.suggestion.status == AISuggestionStatus.SUCCESS
    assert response.content_piece.latest_metadata is not None
    assert response.content_piece.latest_metadata.audience == "growth marketers"
    assert response.content_piece.latest_metadata.goal == "drive launch awareness"
    assert response.content_piece.latest_metadata.campaign_theme == "spring launch"
    assert response.content_piece.latest_metadata.channel_fit == "landing page"
    assert response.content_piece.latest_metadata.cta_strength == "medium"


async def test_invalid_cta_strength_is_saved_as_failed(session_factory, workflow_service, fake_ai_provider) -> None:
    async def invalid_metadata(*, source_text: str, content_type: str) -> GeneratedPayload:
        return GeneratedPayload(
            output_text="invalid-json-shape",
            structured_output={
                "keywords": ["launch"],
                "tone": "confident",
                "sentiment": "positive",
                "audience": "growth marketers",
                "goal": "increase signups",
                "campaign_theme": "launch momentum",
                "channel_fit": "landing page",
                "cta_strength": "extreme",
            },
        )

    fake_ai_provider.extract_metadata = invalid_metadata

    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(
                source_text="Urgent landing page copy for launch signups.",
            ),
        )
        response = await workflow_service.extract_metadata(session, piece.id)

    assert response.suggestion.status == AISuggestionStatus.FAILED
    assert response.content_piece.latest_metadata is None
    assert response.content_piece.latest_metadata_attempt is not None
    assert response.content_piece.latest_metadata_attempt.status == AISuggestionStatus.FAILED


async def test_metadata_with_code_fences_is_recovered(session_factory, workflow_service, fake_ai_provider) -> None:
    async def fenced_metadata(*, source_text: str, content_type: str) -> GeneratedPayload:
        return GeneratedPayload(
            output_text="""```json
{
  "keywords": ["launch", "story"],
  "tone": "confident",
  "sentiment": "positive",
  "audience": "editorial leads",
  "goal": "align campaign messaging",
  "campaign_theme": "creator sprint",
  "channel_fit": "homepage",
  "cta_strength": "high"
}
```""",
            structured_output=None,
        )

    fake_ai_provider.extract_metadata = fenced_metadata

    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="Creator sprint launch line"),
        )
        response = await workflow_service.extract_metadata(session, piece.id)

    assert response.suggestion.status == AISuggestionStatus.SUCCESS
    assert response.content_piece.latest_metadata is not None
    assert response.content_piece.latest_metadata.channel_fit == "homepage"


async def test_metadata_with_prose_and_json_object_is_recovered(session_factory, workflow_service, fake_ai_provider) -> None:
    async def prose_metadata(*, source_text: str, content_type: str) -> GeneratedPayload:
        return GeneratedPayload(
            output_text=(
                "Here is the extracted metadata:\n"
                '{"keywords": ["launch"], "tone": "direct", "sentiment": "positive", '
                '"audience": "growth marketers", "goal": "increase signups", '
                '"campaign_theme": "launch momentum", "channel_fit": "landing page", "cta_strength": "medium"}'
            ),
            structured_output=None,
        )

    fake_ai_provider.extract_metadata = prose_metadata

    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Launch"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="Landing page launch CTA"),
        )
        response = await workflow_service.extract_metadata(session, piece.id)

    assert response.suggestion.status == AISuggestionStatus.SUCCESS
    assert response.content_piece.latest_metadata is not None
    assert response.content_piece.latest_metadata.goal == "increase signups"


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


async def test_translation_output_is_normalized_from_json_wrapper(session_factory, workflow_service, fake_ai_provider) -> None:
    async def wrapped_translation(
        *,
        source_text: str,
        source_language: str,
        target_language: str,
        context: str | None,
    ) -> GeneratedPayload:
        return GeneratedPayload(
            output_text='{"translation":"## Titulo\\n- punto uno\\n- punto dos"}',
        )

    fake_ai_provider.translate = wrapped_translation

    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Translate"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="## Title\n- bullet one\n- bullet two"),
        )
        translated = await workflow_service.translate(
            session,
            piece.id,
            TranslateRequest(source_language="en", target_language="es", context="homepage"),
        )

    assert translated.suggestion.output_text == "## Titulo\n- punto uno\n- punto dos"
    assert translated.content_piece.translation_versions[0].output_text == "## Titulo\n- punto uno\n- punto dos"
    assert translated.content_piece.current_text == "## Title\n- bullet one\n- bullet two"


async def test_translate_does_not_replace_latest_reviewable_suggestion(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Translate"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="Launch line"),
        )
        draft_response = await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="hero"),
        )
        translated = await workflow_service.translate(
            session,
            piece.id,
            TranslateRequest(source_language="en", target_language="es", context="regional"),
        )

    assert translated.content_piece.latest_suggestion is not None
    assert translated.content_piece.latest_suggestion.operation_type.value == "translate"
    assert translated.content_piece.latest_reviewable_suggestion is not None
    assert translated.content_piece.latest_reviewable_suggestion.id == draft_response.suggestion.id
    assert translated.content_piece.review_state == ReviewState.DRAFT


async def test_accept_applies_canonical_without_changing_manual_state(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Review"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="Base line"),
        )
        piece = await workflow_service.update_content_piece(
            session,
            piece.id,
            ContentPieceUpdate(review_state=ReviewState.APPROVED),
        )
        draft = await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="hero"),
        )
        reviewed = await workflow_service.review(
            session,
            piece.id,
            ReviewRequest(action="accept", ai_suggestion_id=draft.suggestion.id),
        )

    assert reviewed.content_piece.current_text == draft.suggestion.output_text
    assert reviewed.content_piece.review_state == ReviewState.APPROVED
    assert reviewed.content_piece.draft_history[0].decision_status.value == "accepted"


async def test_reject_keeps_manual_status_and_marks_draft_history(session_factory, workflow_service) -> None:
    async with session_factory() as session:
        campaign = await workflow_service.create_campaign(session, CampaignCreate(name="Review"))
        piece = await workflow_service.create_content_piece(
            session,
            campaign.id,
            ContentPieceCreate(source_text="Base line"),
        )
        piece = await workflow_service.update_content_piece(
            session,
            piece.id,
            ContentPieceUpdate(review_state=ReviewState.APPROVED),
        )
        draft = await workflow_service.generate_draft(
            session,
            piece.id,
            GenerateDraftRequest(context="hero"),
        )
        reviewed = await workflow_service.review(
            session,
            piece.id,
            ReviewRequest(action="reject", ai_suggestion_id=draft.suggestion.id),
        )

    assert reviewed.content_piece.current_text == "Base line"
    assert reviewed.content_piece.review_state == ReviewState.APPROVED
    assert reviewed.content_piece.draft_history[0].decision_status.value == "rejected"


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
