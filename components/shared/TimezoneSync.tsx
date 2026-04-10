'use client';

import { useEffect } from 'react';
import { syncTimezone } from '@/app/actions/profile';

const TZ_SYNCED_KEY = 'tz-synced';

// Defer non-critical work until after the first contentful paint so it
// doesn't compete for main-thread time during app cold start. Safe to call
// only from effects — no SSR guard needed.
const runWhenIdle = (fn: () => void) => {
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 0);
  }
};

export function TimezoneSync() {
  useEffect(() => {
    if (localStorage.getItem(TZ_SYNCED_KEY)) return;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === 'UTC') return;

    runWhenIdle(() => {
      syncTimezone(tz).then((result) => {
        if (result?.success) {
          localStorage.setItem(TZ_SYNCED_KEY, '1');
        }
      }).catch(() => {
        // Not critical -- will retry next page load
      });
    });
  }, []);

  return null;
}
