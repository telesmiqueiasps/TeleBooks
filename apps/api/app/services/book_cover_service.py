import logging
import re
import urllib.parse
from typing import Any

import httpx

logger = logging.getLogger(__name__)

EV_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class BookCoverService:
    """
    Serviço central de resolução e enriquecimento de capas de livros.
    Combina Google Books CDN, Estante Virtual (maior rede de livrarias do Brasil)
    e Open Library para garantir capas em alta resolução para edições brasileiras.
    """

    @staticmethod
    async def resolve_best_cover(
        isbn13: str | None = None,
        isbn10: str | None = None,
        title: str | None = None,
        author: str | None = None,
    ) -> tuple[str | None, str | None]:
        clean_target = isbn13 or isbn10

        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            # 1. Google Books Content CDN (zoom=2: alta resolução / zoom=1: miniatura)
            if clean_target:
                gb_thumb = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=1"
                gb_large = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=2"
                try:
                    r_gb = await client.get(gb_thumb)
                    if (
                        r_gb.status_code == 200
                        and len(r_gb.content) > 2000
                        and "image/jpeg" in r_gb.headers.get("content-type", "")
                    ):
                        return gb_large, gb_thumb
                except Exception as exc:
                    logger.debug("Google Books cover check falhou para ISBN %s: %s", clean_target, exc)

            # 2. Estante Virtual (livros nacionais por ISBN e Título)
            ev_covers = await BookCoverService._fetch_estante_virtual_async(
                client=client, isbn=clean_target, title=title, author=author
            )
            if ev_covers:
                return ev_covers[0], ev_covers[0]

            # 3. Open Library Covers com ?default=false
            if clean_target:
                ol_large = f"https://covers.openlibrary.org/b/isbn/{clean_target}-L.jpg?default=false"
                ol_thumb = f"https://covers.openlibrary.org/b/isbn/{clean_target}-M.jpg?default=false"
                try:
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
        title: str | None = None,
        author: str | None = None,
    ) -> tuple[str | None, str | None]:
        clean_target = isbn13 or isbn10

        with httpx.Client(timeout=4.0, follow_redirects=True) as client:
            # 1. Google Books Content CDN
            if clean_target:
                gb_thumb = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=1"
                gb_large = f"https://books.google.com/books/content?vid=isbn{clean_target}&printsec=frontcover&img=1&zoom=2"
                try:
                    r_gb = client.get(gb_thumb)
                    if (
                        r_gb.status_code == 200
                        and len(r_gb.content) > 2000
                        and "image/jpeg" in r_gb.headers.get("content-type", "")
                    ):
                        return gb_large, gb_thumb
                except Exception as exc:
                    logger.debug("Sync Google Books cover falhou: %s", exc)

            # 2. Estante Virtual
            ev_covers = BookCoverService._fetch_estante_virtual_sync(
                client=client, isbn=clean_target, title=title, author=author
            )
            if ev_covers:
                return ev_covers[0], ev_covers[0]

            # 3. Open Library Covers
            if clean_target:
                ol_large = f"https://covers.openlibrary.org/b/isbn/{clean_target}-L.jpg?default=false"
                ol_thumb = f"https://covers.openlibrary.org/b/isbn/{clean_target}-M.jpg?default=false"
                try:
                    r_ol = client.get(ol_large)
                    if (
                        r_ol.status_code == 200
                        and len(r_ol.content) > 1000
                        and "image/gif" not in r_ol.headers.get("content-type", "")
                    ):
                        return ol_large, ol_thumb
                except Exception as exc:
                    logger.debug("Sync Open Library cover falhou: %s", exc)

        return None, None

    @staticmethod
    async def _fetch_estante_virtual_async(
        client: httpx.AsyncClient,
        isbn: str | None = None,
        title: str | None = None,
        author: str | None = None,
    ) -> list[str]:
        found: list[str] = []
        if isbn:
            try:
                r = await client.get(
                    f"https://www.estantevirtual.com.br/busca?q={isbn}",
                    headers=EV_HEADERS,
                    timeout=3.5,
                )
                if r.status_code == 200:
                    imgs = re.findall(r'https://static\.estantevirtual\.com\.br/book/[^\s\"\'<>]+\.jpg', r.text)
                    found.extend([i for i in dict.fromkeys(imgs) if "indisponivel" not in i])
            except Exception as exc:
                logger.debug("Estante Virtual async ISBN falhou: %s", exc)

        if not found and title:
            try:
                q = urllib.parse.quote_plus(f"{title} {author or ''}".strip())
                r = await client.get(
                    f"https://www.estantevirtual.com.br/busca?q={q}",
                    headers=EV_HEADERS,
                    timeout=3.5,
                )
                if r.status_code == 200:
                    imgs = re.findall(r'https://static\.estantevirtual\.com\.br/book/[^\s\"\'<>]+\.jpg', r.text)
                    found.extend([i for i in dict.fromkeys(imgs) if "indisponivel" not in i])
            except Exception as exc:
                logger.debug("Estante Virtual async title falhou: %s", exc)

        return list(dict.fromkeys(found))

    @staticmethod
    def _fetch_estante_virtual_sync(
        client: httpx.Client,
        isbn: str | None = None,
        title: str | None = None,
        author: str | None = None,
    ) -> list[str]:
        found: list[str] = []
        if isbn:
            try:
                r = client.get(
                    f"https://www.estantevirtual.com.br/busca?q={isbn}",
                    headers=EV_HEADERS,
                    timeout=3.5,
                )
                if r.status_code == 200:
                    imgs = re.findall(r'https://static\.estantevirtual\.com\.br/book/[^\s\"\'<>]+\.jpg', r.text)
                    found.extend([i for i in dict.fromkeys(imgs) if "indisponivel" not in i])
            except Exception as exc:
                logger.debug("Estante Virtual sync ISBN falhou: %s", exc)

        if not found and title:
            try:
                q = urllib.parse.quote_plus(f"{title} {author or ''}".strip())
                r = client.get(
                    f"https://www.estantevirtual.com.br/busca?q={q}",
                    headers=EV_HEADERS,
                    timeout=3.5,
                )
                if r.status_code == 200:
                    imgs = re.findall(r'https://static\.estantevirtual\.com\.br/book/[^\s\"\'<>]+\.jpg', r.text)
                    found.extend([i for i in dict.fromkeys(imgs) if "indisponivel" not in i])
            except Exception as exc:
                logger.debug("Estante Virtual sync title falhou: %s", exc)

        return list(dict.fromkeys(found))

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
                            "label": "Edição Oficial Google",
                        })
                        seen_urls.add(gb_large)
                        seen_urls.add(gb_thumb)
                except Exception as exc:
                    logger.debug("Google Books cover search error: %s", exc)

            # 2. Estante Virtual (Coletivo de livrarias brasileiras)
            ev_covers = await BookCoverService._fetch_estante_virtual_async(
                client=client, isbn=clean_isbn, title=title, author=author
            )
            for idx, ev_url in enumerate(ev_covers[:6]):
                if ev_url not in seen_urls:
                    options.append({
                        "url": ev_url,
                        "thumbnail_url": ev_url,
                        "source": "Livrarias do Brasil",
                        "label": f"Edição Nacional #{idx + 1}" if len(ev_covers) > 1 else "Edição Nacional",
                    })
                    seen_urls.add(ev_url)

            # 3. Open Library pelo ISBN
            if clean_isbn and len(clean_isbn) in (10, 13):
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
                                "label": "Catálogo Internacional",
                            })
                            seen_urls.add(ol_large)
                except Exception as exc:
                    logger.debug("Open Library cover search error: %s", exc)

            # 4. Open Library Search API por Título e Autor
            if title and len(options) < 6:
                try:
                    ol_search_params = {"title": title}
                    if author:
                        ol_search_params["author"] = author
                    r_ol_search = await client.get("https://openlibrary.org/search.json", params=ol_search_params)
                    if r_ol_search.status_code == 200:
                        docs = r_ol_search.json().get("docs", [])
                        for doc in docs[:4]:
                            cover_id = doc.get("cover_i")
                            if cover_id:
                                doc_large = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                                doc_thumb = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
                                if doc_large not in seen_urls:
                                    edition_year = doc.get("first_publish_year") or doc.get("publish_year", [None])[0]
                                    label_str = f"Edição ({edition_year})" if edition_year else "Edição alternativa"
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

        return options
