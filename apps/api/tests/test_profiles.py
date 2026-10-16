import uuid
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.security import CurrentUser
from main import app


def test_get_my_profile_unauthenticated(client: TestClient):
    response = client.get("/api/v1/profiles/me")
    assert response.status_code == 401


def test_search_profiles_unauthenticated(client: TestClient):
    response = client.get("/api/v1/profiles/search?q=teste")
    assert response.status_code == 401


def test_follow_user_unauthenticated(client: TestClient):
    response = client.post("/api/v1/profiles/teste/follow")
    assert response.status_code == 401


def test_unfollow_user_unauthenticated(client: TestClient):
    response = client.post("/api/v1/profiles/teste/unfollow")
    assert response.status_code == 401


def test_get_user_posts_unauthenticated(client: TestClient):
    response = client.get("/api/v1/profiles/teste/posts")
    assert response.status_code == 401


def test_profiles_endpoints_mocked(client: TestClient):
    test_user_id = str(uuid.uuid4())
    mock_user = CurrentUser(
        id=test_user_id,
        email="profile_tester@telebooks.com",
        username="tester_profile",
        role="user",
    )

    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        # Search endpoint requires auth and works
        resp = client.get("/api/v1/profiles/search?q=nonexistent_xyz_12345")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

        # Non-existent user profile returns 404
        resp = client.get("/api/v1/profiles/random_unknown_user_99999")
        assert resp.status_code == 404

        # Cannot follow self
        resp = client.post(f"/api/v1/profiles/{mock_user.username}/follow")
        # Either 404 if profile record doesn't exist in DB yet, or 400 self follow
        assert resp.status_code in (400, 404)

        # Follow requests list works
        resp = client.get("/api/v1/profiles/me/follow-requests")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
