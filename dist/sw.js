const CACHE_VERSION = 'v2';
const STATIC_CACHE = `lending-static-${CACHE_VERSION}`;
const API_CACHE = `lending-api-${CACHE_VERSION}`;
const PAGE_CACHE = `lending-pages-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/placeholder.svg',
];

// Pre-cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
    ])
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => 
            !key.includes(CACHE_VERSION)
          )
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event with smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API calls: stale-while-revalidate strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => cached || new Response('Offline', { status: 503 }));

        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML pages: cache first with network fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(PAGE_CACHE).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => 
            cached || new Response('Page unavailable offline', { status: 503 })
          );

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets (CSS, JS, images): cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => new Response('Asset unavailable offline', { status: 503 }));
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
