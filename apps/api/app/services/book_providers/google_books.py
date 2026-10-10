import logging
import re
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.book_search import ExternalBookItem
from app.services.book_providers.base import BaseBookProvider

logger = logging.getLogger(__name__)


class GoogleBooksProvider(BaseBookProvider):
    """
    Adaptador de integração com a Google Books API.
    Documentação: https://developers.google.com/books/docs/v1/using
    """

    BASE_URL = "https://www.googleapis.com/books/v1/volumes"

    @property
    def name(self) -> str:
        return "google_books"

    def _normalize_isbn(self, isbn_raw: str | None) -> str | None:
        if not isbn_raw:
            return None
        clean = re.sub(r"[^0-9X]", "", isbn_raw.strip().upper())
        return clean if clean else None

    def _clean_image_url(self, url: str | None) -> str | None:
        if not url:
            return None
        # Força protocolo HTTPS seguro
        https_url = url.replace("http://", "https://")
        # Remove curl de borda se presente para capa plana
        https_url = https_url.replace("&edge=curl", "")
        return https_url

    def _parse_volume(self, item: dict[str, Any]) -> ExternalBookItem | None:
        volume_info = item.get("volumeInfo", {})
        title = volume_info.get("title")
        if not title:
            return None

        # Identificadores de ISBN
        isbn10 = None
        isbn13 = None
        identifiers = volume_info.get("industryIdentifiers", [])
        for id_entry in identifiers:
            id_type = id_entry.get("type", "")
            id_val = self._normalize_isbn(id_entry.get("identifier"))
            if id_type == "ISBN_13" and id_val:
                isbn13 = id_val
            elif id_type == "ISBN_10" and id_val:
                isbn10 = id_val
            elif not isbn13 and len(id_val or "") == 13:
                isbn13 = id_val
            elif not isbn10 and len(id_val or "") == 10:
                isbn10 = id_val

        # Imagens
        image_links = volume_info.get("imageLinks", {})
        cover_url = (
            image_links.get("extraLarge")
            or image_links.get("large")
            or image_links.get("medium")
            or image_links.get("small")
            or image_links.get("thumbnail")
        )
        thumbnail_url = image_links.get("smallThumbnail") or image_links.get("thumbnail")

        # Idioma e páginas
        page_count = volume_info.get("pageCount")
        if page_count is not None and (not isinstance(page_count, int) or page_count <= 0):
            page_count = None

        return ExternalBookItem(
            provider=self.name,
            external_id=str(item.get("id", "")),
            title=title,
            subtitle=volume_info.get("subtitle"),
            authors=volume_info.get("authors", []),
            publisher=volume_info.get("publisher"),
            published_date=volume_info.get("publishedDate"),
            description=volume_info.get("description"),
            isbn10=isbn10,
            isbn13=isbn13,
            page_count=page_count,
            language=volume_info.get("language") or "pt-BR",
            categories=volume_info.get("categories", []),
            cover_url=self._clean_image_url(cover_url),
            thumbnail_url=self._clean_image_url(thumbnail_url),
        )

    def _build_query_string(
        self,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        isbn: str | None = None,
    ) -> str:
        parts: list[str] = []

        if isbn:
            clean_isbn = self._normalize_isbn(isbn)
            if clean_isbn and len(clean_isbn) in (10, 13):
                parts.append(f"isbn:{clean_isbn}")
            elif clean_isbn:
                parts.append(clean_isbn)

        if title:
            parts.append(f"intitle:{title.strip()}")

        if author:
            parts.append(f"inauthor:{author.strip()}")

        if query and not (isbn or title or author):
            # Se for um valor numérico parecido com ISBN, busca diretamente por ISBN
            clean_q = self._normalize_isbn(query)
            if clean_q and len(clean_q) in (10, 13):
                parts.append(f"isbn:{clean_q}")
            else:
                parts.append(query.strip())
        elif query and (title or author):
            parts.append(query.strip())

        return " ".join(parts).strip()

    async def search(
        self,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        isbn: str | None = None,
        limit: int = 12,
    ) -> list[ExternalBookItem]:
        q_param = self._build_query_string(query=query, title=title, author=author, isbn=isbn)
        if not q_param:
            return []

        params: dict[str, Any] = {
            "q": q_param,
            "maxResults": min(max(limit, 1), 40),
            "printType": "books",
            "hl": "pt-BR",
            "country": "BR",
        }
        if settings.GOOGLE_BOOKS_API_KEY:
            params["key"] = settings.GOOGLE_BOOKS_API_KEY

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(self.BASE_URL, params=params)
                if response.status_code == 429:
                    logger.warning(
                        "Google Books API atingiu limite temporário de requisições (429). Acionando provedores alternativos."
                    )
                    return []
                if response.status_code != 200:
                    logger.warning(
                        "Google Books API retornou status %s para query '%s'",
                        response.status_code,
                        q_param,
                    )
                    return []

                data = response.json()
                raw_items = data.get("items", [])
                results: list[ExternalBookItem] = []

                for item in raw_items:
                    parsed = self._parse_volume(item)
                    if parsed:
                        results.append(parsed)

                # Prioriza edições em português brasileiro no topo
                def _pt_priority(it: ExternalBookItem) -> int:
                    lang = (it.language or "").lower()
                    if lang in ("pt", "pt-br", "por"):
                        return 0
                    return 1

                results.sort(key=_pt_priority)
                return results
        except Exception as exc:
            logger.error("Erro ao consultar Google Books API: %s", exc)
            return []

    async def get_by_isbn(self, isbn: str) -> ExternalBookItem | None:
        clean_isbn = self._normalize_isbn(isbn)
        if not clean_isbn:
            return None

        results = await self.search(isbn=clean_isbn, limit=5)
        # Prioriza o item que bater exatamente com o ISBN solicitado
        for item in results:
            if item.isbn13 == clean_isbn or item.isbn10 == clean_isbn:
                return item

        return results[0] if results else None
