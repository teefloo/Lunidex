'use client';

import { useEffect } from 'react';

import { reportSentryException } from '@/lib/sentry-observability';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportSentryException(error, {
      feature: 'route-boundary',
      route: window.location.pathname,
      operation: 'global-error',
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#07144F', color: '#F2F6FF' }}>
        <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
          <div>
            <p style={{ letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 }}>Lunidex</p>
            <h1>Something went wrong</h1>
            <button
              type="button"
              onClick={() => reset()}
              style={{ cursor: 'pointer', border: 0, borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 700 }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
