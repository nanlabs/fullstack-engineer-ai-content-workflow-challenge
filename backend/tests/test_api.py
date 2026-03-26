from sqlalchemy import select

from app.infrastructure.db.models import AIProviderSettings
from app.infrastructure.ai.base import GeneratedPayload


async def test_campaign_ai_review_flow(api_client) -> None:
    campaign_response = await api_client.post(
        "/campaigns",
        json={"name": "Spring Launch", "description": "Global launch content"},
    )
    assert campaign_response.status_code == 201
    campaign = campaign_response.json()

    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={
            "source_text": "Spring arrivals are here",
        },
    )
    assert piece_response.status_code == 201
    piece = piece_response.json()
    assert piece["review_state"] == "draft"
    assert piece["source_language"] is None

    draft_response = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/generate-draft",
        json={"context": "homepage hero"},
    )
    assert draft_response.status_code == 200
    draft_payload = draft_response.json()
    assert draft_payload["suggestion"]["status"] == "success"
    assert draft_payload["content_piece"]["review_state"] == "draft"
    assert draft_payload["content_piece"]["draft_history"][0]["decision_status"] == "pending"

    review_response = await api_client.post(
        f"/content-pieces/{piece['id']}/review",
        json={
            "action": "accept",
            "ai_suggestion_id": draft_payload["suggestion"]["id"],
            "comment": "Ship it",
        },
    )
    assert review_response.status_code == 200
    review_payload = review_response.json()
    assert review_payload["content_piece"]["review_state"] == "draft"
    assert review_payload["content_piece"]["current_text"] == draft_payload["suggestion"]["output_text"]
    assert review_payload["content_piece"]["draft_history"][0]["decision_status"] == "accepted"

    manual_status_response = await api_client.patch(
        f"/content-pieces/{piece['id']}",
        json={"review_state": "approved"},
    )
    assert manual_status_response.status_code == 200

    campaign_detail = await api_client.get(f"/campaigns/{campaign['id']}")
    assert campaign_detail.status_code == 200
    detail_payload = campaign_detail.json()
    assert len(detail_payload["content_pieces"]) == 1
    assert detail_payload["workflow_counts"]["approved"] == 1
    assert detail_payload["content_pieces"][0]["latest_review_action"]["action"] == "accept"


async def test_campaign_summary_includes_workflow_counts(api_client) -> None:
    campaign_response = await api_client.post("/campaigns", json={"name": "Counts"})
    campaign = campaign_response.json()

    draft_piece = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={"source_text": "Draft only"},
    )
    assert draft_piece.status_code == 201

    review_piece = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={"source_text": "Review me"},
    )
    review_payload = review_piece.json()

    set_in_review = await api_client.patch(
        f"/content-pieces/{review_payload['id']}",
        json={"review_state": "in_review"},
    )
    assert set_in_review.status_code == 200

    campaigns_response = await api_client.get("/campaigns")
    assert campaigns_response.status_code == 200
    counts = campaigns_response.json()[0]["workflow_counts"]
    assert counts == {
        "draft": 1,
        "ai_suggested": 0,
        "in_review": 1,
        "approved": 0,
        "rejected": 0,
    }


async def test_sse_event_bus_receives_ai_event(api_client, workflow_service) -> None:
    campaign_response = await api_client.post("/campaigns", json={"name": "Realtime"})
    campaign = campaign_response.json()
    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={
            "source_text": "Realtime story",
        },
    )
    piece = piece_response.json()

    queue = workflow_service.event_bus.subscribe()
    trigger_response = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/generate-draft",
        json={"context": "live panel"},
    )
    assert trigger_response.status_code == 200

    event = await queue.get()
    workflow_service.event_bus.unsubscribe(queue)

    assert event["type"] == "ai_suggestion.created"
    assert event["content_piece_id"] == piece["id"]


async def test_translation_requires_languages_at_action_time(api_client) -> None:
    campaign_response = await api_client.post("/campaigns", json={"name": "Translate later"})
    campaign = campaign_response.json()
    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={"source_text": "Hola mundo"},
    )
    piece = piece_response.json()

    missing_languages = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/translate",
        json={"context": "landing page"},
    )
    assert missing_languages.status_code == 422

    translated = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/translate",
        json={
            "source_language": "es",
            "target_language": "en",
            "context": "homepage hero",
        },
    )
    assert translated.status_code == 200
    payload = translated.json()
    assert payload["content_piece"]["source_language"] == "es"
    assert payload["content_piece"]["target_language"] == "en"
    assert payload["suggestion"]["source_language"] == "es"
    assert payload["suggestion"]["target_language"] == "en"
    assert len(payload["content_piece"]["translation_versions"]) == 1
    assert payload["content_piece"]["translation_versions"][0]["source_language"] == "es"
    assert payload["content_piece"]["translation_versions"][0]["target_language"] == "en"
    assert len(payload["content_piece"]["ai_call_history"]) == 1
    assert payload["content_piece"]["ai_call_history"][0]["operation_type"] == "translate"
    assert payload["content_piece"]["current_text"] == "Hola mundo"
    assert payload["content_piece"]["review_state"] == "draft"


