import * as Sentry from '@sentry/nextjs';

import { scrubSentryEvent } from './src/lib/sentry-common';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT
    ?? process.env.VERCEL_ENV
    ?? process.env.NODE_ENV
    ?? 'development',
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  beforeSend: scrubSentryEvent,
  initialScope: {
    tags: {
      app: 'lunidex',
      runtime: 'edge',
    },
  },
});
