'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Handle ChunkLoadError from cache eviction after deploys
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk')
    ) {
      const reloadCount = Number(
        sessionStorage.getItem('chunk-reload') || '0'
      );
      if (reloadCount < 2) {
        sessionStorage.setItem('chunk-reload', String(reloadCount + 1));
        window.location.reload();
      }
    }
  }, [error]);

  const isOffline =
    typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #0A0A0B 0%, #0F1419 100%)',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h1
          style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}
        >
          {isOffline ? 'You are offline' : 'Something went wrong'}
        </h1>
        <p
          style={{
            color: '#9CA3AF',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          {isOffline
            ? 'Gritful needs an internet connection to load your challenges and entries. Please reconnect and try again.'
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          style={{
            background: '#00FF88',
            color: '#0A0A0B',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '0.75rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
