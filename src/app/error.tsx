'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

import RouteErrorState from '@/components/layout/RouteErrorState';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <RouteErrorState error={error} reset={reset} scope="Lunidex" />;
}
