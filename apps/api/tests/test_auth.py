import time

from jose import jwt


def test_protected_routes_without_token(client):
    # Rota /me sem token deve retornar 401
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"

    # Rota /shelf sem token deve retornar 401
    response_shelf = client.get("/api/v1/shelf")
    assert response_shelf.status_code == 401
    data_shelf = response_shelf.json()
    assert data_shelf["error"]["code"] == "UNAUTHORIZED"


def test_protected_route_with_expired_token(client):
    expired_payload = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "email": "test@telebooks.com",
        "exp": int(time.time()) - 3600,
    }
    expired_token = jwt.encode(expired_payload, "dummy_secret", algorithm="HS256")

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_check_username_available(client):
    response = client.get("/api/v1/auth/check-username?username=usuario_inedito_xyz123")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert data["username"] == "usuario_inedito_xyz123"


def test_check_username_too_short(client):
    response = client.get("/api/v1/auth/check-username?username=ab")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert "Mínimo" in data["reason"]
