'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerRegistrar } from '@/components/shared/ServiceWorkerRegistrar';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { TimezoneSync } from '@/components/shared/TimezoneSync';
import { useState } from 'react';

// Only load react-query-devtools in development. In production this compiles
// down to `() => null`, so the devtools module is tree-shaken out entirely
// (~50-100KB saved from the client bundle).
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () =>
          import('@tanstack/react-query-devtools').then(
            (m) => m.ReactQueryDevtools
          ),
        { ssr: false }
      )
    : () => null;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
        <ServiceWorkerRegistrar />
        <InstallPrompt />
        <TimezoneSync />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
