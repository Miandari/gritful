const CACHE_VERSION = 'gritful-static-v1';
const OFFLINE_URL = '/offline.html';

// Pre-cache offline page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith('gritful-static-') && name !== CACHE_VERSION
          )
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler with per-resource strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls -- always network
  if (url.hostname.includes('supabase')) return;

  // Skip Next.js data fetches -- always network
  if (url.pathname.startsWith('/_next/data/')) return;

  // Static assets (/_next/static/) -- cache on first fetch, serve from cache after
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Icons and static images -- cache on first fetch, serve from cache after
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation requests -- network-first, offline fallback for HTML only
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Only serve offline.html for actual HTML document requests,
        // not RSC payload fetches which also use navigate mode
        const acceptHeader = request.headers.get('accept') || '';
        if (acceptHeader.includes('text/html')) {
          return caches.match(OFFLINE_URL);
        }
        // RSC fetches that fail just propagate the error naturally
        return Response.error();
      })
    );
    return;
  }
});

// === PUSH NOTIFICATIONS (Phase 2) ===
// self.addEventListener('push', ...)
// self.addEventListener('notificationclick', ...)
// self.addEventListener('pushsubscriptionchange', ...)
