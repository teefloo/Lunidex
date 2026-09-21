'use client';

import { useEffect } from 'react';

import RouteErrorState from '@/components/layout/RouteErrorState';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void import('@/lib/sentry-observability')
      .then(({ reportSentryException }) => reportSentryException(error, {
        feature: 'route-boundary',
        route: window.location.pathname,
        operation: 'app-error',
      }))
      .catch(() => {
        // Optional telemetry must never prevent the route recovery UI.
      });
  }, [error]);

  return <RouteErrorState error={error} reset={reset} scope="Lunidex" />;
}