async def test_translation_response_is_plain_text_and_not_reviewable(api_client, fake_ai_provider) -> None:
    async def wrapped_translation(*, source_text: str, source_language: str, target_language: str, context: str | None):
        return GeneratedPayload(output_text='{"translation":"## Hola\\n- punto uno\\n- punto dos"}')

    fake_ai_provider.translate = wrapped_translation

    campaign_response = await api_client.post("/campaigns", json={"name": "Translate formatting"})
    campaign = campaign_response.json()
    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={"source_text": "## Hello\n- point one\n- point two"},
    )
    piece = piece_response.json()

    translated = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/translate",
        json={
            "source_language": "en",
            "target_language": "es",
            "context": "homepage hero",
        },
    )

    assert translated.status_code == 200
    payload = translated.json()
    assert payload["suggestion"]["output_text"] == "## Hola\n- punto uno\n- punto dos"
    assert payload["content_piece"]["translation_versions"][0]["output_text"] == "## Hola\n- punto uno\n- punto dos"
    assert payload["content_piece"]["latest_reviewable_suggestion"] is None


async def test_generate_draft_uses_current_canonical_text(api_client) -> None:
    campaign_response = await api_client.post("/campaigns", json={"name": "Canonical draft"})
    campaign = campaign_response.json()
    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={"source_text": "Original base copy"},
    )
    piece = piece_response.json()

    patched = await api_client.patch(
        f"/content-pieces/{piece['id']}",
        json={"current_text": "Refined canonical copy"},
    )
    assert patched.status_code == 200

    draft_response = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/generate-draft",
        json={"context": "hero"},
    )
    assert draft_response.status_code == 200
    payload = draft_response.json()
    assert payload["suggestion"]["input_text"] == "Refined canonical copy"
    assert payload["suggestion"]["output_text"] == "Draft for content: Refined canonical copy"


async def test_provider_settings_endpoints_store_without_exposing_key(api_client) -> None:
    initial = await api_client.get("/settings/ai-provider")
    assert initial.status_code == 200
    assert initial.json()["configured"] is False

    updated = await api_client.put(
        "/settings/ai-provider",
        json={"provider": "gemini", "api_key": "super-secret-key"},
    )
    assert updated.status_code == 200
    payload = updated.json()
    assert payload == {
        "provider": "gemini",
        "configured": True,
        "has_api_key": True,
        "source": "database",
    }

    fetched = await api_client.get("/settings/ai-provider")
    assert fetched.status_code == 200
    assert fetched.json() == payload


async def test_provider_settings_store_only_ciphertext(session_factory, api_client) -> None:
    save_response = await api_client.put(
        "/settings/ai-provider",
        json={"provider": "gemini", "api_key": "super-secret-key"},
    )
    assert save_response.status_code == 200

    async with session_factory() as session:
        stored = (await session.execute(select(AIProviderSettings))).scalar_one()

    assert stored.provider == "gemini"
    assert stored.encrypted_api_key != "super-secret-key"
    assert "super-secret-key" not in stored.encrypted_api_key


async def test_provider_settings_reject_api_key_in_query_string(api_client) -> None:
    response = await api_client.put(
        "/settings/ai-provider?api_key=super-secret-key",
        json={"provider": "gemini"},
    )
    assert response.status_code == 400
    assert "request body" in response.text


async def test_provider_settings_require_new_key_when_switching_provider(api_client) -> None:
    first_save = await api_client.put(
        "/settings/ai-provider",
        json={"provider": "gemini", "api_key": "first-key"},
    )
    assert first_save.status_code == 200

    switch_without_key = await api_client.put(
        "/settings/ai-provider",
        json={"provider": "openai", "api_key": ""},
    )
    assert switch_without_key.status_code == 400
    assert "api_key is required when switching provider." in switch_without_key.text


async def test_reject_works_even_when_content_status_is_approved(api_client) -> None:
    campaign_response = await api_client.post("/campaigns", json={"name": "Approved review"})
    campaign = campaign_response.json()
    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={"source_text": "Base copy"},
    )
    piece = piece_response.json()

    manual_status_response = await api_client.patch(
        f"/content-pieces/{piece['id']}",
        json={"review_state": "approved"},
    )
    assert manual_status_response.status_code == 200

    draft_response = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/generate-draft",
        json={"context": "hero"},
    )
    draft_payload = draft_response.json()

    reject_response = await api_client.post(
        f"/content-pieces/{piece['id']}/review",
        json={
            "action": "reject",
            "ai_suggestion_id": draft_payload["suggestion"]["id"],
        },
    )
    assert reject_response.status_code == 200
    reject_payload = reject_response.json()
    assert reject_payload["content_piece"]["review_state"] == "approved"
    assert reject_payload["content_piece"]["draft_history"][0]["decision_status"] == "rejected"
