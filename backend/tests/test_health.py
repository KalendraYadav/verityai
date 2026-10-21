from fastapi.testclient import TestClient


def test_health_endpoint_healthy(client: TestClient):
    """Verify that GET /api/v1/health returns healthy status and active database connectivity."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "VerityAI"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data
    assert data["database"]["status"] == "connected"
    assert data["database"]["engine"] in ["sqlite", "postgresql"]


def test_root_endpoint(client: TestClient):
    """Verify that the service root returns metadata and health route link."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()

    assert data["service"] == "VerityAI"
    assert data["health"] == "/api/v1/health"
    assert data["docs"] == "/docs"
