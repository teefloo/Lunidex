import { MutationCache, QueryCache } from '@tanstack/react-query';

import type { ObservabilityContext } from '@/lib/sentry-observability';

type SentryObservabilityModule = typeof import('@/lib/sentry-observability');
type PostHogClientModule = typeof import('@/lib/posthog-client');

let sentryObservabilityPromise: Promise<SentryObservabilityModule> | undefined;
let postHogClientPromise: Promise<PostHogClientModule> | undefined;

function loadSentryObservability(): Promise<SentryObservabilityModule> {
  sentryObservabilityPromise ??= import('@/lib/sentry-observability');
  return sentryObservabilityPromise;
}

function loadPostHogClient(): Promise<PostHogClientModule> {
  postHogClientPromise ??= import('@/lib/posthog-client');
  return postHogClientPromise;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') return candidate.status;
  return typeof candidate.response?.status === 'number' ? candidate.response.status : undefined;
}

function getQueryContext(feature: string, kind: 'query' | 'mutation'): ObservabilityContext {
  return { feature, operation: kind, kind };
}

function featureFromQueryKey(queryKey: readonly unknown[]): string {
  const candidate = typeof queryKey[0] === 'string' ? queryKey[0].toLowerCase() : '';
  const features = [
    'pokemon',
    'profile',
    'quiz',
    'friends',
    'battle',
    'tcg',
    'price',
    'notifications',
    'notification',
    'sync',
    'smogon',
  ];
  return features.find((feature) => candidate.includes(feature)) ?? 'query';
}

function reportQueryFailure(error: unknown, context: ObservabilityContext & { status?: number }): void {
  void loadSentryObservability()
    .then((sentry) => {
      if (sentry.shouldIgnoreHttpFailure({ error, status: context.status, operation: context.operation })) return;

      sentry.reportHttpFailure(error, context);
      return loadPostHogClient().then((posthog) => {
        const candidate = error && typeof error === 'object' ? error as { name?: unknown } : {};
        posthog.capturePostHogFeatureError({
          feature: context.feature,
          operation: context.operation,
          kind: context.kind,
          status: context.status,
          error_type: typeof candidate.name === 'string' ? candidate.name : 'Error',
        });
      });
    })
    .catch(() => {
      // Optional telemetry must never change query behavior.
    });
}

function getMutationKey(mutation: { options: { mutationKey?: readonly unknown[] } }): readonly unknown[] {
  return mutation.options.mutationKey ?? [];
}

export function createObservedQueryCache(): QueryCache {
  return new QueryCache({
    onError: (error, query) => {
      const feature = featureFromQueryKey(query.queryKey);
      const context = {
        ...getQueryContext(feature, 'query'),
        status: getErrorStatus(error),
      };
      reportQueryFailure(error, context);
    },
  });
}

export function createObservedMutationCache(): MutationCache {
  return new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      const feature = featureFromQueryKey(getMutationKey(mutation));
      const context = {
        ...getQueryContext(feature, 'mutation'),
        status: getErrorStatus(error),
      };
      reportQueryFailure(error, context);
    },
  });
}
