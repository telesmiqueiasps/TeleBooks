/**
 * TeleBooks Service Worker
 * Versão: 1.0.0
 * Estratégia: Cache-first para estáticos, Network-first para navegação, Fallback offline resiliente
 */

const CACHE_VERSION = "telebooks-pwa-v1.0.0";
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
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

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

// Ativação e limpeza de caches antigos
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
            message: "Você está sem conexão com a internet. Suas ações serão sincronizadas ao reconectar.",
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

  // 3. Fontes do Google Fonts (Cache-First)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.open(FONTS_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 4. Imagens de capas externas (Stale-While-Revalidate com cache dedicado)
  if (
    request.destination === "image" &&
    (url.pathname.includes("/covers/") ||
      url.hostname.includes("books.google.com") ||
      url.hostname.includes("r2.cloudflarestorage.com") ||
      url.hostname.includes("cloudflare"))
  ) {
    event.respondWith(
      caches.open(COVERS_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 5. Assets Estáticos do Next.js e Locais (Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(css|js|woff2?|ico|png|jpg|jpeg|svg|webp)$/)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 6. Páginas HTML / Navegação (Network-First com timeout de 3.5s e Fallback Offline)
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      new Promise((resolve) => {
        let hasResolved = false;

        // Timeout para conexões muito lentas/3G instável
        const timeoutId = setTimeout(() => {
          if (!hasResolved) {
            caches.open(PAGES_CACHE).then((cache) => {
              cache.match(request).then((cachedPage) => {
                if (cachedPage && !hasResolved) {
                  hasResolved = true;
                  resolve(cachedPage);
                }
              });
            });
          }
        }, 3500);

        fetch(request)
          .then((networkResponse) => {
            clearTimeout(timeoutId);
            if (!hasResolved) {
              hasResolved = true;
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(PAGES_CACHE).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              resolve(networkResponse);
            }
          })
          .catch(async () => {
            clearTimeout(timeoutId);
            if (!hasResolved) {
              hasResolved = true;
              // Tenta página cacheada
              const cache = await caches.open(PAGES_CACHE);
              const cachedPage = await cache.match(request);
              if (cachedPage) {
                resolve(cachedPage);
                return;
              }

              // Fallback para página offline estilizada
              const staticCache = await caches.open(STATIC_CACHE);
              const offlinePage = await staticCache.match(OFFLINE_URL);
              if (offlinePage) {
                resolve(offlinePage);
                return;
              }

              resolve(new Response("TeleBooks - Offline", { status: 503 }));
            }
          });
      })
    );
    return;
  }

  // 7. Qualquer outra requisição segue padrão Stale-While-Revalidate suave
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Comunicação com a interface (para forçar atualização se requisitado)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
