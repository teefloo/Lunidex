import { MutationCache, QueryCache } from '@tanstack/react-query';

import {
  featureFromQueryKey,
  reportHttpFailure,
  shouldIgnoreHttpFailure,
  type ObservabilityContext,
} from '@/lib/sentry-observability';
import { capturePostHogFeatureError } from '@/lib/posthog-client';

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') return candidate.status;
  return typeof candidate.response?.status === 'number' ? candidate.response.status : undefined;
}

function getQueryContext(feature: string, kind: 'query' | 'mutation'): ObservabilityContext {
  return { feature, operation: kind, kind };
}

function captureProductError(error: unknown, context: ObservabilityContext & { status?: number }): void {
  if (shouldIgnoreHttpFailure({ error, status: context.status, operation: context.operation })) return;
  const candidate = error && typeof error === 'object' ? error as { name?: unknown } : {};
  capturePostHogFeatureError({
    feature: context.feature,
    operation: context.operation,
    kind: context.kind,
    status: context.status,
    error_type: typeof candidate.name === 'string' ? candidate.name : 'Error',
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
      reportHttpFailure(error, context);
      captureProductError(error, context);
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
      reportHttpFailure(error, context);
      captureProductError(error, context);
    },
  });
}
