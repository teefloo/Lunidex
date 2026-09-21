export function onRouterTransitionStart(url: string, navigationType: string): void {
  void Promise.all([
    import('@sentry/nextjs').then((Sentry) => Sentry.captureRouterTransitionStart(url, navigationType)),
    import('./src/lib/posthog-client').then(({ capturePostHogNavigationStart }) => {
      capturePostHogNavigationStart(url, navigationType);
    }),
  ]).catch(() => {
    // Optional navigation telemetry must never affect routing.
  });
}
