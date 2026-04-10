const CACHE_VERSION = 'gritful-static-v2';
const OFFLINE_URL = '/offline.html';

// Pre-cache offline page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Clean old caches on activate + enable navigation preload
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete old cache versions
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith('gritful-static-') && name !== CACHE_VERSION
          )
          .map((name) => caches.delete(name))
      );

      // Enable Navigation Preload — lets the network request for a page
      // start in parallel with the SW boot. Supported in Safari 16.4+;
      // older browsers just skip this and fall through to normal fetch.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })()
  );
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

  // Navigation requests -- try navigation preload first (parallelized with
  // SW boot on Safari 16.4+), then standard fetch, then offline fallback
  // for HTML documents only.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Use preload response if available. Catch locally so a failed
          // preload falls through to a standard fetch instead of jumping
          // straight to the offline branch.
          const preload = await event.preloadResponse.catch(() => null);
          if (preload) return preload;

          return await fetch(request);
        } catch {
          // Only real network failures land here — the correct condition
          // for the offline fallback.
          const acceptHeader = request.headers.get('accept') || '';
          if (acceptHeader.includes('text/html')) {
            const cached = await caches.match(OFFLINE_URL);
            if (cached) return cached;
          }
          // RSC fetches that fail just propagate the error naturally
          return Response.error();
        }
      })()
    );
    return;
  }
});

// === PUSH NOTIFICATIONS ===

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Gritful', body: event.data.text() };
  }

  const { title = 'Gritful', body = '', url } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { url: url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || '/dashboard',
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const existing = windowClients[0];
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
      } else {
        clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browser rotated push keys -- re-subscribe and update backend
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe(
          event.oldSubscription?.options || {
            userVisibleOnly: true,
          }
        );

        const sub = newSubscription.toJSON();
        const oldEndpoint = event.oldSubscription?.endpoint;

        const response = await fetch('/api/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: sub.keys,
            oldEndpoint,
          }),
        });

        if (!response.ok) {
          // Auth may have expired -- store in IndexedDB for later sync
          const db = await openSyncDB();
          const tx = db.transaction('pending-subscriptions', 'readwrite');
          tx.objectStore('pending-subscriptions').put({
            endpoint: sub.endpoint,
            keys: sub.keys,
            oldEndpoint,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error('pushsubscriptionchange failed:', err);
      }
    })()
  );
});

// IndexedDB helper for storing pending subscription updates
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gritful-push-sync', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('pending-subscriptions', {
        keyPath: 'endpoint',
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
