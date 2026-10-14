from fastapi.testclient import TestClient


def test_list_notifications_unauthenticated(client: TestClient):
    response = client.get("/api/v1/notifications")
    assert response.status_code == 401


def test_get_unread_count_unauthenticated(client: TestClient):
    response = client.get("/api/v1/notifications/unread-count")
    assert response.status_code == 401


def test_mark_notifications_read_unauthenticated(client: TestClient):
    response = client.post("/api/v1/notifications/mark-read", json={"mark_all": True})
    assert response.status_code == 401
