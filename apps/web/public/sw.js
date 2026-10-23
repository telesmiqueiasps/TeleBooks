/**
 * TeleBooks Service Worker
 * Versão: 1.0.3
 * Estratégia: Cache-first para estáticos, Network-first para navegação e RSC, Fallback offline resiliente
 */

const CACHE_VERSION = "telebooks-pwa-v1.0.3";
const STATIC_CACHE = `telebooks-static-${CACHE_VERSION}`;
const PAGES_CACHE = `telebooks-pages-${CACHE_VERSION}`;
const FONTS_CACHE = `telebooks-fonts-${CACHE_VERSION}`;
const COVERS_CACHE = `telebooks-covers-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

// Assets essenciais pré-cacheados na instalação
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.ico",
  "/icone.png",
  "/icone_sem_fundo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

/**
 * Função utilitária segura para clonar e armazenar em cache.
 * Evita exceções de "Response body is already used" ao clonar imediatamente
 * de forma síncrona e tratar qualquer erro de forma silenciosa.
 */
function safeCloneAndCache(cacheName, request, networkResponse) {
  if (
    !networkResponse ||
    networkResponse.status !== 200 ||
    request.method !== "GET"
  ) {
    return;
  }

  // Se o body já foi consumido ou é nulo, não clonar
  if (networkResponse.bodyUsed) {
    return;
  }

  try {
    const responseToCache = networkResponse.clone();
    caches
      .open(cacheName)
      .then((cache) => {
        cache.put(request, responseToCache).catch(() => {});
      })
      .catch(() => {});
  } catch (_err) {
    // Falha silenciosa se response já estiver em streaming/consumida
  }
}

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza imediata de caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith("telebooks-") &&
              !cacheName.includes(CACHE_VERSION)
            ) {
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interceptação de Requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 0. Ignora esquemas não-http (ex: chrome-extension://, moz-extension://)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // 1. Ignora métodos não-GET (POST, PUT, DELETE, PATCH nunca são cacheados)
  if (request.method !== "GET") {
    return;
  }

  // 2. Ignora chamadas de autenticação Supabase e chamadas de API externas/internas
  // Mantemos Network-Only para garantir frescor de dados e segurança
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("onrender.com")
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: "offline",
            message:
              "Você está sem conexão com a internet. Suas ações serão sincronizadas ao reconectar.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      })
    );
    return;
  }

  // 3. Requisições internas do Next.js RSC (App Router Client Navigation)
  // Devem ir direto para a rede sem risco de retornar undefined
  if (
    request.headers.get("rsc") === "1" ||
    url.searchParams.has("_rsc") ||
    request.headers.get("accept")?.includes("text/x-component") ||
    request.headers.get("next-router-state-tree") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        const pagesCache = await caches.open(PAGES_CACHE);
        const cached = await pagesCache.match(request);
        if (cached) return cached;
        return new Response(null, {
          status: 503,
          statusText: "Offline",
        });
      })
    );
    return;
  }

  // 4. Fontes do Google Fonts (Cache-First com fallback seguro)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.open(FONTS_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request)
            .then((networkResponse) => {
              safeCloneAndCache(FONTS_CACHE, request, networkResponse);
              return networkResponse;
            })
            .catch(() => {
              return new Response("", { status: 404, statusText: "Font Not Found" });
            });
        });
      })
    );
    return;
  }

  // 5. Imagens de capas externas (Stale-While-Revalidate com cache dedicado)
  if (
    request.destination === "image" &&
    (url.pathname.includes("/covers/") ||
      url.hostname.includes("books.google.com") ||
      url.hostname.includes("r2.cloudflarestorage.com") ||
      url.hostname.includes("cloudflare"))
  ) {
    event.respondWith(
      caches.open(COVERS_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            safeCloneAndCache(COVERS_CACHE, request, networkResponse);
            return networkResponse;
          })
          .catch(() => {
            return (
              cachedResponse ||
              new Response("", { status: 404, statusText: "Cover Not Found" })
            );
          });

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 6. Assets Estáticos do Next.js e Locais (Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(css|js|woff2?|ico|png|jpg|jpeg|svg|webp)$/)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request)
            .then((networkResponse) => {
              safeCloneAndCache(STATIC_CACHE, request, networkResponse);
              return networkResponse;
            })
            .catch(() => {
              // Se o chunk não for encontrado (ex: hash antigo após deploy), retorna 404 seguro
              return new Response("", { status: 404, statusText: "Asset Not Found" });
            });
        });
      })
    );
    return;
  }

  // 7. Páginas HTML / Navegação (Network-First com suporte a query params e Fallback Offline)
  if (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          safeCloneAndCache(PAGES_CACHE, request, networkResponse);
          return networkResponse;
        })
        .catch(async () => {
          // 1. Tenta página exata no cache (incluindo query params como ?id=...)
          const pagesCache = await caches.open(PAGES_CACHE);
          const cachedPage = await pagesCache.match(request);
          if (cachedPage) return cachedPage;

          // 2. Tenta página sem query params (ex: /comunidade)
          try {
            const urlNoQuery = new URL(request.url);
            urlNoQuery.search = "";
            const cachedPageNoQuery = await pagesCache.match(urlNoQuery.toString());
            if (cachedPageNoQuery) return cachedPageNoQuery;
          } catch (_e) {}

          // 3. Fallback para página offline estilizada
          const staticCache = await caches.open(STATIC_CACHE);
          const offlinePage = await staticCache.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          // 4. Último recurso: Response válido com erro 503
          return new Response("TeleBooks - Você está offline", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // 8. Para qualquer outra requisição não categorizada, NÃO chamar event.respondWith!
  // O navegador cuidará nativamente da requisição, eliminando riscos de TypeError.
});

// Comunicação com a interface (para forçar atualização se requisitado)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
