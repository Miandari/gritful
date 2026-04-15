'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LaunchRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Start loading the dashboard in the background while the user
    // sees the branded launch screen.
    router.prefetch('/dashboard');

    // Redirect to dashboard. Using replace() so the launch page
    // doesn't stay in the back-navigation history.
    router.replace('/dashboard');
  }, [router]);

  return null;
}
