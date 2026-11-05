"""Integration tests for health endpoint and centralized error shapes."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "PennyPilot"


def test_api_v1_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "ai_tier_availability" in data
    assert data["ai_tier_availability"]["tier_3_deterministic_fallback"] is True


def test_404_error_shape():
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert "code" in data
    assert data["code"] == "NOT_FOUND"
    assert "message" in data


def test_validation_error_shape():
    # Sending invalid payload to registration (missing password & display_name)
    response = client.post("/api/v1/auth/register", json={"email": "invalid-email"})
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "field_errors" in data
    assert len(data["field_errors"]) > 0
