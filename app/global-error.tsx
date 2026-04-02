'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0B',
          color: '#FFFFFF',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: '#9CA3AF',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '2rem',
            }}
          >
            An unexpected error occurred. Please try again.
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
      </body>
    </html>
  );
}
