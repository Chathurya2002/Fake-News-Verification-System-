from fastapi.testclient import TestClient
from app.main import app

def test_prediction_endpoint() -> None:
    with TestClient(app) as client:
        # Perform a news prediction request on the baseline model
        payload = {
            "input_type": "text",
            "content": "ලංකාවේ වැට් බද්ද සියයට 30 දක්වා වැඩි කිරීමට තීරණය කර ඇත"
        }
        response = client.post("/api/predictions", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert "prediction_id" in data
        assert data["label"] in ["fake", "real"]
        assert "virality_risk" in data
        assert data["virality_risk"]["virality_risk_level"] in ["high", "medium", "low"]
        assert len(data["explanation"]) > 0

def test_social_prediction_endpoint() -> None:
    with TestClient(app) as client:
        # Test social media input type
        payload = {
            "input_type": "social",
            "content": "https://www.facebook.com/posts/fake-news-exposed"
        }
        response = client.post("/api/predictions", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert "prediction_id" in data
        assert data["label"] in ["fake", "real"]
        assert len(data["explanation"]) > 0


def test_trending_and_detail_endpoints() -> None:
    with TestClient(app) as client:
        # Test trending news endpoint
        trending_res = client.get("/api/predictions/trending")
        assert trending_res.status_code == 200
        items = trending_res.json()
        assert isinstance(items, list)
        assert len(items) > 0

        # Test prediction detail for first trending item
        first_id = items[0]["id"]
        detail_res = client.get(f"/api/predictions/{first_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["prediction_id"] == first_id
        assert "input_preview" in detail
        assert "label" in detail


