import logging
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BookCoverService:
    """
    Serviço central de resolução e enriquecimento de capas de livros.
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

    @staticmethod
    async def search_cover_options(
        isbn: str | None = None,
        title: str | None = None,
        author: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Pesquisa na web e agrega opções de capas reais para a edição do livro,
        permitindo ao usuário selecionar a capa ideal visualmente.
        """
        options: list[dict[str, Any]] = []
        seen_urls: set[str] = set()

        clean_isbn = re.sub(r"[^0-9X]", "", isbn.upper()) if isbn else None

        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            # 1. Google Books Content CDN pelo ISBN
            if clean_isbn and len(clean_isbn) in (10, 13):
                gb_thumb = f"https://books.google.com/books/content?vid=isbn{clean_isbn}&printsec=frontcover&img=1&zoom=1"
                gb_large = f"https://books.google.com/books/content?vid=isbn{clean_isbn}&printsec=frontcover&img=1&zoom=2"
                try:
                    r_gb = await client.get(gb_thumb)
                    if (
                        r_gb.status_code == 200
                        and len(r_gb.content) > 2000
                        and "image/jpeg" in r_gb.headers.get("content-type", "")
                    ):
                        options.append({
                            "url": gb_large,
                            "thumbnail_url": gb_thumb,
                            "source": "Google Books",
                            "label": f"Capa da Edição (ISBN {clean_isbn})",
                        })
                        seen_urls.add(gb_large)
                        seen_urls.add(gb_thumb)
                except Exception as exc:
                    logger.debug("Google Books cover search error: %s", exc)

                # 2. Open Library pelo ISBN
                ol_large = f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg?default=false"
                ol_thumb = f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-M.jpg?default=false"
                try:
                    r_ol = await client.get(ol_large)
                    if (
                        r_ol.status_code == 200
                        and len(r_ol.content) > 1000
                        and "image/gif" not in r_ol.headers.get("content-type", "")
                    ):
                        if ol_large not in seen_urls:
                            options.append({
                                "url": ol_large,
                                "thumbnail_url": ol_thumb,
                                "source": "Open Library",
                                "label": f"Edição Registrada ({clean_isbn})",
                            })
                            seen_urls.add(ol_large)
                except Exception as exc:
                    logger.debug("Open Library cover search error: %s", exc)

            # 3. Open Library Search API por Título e Autor
            if title:
                try:
                    ol_search_params = {"title": title}
                    if author:
                        ol_search_params["author"] = author
                    r_ol_search = await client.get("https://openlibrary.org/search.json", params=ol_search_params)
                    if r_ol_search.status_code == 200:
                        docs = r_ol_search.json().get("docs", [])
                        for doc in docs[:6]:
                            cover_id = doc.get("cover_i")
                            if cover_id:
                                doc_large = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                                doc_thumb = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
                                if doc_large not in seen_urls:
                                    edition_year = doc.get("first_publish_year") or doc.get("publish_year", [None])[0]
                                    label_str = f"Edição ({edition_year})" if edition_year else doc.get("title", "Edição")
                                    options.append({
                                        "url": doc_large,
                                        "thumbnail_url": doc_thumb,
                                        "source": "Open Library",
                                        "label": label_str,
                                    })
                                    seen_urls.add(doc_large)
                                    if len(options) >= 8:
                                        break
                except Exception as exc:
                    logger.debug("Open Library search by title failed: %s", exc)

            # 4. Google Books API (Volumes) por Título e Autor
            if title:
                try:
                    q_term = f'intitle:"{title}"'
                    if author:
                        q_term += f' inauthor:"{author}"'
                    r_gb_vols = await client.get(
                        "https://www.googleapis.com/books/v1/volumes",
                        params={"q": q_term, "maxResults": 4},
                    )
                    if r_gb_vols.status_code == 200:
                        items = r_gb_vols.json().get("items", [])
                        for it in items:
                            vinfo = it.get("volumeInfo", {})
                            imgs = vinfo.get("imageLinks", {})
                            high_res = imgs.get("extraLarge") or imgs.get("large") or imgs.get("medium") or imgs.get("thumbnail")
                            thumb = imgs.get("thumbnail") or imgs.get("smallThumbnail")
                            if high_res:
                                high_res_clean = high_res.replace("http://", "https://")
                                thumb_clean = thumb.replace("http://", "https://") if thumb else high_res_clean
                                if high_res_clean not in seen_urls:
                                    ed_title = vinfo.get("title", title)
                                    ed_pub = vinfo.get("publisher", "")
                                    lbl = f"{ed_title}" + (f" ({ed_pub})" if ed_pub else "")
                                    options.append({
                                        "url": high_res_clean,
                                        "thumbnail_url": thumb_clean,
                                        "source": "Google Books",
                                        "label": lbl,
                                    })
                                    seen_urls.add(high_res_clean)
                except Exception as exc:
                    logger.debug("Google Books volumes search error: %s", exc)

        return options

