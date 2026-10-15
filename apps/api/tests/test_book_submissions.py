import uuid

from fastapi.testclient import TestClient


def test_create_submission_unauthenticated(client: TestClient):
    response = client.post(
        "/api/v1/book-submissions",
        json={
            "title": "Livro de Teste",
            "author_names": ["Autor Teste"],
        },
    )
    assert response.status_code == 401


def test_list_my_submissions_unauthenticated(client: TestClient):
    response = client.get("/api/v1/book-submissions/my")
    assert response.status_code == 401


def test_list_admin_submissions_unauthenticated(client: TestClient):
    response = client.get("/api/v1/book-submissions")
    assert response.status_code == 401


def test_approve_submission_unauthenticated(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.post(f"/api/v1/book-submissions/{fake_id}/approve")
    assert response.status_code == 401


def test_reject_submission_unauthenticated(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.post(
        f"/api/v1/book-submissions/{fake_id}/reject",
        json={"action": "reject", "rejection_reason": "Inadequado"},
    )
    assert response.status_code == 401


def test_update_submission_unauthenticated(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.patch(
        f"/api/v1/book-submissions/{fake_id}",
        json={"title": "Título Corrigido"},
    )
    assert response.status_code == 401


def test_update_book_unauthenticated_forbidden(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.patch(f"/api/v1/books/{fake_id}", json={"title": "Novo Título"})
    assert response.status_code == 401


def test_delete_book_unauthenticated_forbidden(client: TestClient):
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/api/v1/books/{fake_id}")
    assert response.status_code == 401
