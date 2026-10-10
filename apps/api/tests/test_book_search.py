from unittest.mock import AsyncMock, patch

from app.schemas.book_search import ExternalBookItem
from app.services.book_integration_service import BookIntegrationService, book_integration_service
from app.services.book_providers.google_books import GoogleBooksProvider
from app.services.book_providers.open_library import OpenLibraryProvider


def test_normalize_isbn():
    assert BookIntegrationService.normalize_isbn("978-85-359-1484-9") == "9788535914849"
    assert BookIntegrationService.normalize_isbn(" 0-306-40615-2 ") == "0306406152"
    assert BookIntegrationService.normalize_isbn("0-19-853453-1") == "0198534531"
    assert BookIntegrationService.normalize_isbn("978 85 359 1484 9") == "9788535914849"
    assert BookIntegrationService.normalize_isbn(None) is None
    assert BookIntegrationService.normalize_isbn("") is None


def test_provider_registry():
    service = BookIntegrationService()
    google = service.get_provider("google_books")
    assert isinstance(google, GoogleBooksProvider)
    assert google.name == "google_books"

    ol = service.get_provider("open_library")
    assert isinstance(ol, OpenLibraryProvider)
    assert ol.name == "open_library"

    # Default fallback
    default_p = service.get_provider("unknown_provider")
    assert isinstance(default_p, GoogleBooksProvider)


def test_google_books_query_builder():
    provider = GoogleBooksProvider()
    assert provider._build_query_string(isbn="978-85-359-1484-9") == "isbn:9788535914849"
    assert (
        provider._build_query_string(title="Dom Casmurro", author="Machado de Assis")
        == "intitle:Dom Casmurro inauthor:Machado de Assis"
    )
    # Detecta ISBN automaticamente em query genérica
    assert provider._build_query_string(query="9788535914849") == "isbn:9788535914849"
    assert provider._build_query_string(query="Clarice Lispector") == "Clarice Lispector"


def test_google_books_parse_volume():
    provider = GoogleBooksProvider()
    raw = {
        "id": "abc123",
        "volumeInfo": {
            "title": "Ensaio sobre a Cegueira",
            "subtitle": "Romance",
            "authors": ["José Saramago"],
            "publisher": "Companhia das Letras",
            "publishedDate": "1995",
            "description": "Uma terrível epidemia de cegueira branca...",
            "industryIdentifiers": [
                {"type": "ISBN_10", "identifier": "8571644773"},
                {"type": "ISBN_13", "identifier": "9788571644779"},
            ],
            "pageCount": 312,
            "language": "pt",
            "imageLinks": {
                "thumbnail": "http://books.google.com/books/content?id=abc123&edge=curl",
            },
        },
    }
    item = provider._parse_volume(raw)
    assert item is not None
    assert item.title == "Ensaio sobre a Cegueira"
    assert item.isbn13 == "9788571644779"
    assert item.isbn10 == "8571644773"
    assert item.page_count == 312
    assert item.cover_url == "https://books.google.com/books/content?id=abc123"


def test_open_library_parse_doc():
    provider = OpenLibraryProvider()
    doc = {
        "key": "/works/OL12345W",
        "title": "Grande Sertão: Veredas",
        "author_name": ["João Guimarães Rosa"],
        "publisher": ["José Olympio"],
        "isbn": ["9788503009591", "8503009595"],
        "first_publish_year": 1956,
        "number_of_pages_median": 600,
        "cover_i": 8234567,
    }
    item = provider._parse_doc(doc)
    assert item is not None
    assert item.title == "Grande Sertão: Veredas"
    assert item.authors == ["João Guimarães Rosa"]
    assert item.isbn13 == "9788503009591"
    assert item.cover_url == "https://covers.openlibrary.org/b/id/8234567-L.jpg"


def test_search_external_endpoint_mocked(client):
    fake_item = ExternalBookItem(
        provider="google_books",
        external_id="ext-1",
        title="O Hobbit",
        authors=["J.R.R. Tolkien"],
        publisher="HarperCollins",
        isbn13="9788595084742",
        page_count=336,
    )

    with patch.object(
        book_integration_service,
        "search_external_books",
        new=AsyncMock(return_value=[fake_item]),
    ):
        response = client.get("/api/v1/books/search/external?q=O+Hobbit")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["title"] == "O Hobbit"
        assert data[0]["isbn13"] == "9788595084742"


def test_confirm_import_and_deduplication(client):
    import uuid

    rnd_suffix = str(uuid.uuid4().int)[:9]
    unique_isbn13 = f"978{rnd_suffix}".ljust(13, "0")[:13]
    unique_title = f"Livro de Teste de Deduplicação {uuid.uuid4().hex[:8]}"

    payload = {
        "title": unique_title,
        "authors": ["Autor Único Testador"],
        "publisher": "Editora Inovação",
        "description": "Descrição do livro de teste",
        "isbn13": unique_isbn13,
        "page_count": 250,
        "language": "pt-BR",
        "add_to_shelf": False,
    }

    # 1. Primeira chamada: cria o livro no acervo
    r1 = client.post("/api/v1/books/import/confirm", json=payload)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["reused"] is False
    created_id = d1["book"]["id"]
    assert created_id is not None
    assert d1["book"]["title"] == unique_title
    assert d1["book"]["isbn13"] == unique_isbn13

    # 2. Segunda chamada com o MESMO ISBN (com hífens para testar normalização):
    formatted_hyphens = (
        f"{unique_isbn13[:3]}-{unique_isbn13[3:5]}-{unique_isbn13[5:8]}-{unique_isbn13[8:12]}-{unique_isbn13[12:]}"
    )
    payload_with_hyphens = {
        **payload,
        "isbn13": formatted_hyphens,
    }
    r2 = client.post("/api/v1/books/import/confirm", json=payload_with_hyphens)
    assert r2.status_code == 200
    d2 = r2.json()

    # DEVE REUTILIZAR sem duplicar!
    assert d2["reused"] is True
    assert d2["book"]["id"] == created_id
    assert "reutilizado" in d2["message"].lower()
