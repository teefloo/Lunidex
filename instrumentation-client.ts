import * as Sentry from '@sentry/nextjs';

import { capturePostHogNavigationStart, initializePostHog } from './src/lib/posthog-client';
import { initializeSentryClient } from './src/lib/sentry-client';

initializeSentryClient();
initializePostHog();

export function onRouterTransitionStart(url: string, navigationType: string): void {
  Sentry.captureRouterTransitionStart(url, navigationType);
  capturePostHogNavigationStart(url, navigationType);
}
