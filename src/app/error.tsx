'use client';

import { useEffect } from 'react';

import RouteErrorState from '@/components/layout/RouteErrorState';
import { reportSentryException } from '@/lib/sentry-observability';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportSentryException(error, {
      feature: 'route-boundary',
      route: window.location.pathname,
      operation: 'app-error',
    });
  }, [error]);

  return <RouteErrorState error={error} reset={reset} scope="Lunidex" />;
}
