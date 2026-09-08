import * as Sentry from '@sentry/nextjs';
import { QueryClient, QueryCache } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createObservedMutationCache, createObservedQueryCache } from './query-observability';
import { resetSentryDeduplicationForTests } from './sentry-observability';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback: (scope: { setTag: () => void; setContext: () => void }) => void) => {
    callback({ setTag: vi.fn(), setContext: vi.fn() });
  }),
}));

describe('TanStack Query observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryDeduplicationForTests();
  });

  it('reports a query only after the configured retries have failed', async () => {
    let attempts = 0;
    const client = new QueryClient({
      queryCache: createObservedQueryCache(),
      defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
    });

    await expect(client.fetchQuery({
      queryKey: ['pokemon', 'pikachu'],
      queryFn: async () => {
        attempts += 1;
        throw new Error('upstream failed');
      },
    })).rejects.toThrow('upstream failed');

    expect(attempts).toBe(2);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('reports failed mutations without sending mutation variables', async () => {
    const client = new QueryClient({
      queryCache: new QueryCache(),
      mutationCache: createObservedMutationCache(),
      defaultOptions: { mutations: { retry: false } },
    });
    const mutation = client.getMutationCache().build(client, {
      mutationKey: ['profile'],
      mutationFn: async () => {
        throw new Error('mutation failed');
      },
    });

    await expect(mutation.execute({ email: 'user@example.com' })).rejects.toThrow('mutation failed');

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(Sentry.captureException).mock.calls)).not.toContain('user@example.com');
  });

  it('ignores aborted query failures', async () => {
    const client = new QueryClient({
      queryCache: createObservedQueryCache(),
      defaultOptions: { queries: { retry: false } },
    });

    await expect(client.fetchQuery({
      queryKey: ['tcg', 'search'],
      queryFn: async () => {
        throw new DOMException('Aborted', 'AbortError');
      },
    })).rejects.toThrow('Aborted');

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
