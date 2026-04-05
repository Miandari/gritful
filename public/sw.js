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
