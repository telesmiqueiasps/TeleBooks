import logging
import httpx

logger = logging.getLogger(__name__)


class BookCoverService:
    """
    Serviço central de resolução e enriquecimento de capas de livros.
    
    Problema resolvido: A CBL/BrasilAPI raramente possui capas em seu catálogo e
    a Open Library possui apenas cerca de 10% das edições brasileiras (e frequentemente
    retorna um GIF transparente de 43 bytes sem status de erro).
    
    Estratégia de resolução multi-fonte:
    1. Google Books Content CDN (zoom=2 para alta resolução, zoom=1 para miniatura).
       Verifica em tempo de execução se a resposta é um JPEG real (evitando o placeholder
       cinza padrão de 1269 bytes retornado quando a obra não possui capa no Google).
    2. Open Library Covers API com flag ?default=false (evitando o pixel transparente de 43 bytes).
    3. Retorna (cover_url, thumbnail_url) ou (None, None).
    """

    @staticmethod
    async def resolve_best_cover(
        isbn13: str | None = None,
        isbn10: str | None = None,
    ) -> tuple[str | None, str | None]:
        clean_target = isbn13 or isbn10
        if not clean_target:
            return None, None

        # 1. Google Books Content CDN (zoom=2: capa grande / zoom=1: miniatura)
        gb_thumb = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=1"
        gb_large = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=2"
        try:
            async with httpx.AsyncClient(timeout=3.5, follow_redirects=True) as client:
                r_gb = await client.get(gb_thumb)
                if (
                    r_gb.status_code == 200
                    and len(r_gb.content) > 2000
                    and "image/jpeg" in r_gb.headers.get("content-type", "")
                ):
                    return gb_large, gb_thumb
        except Exception as exc:
            logger.debug("Google Books cover check falhou para ISBN %s: %s", clean_target, exc)

        # 2. Open Library Covers com ?default=false
        ol_large = f"https://covers.openlibrary.org/b/isbn/{clean_target}-L.jpg?default=false"
        ol_thumb = f"https://covers.openlibrary.org/b/isbn/{clean_target}-M.jpg?default=false"
        try:
            async with httpx.AsyncClient(timeout=3.5, follow_redirects=True) as client:
                r_ol = await client.get(ol_large)
                if (
                    r_ol.status_code == 200
                    and len(r_ol.content) > 1000
                    and "image/gif" not in r_ol.headers.get("content-type", "")
                ):
                    return ol_large, ol_thumb
        except Exception as exc:
            logger.debug("Open Library cover check falhou para ISBN %s: %s", clean_target, exc)

        return None, None

    @staticmethod
    def resolve_best_cover_sync(
        isbn13: str | None = None,
        isbn10: str | None = None,
    ) -> tuple[str | None, str | None]:
        clean_target = isbn13 or isbn10
        if not clean_target:
            return None, None

        gb_thumb = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=1"
        gb_large = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=2"
        try:
            with httpx.Client(timeout=3.5, follow_redirects=True) as client:
                r_gb = client.get(gb_thumb)
                if (
                    r_gb.status_code == 200
                    and len(r_gb.content) > 2000
                    and "image/jpeg" in r_gb.headers.get("content-type", "")
                ):
                    return gb_large, gb_thumb

                ol_large = f"https://covers.openlibrary.org/b/isbn/{clean_target}-L.jpg?default=false"
                ol_thumb = f"https://covers.openlibrary.org/b/isbn/{clean_target}-M.jpg?default=false"
                r_ol = client.get(ol_large)
                if (
                    r_ol.status_code == 200
                    and len(r_ol.content) > 1000
                    and "image/gif" not in r_ol.headers.get("content-type", "")
                ):
                    return ol_large, ol_thumb
        except Exception as exc:
            logger.debug("Sync cover check falhou para ISBN %s: %s", clean_target, exc)

        return None, None
