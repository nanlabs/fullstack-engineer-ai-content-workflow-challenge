from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_campaign_and_list():
    res = client.post(
        "/campaigns",
        json={
            "name": "Test Campaign",
            "description": "desc",
            "contents": [
                {"locale": "en-US", "type": "headline", "original_text": "Hello"}
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test Campaign"
    assert len(data["contents"]) == 1
    assert data["contents"][0]["review_state"] == "draft"

    res2 = client.get("/campaigns")
    assert res2.status_code == 200
    assert isinstance(res2.json(), list)

