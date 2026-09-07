import * as Sentry from '@sentry/nextjs';

import { initializeSentryClient } from './src/lib/sentry-client';

initializeSentryClient();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
