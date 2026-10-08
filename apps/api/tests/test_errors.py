def test_invalid_route_returns_formatted_404(client):
    response = client.get("/api/v1/rota-inexistente")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "timestamp" in data["error"]


def test_invalid_query_params_returns_formatted_422(client):
    # page deve ser >= 1, passando page=-5
    response = client.get("/api/v1/books?page=-5")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(data["error"]["details"], list)
