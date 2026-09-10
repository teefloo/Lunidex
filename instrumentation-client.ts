import * as Sentry from '@sentry/nextjs';

import { initializePostHog } from './src/lib/posthog-client';
import { initializeSentryClient } from './src/lib/sentry-client';

initializeSentryClient();
initializePostHog();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
