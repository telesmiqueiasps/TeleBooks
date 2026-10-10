import logging
import re
from typing import Any

import httpx

from app.schemas.book_search import ExternalBookItem
from app.services.book_cover_service import BookCoverService
from app.services.book_providers.base import BaseBookProvider

logger = logging.getLogger(__name__)


class BrasilApiProvider(BaseBookProvider):
    """
    Adaptador de integração com a BrasilAPI (base da Câmara Brasileira do Livro - CBL
    e Mercado Editorial Brasileiro).
    Documentação: https://brasilapi.com.br/docs#tag/ISBN
    Totalmente gratuito, em português e sem necessidade de chave de API.
    """

    BASE_URL = "https://brasilapi.com.br/api/isbn/v1"

    @property
    def name(self) -> str:
        return "brasil_api"

    def _normalize_isbn(self, isbn_raw: str | None) -> str | None:
        if not isbn_raw:
            return None
        clean = re.sub(r"[^0-9X]", "", isbn_raw.strip().upper())
        return clean if clean else None

    async def get_by_isbn(self, isbn: str) -> ExternalBookItem | None:
        clean_isbn = self._normalize_isbn(isbn)
        if not clean_isbn or len(clean_isbn) not in (10, 13):
            return None

        url = f"{self.BASE_URL}/{clean_isbn}"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url)
                if response.status_code in (400, 404):
                    logger.info("BrasilAPI: ISBN %s não localizado na base CBL (status %s)", clean_isbn, response.status_code)
                    return None
                if response.status_code != 200:
                    logger.warning("BrasilAPI retornou status %s para ISBN %s", response.status_code, clean_isbn)
                    return None

                data: dict[str, Any] = response.json()
                title = data.get("title")
                if not title:
                    return None

                # Autores
                authors = data.get("authors", [])
                if not isinstance(authors, list):
                    authors = [str(authors)] if authors else []

                # Identificadores
                isbn10 = None
                isbn13 = None
                if len(clean_isbn) == 13:
                    isbn13 = clean_isbn
                elif len(clean_isbn) == 10:
                    isbn10 = clean_isbn

                # Páginas
                page_count = data.get("page_count")
                if page_count is not None and (not isinstance(page_count, int) or page_count <= 0):
                    page_count = None

                # Data de publicação
                year = data.get("year")
                published_date_str = str(year) if year else None

                # Capa da BrasilAPI ou resolução multi-fonte (Google Books + Open Library)
                cover_url = data.get("cover_url")
                thumbnail_url = cover_url
                if not cover_url:
                    cover_url, thumbnail_url = await BookCoverService.resolve_best_cover(
                        isbn13=isbn13, isbn10=isbn10
                    )

                categories = data.get("subjects", [])
                if not isinstance(categories, list):
                    categories = [str(categories)] if categories else []

                return ExternalBookItem(
                    provider=self.name,
                    external_id=f"cbl-{clean_isbn}",
                    title=title,
                    subtitle=data.get("subtitle"),
                    authors=authors,
                    publisher=data.get("publisher"),
                    published_date=published_date_str,
                    description=data.get("synopsis"),
                    isbn10=isbn10,
                    isbn13=isbn13,
                    page_count=page_count,
                    language="pt-BR",
                    categories=categories,
                    cover_url=cover_url,
                    thumbnail_url=thumbnail_url,
                )
        except Exception as exc:
            logger.error("Erro ao consultar BrasilAPI para ISBN %s: %s", clean_isbn, exc)
            return None

    async def search(
        self,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        isbn: str | None = None,
        limit: int = 12,
    ) -> list[ExternalBookItem]:
        # A BrasilAPI é indexada especificamente por ISBN
        target_isbn = isbn
        if not target_isbn and query:
            clean_q = self._normalize_isbn(query)
            if clean_q and len(clean_q) in (10, 13):
                target_isbn = clean_q

        if target_isbn:
            item = await self.get_by_isbn(target_isbn)
            return [item] if item else []

        return []
