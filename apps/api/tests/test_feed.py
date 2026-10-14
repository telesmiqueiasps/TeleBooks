import uuid

from fastapi.testclient import TestClient


def test_list_feed_public(client: TestClient):
    response = client.get("/api/v1/feed")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert isinstance(data["total"], int)


def test_get_feed_post_not_found(client: TestClient):
    fake_uuid = str(uuid.uuid4())
    response = client.get(f"/api/v1/feed/{fake_uuid}")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data or "error" in data


def test_create_feed_post_unauthenticated(client: TestClient):
    response = client.post("/api/v1/feed", json={"content": "Frase de teste sem autenticação"})
    # Must be 401 Unauthorized
    assert response.status_code == 401


def test_toggle_like_unauthenticated(client: TestClient):
    fake_uuid = str(uuid.uuid4())
    response = client.post(f"/api/v1/feed/{fake_uuid}/like")
    # Must be 401 Unauthorized
    assert response.status_code == 401


def test_create_comment_unauthenticated(client: TestClient):
    fake_uuid = str(uuid.uuid4())
    response = client.post(f"/api/v1/feed/{fake_uuid}/comments", json={"content": "Comentário"})
    # Must be 401 Unauthorized
    assert response.status_code == 401
