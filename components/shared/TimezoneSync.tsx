'use client';

import { useEffect } from 'react';
import { syncTimezone } from '@/app/actions/profile';

const TZ_SYNCED_KEY = 'tz-synced';

export function TimezoneSync() {
  useEffect(() => {
    if (localStorage.getItem(TZ_SYNCED_KEY)) return;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === 'UTC') return;

    syncTimezone(tz).then((result) => {
      if (result?.success) {
        localStorage.setItem(TZ_SYNCED_KEY, '1');
      }
    }).catch(() => {
      // Not critical -- will retry next page load
    });
  }, []);

  return null;
}
