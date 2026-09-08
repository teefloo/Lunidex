import { MutationCache, QueryCache } from '@tanstack/react-query';

import {
  featureFromQueryKey,
  reportHttpFailure,
  type ObservabilityContext,
} from '@/lib/sentry-observability';

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') return candidate.status;
  return typeof candidate.response?.status === 'number' ? candidate.response.status : undefined;
}

function getQueryContext(feature: string, kind: 'query' | 'mutation'): ObservabilityContext {
  return { feature, operation: kind, kind };
}

function getMutationKey(mutation: { options: { mutationKey?: readonly unknown[] } }): readonly unknown[] {
  return mutation.options.mutationKey ?? [];
}

export function createObservedQueryCache(): QueryCache {
  return new QueryCache({
    onError: (error, query) => {
      const feature = featureFromQueryKey(query.queryKey);
      reportHttpFailure(error, {
        ...getQueryContext(feature, 'query'),
        status: getErrorStatus(error),
      });
    },
  });
}

export function createObservedMutationCache(): MutationCache {
  return new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      const feature = featureFromQueryKey(getMutationKey(mutation));
      reportHttpFailure(error, {
        ...getQueryContext(feature, 'mutation'),
        status: getErrorStatus(error),
      });
    },
  });
}
