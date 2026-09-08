import * as Sentry from '@sentry/nextjs';

import { scrubSentryEvent } from './src/lib/sentry-common';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT
  ?? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
  ?? process.env.VERCEL_ENV
  ?? process.env.NODE_ENV
  ?? 'development';
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
  environment,
  sendDefaultPii: false,
  // Error events remain unsampled; only performance transactions are reduced
  // because Vercel already supplies request-level observability.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.02 : 0,
  beforeSend: scrubSentryEvent,
  initialScope: {
    tags: {
      app: 'lunidex',
      runtime: 'nodejs',
    },
  },
});
