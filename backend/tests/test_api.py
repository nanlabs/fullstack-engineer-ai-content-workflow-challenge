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
            "type": "headline",
            "source_text": "Spring arrivals are here",
            "source_language": "en",
            "target_language": "es",
        },
    )
    assert piece_response.status_code == 201
    piece = piece_response.json()
    assert piece["review_state"] == "draft"

    draft_response = await api_client.post(
        f"/content-pieces/{piece['id']}/ai/generate-draft",
        json={"context": "homepage hero"},
    )
    assert draft_response.status_code == 200
    draft_payload = draft_response.json()
    assert draft_payload["suggestion"]["status"] == "success"
    assert draft_payload["content_piece"]["review_state"] == "ai_suggested"

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
    assert review_payload["content_piece"]["review_state"] == "approved"
    assert review_payload["content_piece"]["current_text"] == draft_payload["suggestion"]["output_text"]

    campaign_detail = await api_client.get(f"/campaigns/{campaign['id']}")
    assert campaign_detail.status_code == 200
    detail_payload = campaign_detail.json()
    assert len(detail_payload["content_pieces"]) == 1
    assert detail_payload["content_pieces"][0]["latest_review_action"]["action"] == "accept"


async def test_sse_event_bus_receives_ai_event(api_client, workflow_service) -> None:
    campaign_response = await api_client.post("/campaigns", json={"name": "Realtime"})
    campaign = campaign_response.json()
    piece_response = await api_client.post(
        f"/campaigns/{campaign['id']}/content-pieces",
        json={
            "type": "headline",
            "source_text": "Realtime story",
            "source_language": "en",
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
