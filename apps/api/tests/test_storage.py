import io

from app.api.deps import get_current_user
from app.core.config import settings
from app.schemas.auth import CurrentUser
from main import app


def test_storage_unauthorized(client):
    file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    response = client.post(
        "/api/v1/storage/upload",
        files={"file": ("test.png", io.BytesIO(file_content), "image/png")},
    )
    assert response.status_code == 401


def test_storage_invalid_file_type(client):
    dummy_user = CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email="test@telebooks.com",
        username="tester",
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    try:
        response = client.post(
            "/api/v1/storage/upload?folder=covers",
            files={"file": ("invalid.txt", io.BytesIO(b"Hello world"), "text/plain")},
        )
        assert response.status_code == 400
        error_msg = response.json().get("error", {}).get("message", "")
        assert "Formato de imagem não suportado" in error_msg
    finally:
        app.dependency_overrides.clear()


def test_storage_invalid_folder(client):
    dummy_user = CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email="test@telebooks.com",
        username="tester",
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    try:
        response = client.post(
            "/api/v1/storage/upload?folder=secret_folder",
            files={"file": ("test.png", io.BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png")},
        )
        assert response.status_code == 400
        error_msg = response.json().get("error", {}).get("message", "")
        assert "Pasta de destino inválida" in error_msg
    finally:
        app.dependency_overrides.clear()


def test_storage_upload_and_delete_live_r2(client):
    dummy_user = CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email="test@telebooks.com",
        username="tester",
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    try:
        # 1x1 transparent PNG minimal bytes
        tiny_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02"
            b"\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
        )

        response = client.post(
            "/api/v1/storage/upload?folder=covers",
            files={"file": ("capa_teste.png", io.BytesIO(tiny_png), "image/png")},
        )
        assert response.status_code == 201
        data = response.json()
        assert "url" in data
        assert "key" in data
        assert data["content_type"] == "image/png"
        assert data["key"].startswith("covers/")
        assert settings.R2_PUBLIC_URL in data["url"]

        # Delete the uploaded file from R2
        del_res = client.delete(f"/api/v1/storage/file?key_or_url={data['key']}")
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True
    finally:
        app.dependency_overrides.clear()
