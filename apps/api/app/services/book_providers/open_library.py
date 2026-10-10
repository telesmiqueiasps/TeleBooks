import logging
import re
from typing import Any

import httpx

from app.schemas.book_search import ExternalBookItem
from app.services.book_providers.base import BaseBookProvider

logger = logging.getLogger(__name__)


class OpenLibraryProvider(BaseBookProvider):
    """
    Adaptador de integração com a Open Library API (Internet Archive).
    Documentação: https://openlibrary.org/dev/docs/api/search
    """

    SEARCH_URL = "https://openlibrary.org/search.json"

    @property
    def name(self) -> str:
        return "open_library"

    def _normalize_isbn(self, isbn_raw: str | None) -> str | None:
        if not isbn_raw:
            return None
        clean = re.sub(r"[^0-9X]", "", isbn_raw.strip().upper())
        return clean if clean else None

    def _parse_doc(self, doc: dict[str, Any]) -> ExternalBookItem | None:
        title = doc.get("title")
        if not title:
            return None

        key = doc.get("key", "").replace("/works/", "")

        # Autores
        authors = doc.get("author_name", [])
        if not isinstance(authors, list):
            authors = [str(authors)]

        # Editora
        publishers = doc.get("publisher", [])
        publisher_name = publishers[0] if publishers and isinstance(publishers, list) else None

        # ISBNs
        isbn_list = doc.get("isbn", [])
        isbn10 = None
        isbn13 = None
        if isinstance(isbn_list, list):
            for candidate in isbn_list:
                cleaned = self._normalize_isbn(candidate)
                if cleaned:
                    if len(cleaned) == 13 and not isbn13:
                        isbn13 = cleaned
                    elif len(cleaned) == 10 and not isbn10:
                        isbn10 = cleaned

        # Capa
        cover_id = doc.get("cover_i")
        cover_url = None
        thumbnail_url = None
        if cover_id:
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
            thumbnail_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
        elif isbn13 or isbn10:
            target_isbn = isbn13 or isbn10
            cover_url = f"https://covers.openlibrary.org/b/isbn/{target_isbn}-L.jpg"
            thumbnail_url = f"https://covers.openlibrary.org/b/isbn/{target_isbn}-M.jpg"

        # Páginas
        page_count = doc.get("number_of_pages_median") or doc.get("number_of_pages")
        if page_count is not None and (not isinstance(page_count, int) or page_count <= 0):
            page_count = None

        # Data de publicação
        first_publish_year = doc.get("first_publish_year")
        published_date_str = str(first_publish_year) if first_publish_year else None
        if not published_date_str:
            publish_dates = doc.get("publish_date", [])
            if publish_dates and isinstance(publish_dates, list):
                published_date_str = str(publish_dates[0])

        # Idioma
        languages = doc.get("language", [])
        lang_code = languages[0] if languages and isinstance(languages, list) else "pt-BR"

        # Categorias / Assuntos
        subjects = doc.get("subject", [])
        categories = subjects[:5] if isinstance(subjects, list) else []

        return ExternalBookItem(
            provider=self.name,
            external_id=key or title,
            title=title,
            subtitle=doc.get("subtitle"),
            authors=authors,
            publisher=publisher_name,
            published_date=published_date_str,
            description=None,  # OpenLibrary search.json não inclui sinopse completa
            isbn10=isbn10,
            isbn13=isbn13,
            page_count=page_count,
            language=lang_code,
            categories=categories,
            cover_url=cover_url,
            thumbnail_url=thumbnail_url,
        )

    async def search(
        self,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        isbn: str | None = None,
        limit: int = 12,
    ) -> list[ExternalBookItem]:
        params: dict[str, Any] = {
            "limit": min(max(limit, 1), 30),
            "fields": "key,title,subtitle,author_name,publisher,first_publish_year,publish_date,isbn,number_of_pages_median,cover_i,language,subject",
        }

        if isbn:
            clean_isbn = self._normalize_isbn(isbn)
            if clean_isbn:
                params["isbn"] = clean_isbn
        if title:
            params["title"] = title.strip()
        if author:
            params["author"] = author.strip()
        if query and not (isbn or title or author):
            clean_q = self._normalize_isbn(query)
            if clean_q and len(clean_q) in (10, 13):
                params["isbn"] = clean_q
            else:
                params["q"] = query.strip()
        elif query:
            params["q"] = query.strip()

        if len(params) <= 2:  # apenas limit e fields
            return []

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(self.SEARCH_URL, params=params)
                if response.status_code != 200:
                    logger.warning("Open Library retornou status %s", response.status_code)
                    return []

                data = response.json()
                docs = data.get("docs", [])
                results: list[ExternalBookItem] = []

                for doc in docs:
                    parsed = self._parse_doc(doc)
                    if parsed:
                        results.append(parsed)

                return results
        except Exception as exc:
            logger.error("Erro ao consultar Open Library API: %s", exc)
            return []

    async def get_by_isbn(self, isbn: str) -> ExternalBookItem | None:
        clean_isbn = self._normalize_isbn(isbn)
        if not clean_isbn:
            return None

        results = await self.search(isbn=clean_isbn, limit=3)
        return results[0] if results else None
