import uuid

from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.security import CurrentUser
from main import app


def test_get_rabiscos_feed_unauthenticated(client: TestClient):
    response = client.get("/api/v1/rabiscos/feed")
    assert response.status_code == 401


def test_create_rabisco_unauthenticated(client: TestClient):
    response = client.post("/api/v1/rabiscos", json={"content": "Meu rabisco de teste"})
    assert response.status_code == 401


def test_view_rabisco_unauthenticated(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.post(f"/api/v1/rabiscos/{fake_id}/view")
    assert response.status_code == 401


def test_delete_rabisco_unauthenticated(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/api/v1/rabiscos/{fake_id}")
    assert response.status_code == 401


def test_rabiscos_endpoints_mocked(client: TestClient):
    test_user_id = str(uuid.uuid4())
    mock_user = CurrentUser(
        id=test_user_id,
        email="rabisco_tester@telebooks.com",
        username="tester_rabisco",
        role="user",
    )

    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        # Feed endpoint returns 200 with list of groups
        resp = client.get("/api/v1/rabiscos/feed")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

        # Content validation: empty content fails (422)
        resp = client.post("/api/v1/rabiscos", json={"content": ""})
        assert resp.status_code == 422

        # Content validation: > 300 chars fails (422)
        resp = client.post("/api/v1/rabiscos", json={"content": "a" * 301})
        assert resp.status_code == 422

        # Viewing non-existent rabisco returns 404
        fake_id = str(uuid.uuid4())
        resp = client.post(f"/api/v1/rabiscos/{fake_id}/view")
        assert resp.status_code == 404

        # Deleting non-existent rabisco returns 404
        resp = client.delete(f"/api/v1/rabiscos/{fake_id}")
        assert resp.status_code == 404

    finally:
        app.dependency_overrides.pop(get_current_user, None)
