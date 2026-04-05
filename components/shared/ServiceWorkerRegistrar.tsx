'use client';

import { useEffect } from 'react';

// Sync any pending push subscription updates that were stored in IndexedDB
// by the SW when the auth session was expired during pushsubscriptionchange
async function syncPendingSubscriptions() {
  try {
    const request = indexedDB.open('gritful-push-sync', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('pending-subscriptions', {
        keyPath: 'endpoint',
      });
    };

    const db: IDBDatabase = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = db.transaction('pending-subscriptions', 'readwrite');
    const store = tx.objectStore('pending-subscriptions');
    const getAll = store.getAll();

    const pending: any[] = await new Promise((resolve, reject) => {
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    });

    for (const sub of pending) {
      const res = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (res.ok) {
        store.delete(sub.endpoint);
      }
    }

    db.close();
  } catch {
    // IndexedDB may not exist yet or be empty -- that's fine
  }
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('SW registration failed:', error);
      });

      // Sync any pending subscription updates from IndexedDB
      syncPendingSubscriptions();
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
