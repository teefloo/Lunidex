export function onRouterTransitionStart(url: string, navigationType: string): void {
  const captures: Promise<unknown>[] = [];
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    captures.push(import('@sentry/nextjs').then((Sentry) => Sentry.captureRouterTransitionStart(url, navigationType)));
  }
  if (process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true' && process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    captures.push(import('./src/lib/posthog-client').then(({ capturePostHogNavigationStart }) => {
      capturePostHogNavigationStart(url, navigationType);
    }));
  }
  // A failed optional SDK must not prevent the other service from observing.
  void Promise.allSettled(captures);
}
