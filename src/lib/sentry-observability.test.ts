import * as Sentry from '@sentry/nextjs';
import * as idbKeyval from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAppApi } from './app-api';
import { getCachedData } from './api/cache';
import { graphqlClient } from './api/client';
import { getPokemonSummarySlice } from './api/graphql';
import {
  attachAxiosSentryInstrumentation,
  normalizeSentryRoute,
  reportSentryException,
  reportSentryMessage,
  resetSentryDeduplicationForTests,
  sanitizeSentryContext,
  shouldIgnoreHttpFailure,
} from './sentry-observability';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback: (scope: { setTag: () => void; setContext: () => void }) => void) => {
    callback({ setTag: vi.fn(), setContext: vi.fn() });
  }),
}));

vi.mock('@/lib/neon/client', () => ({
  getNeonAccessToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
}));

describe('sentry observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryDeduplicationForTests();
  });

  it('ignores expected HTTP statuses, cancellations, and empty searches', () => {
    expect(shouldIgnoreHttpFailure({ status: 404 })).toBe(true);
    expect(shouldIgnoreHttpFailure({ status: 409 })).toBe(true);
    expect(shouldIgnoreHttpFailure({ status: 500 })).toBe(false);
    expect(shouldIgnoreHttpFailure({ error: new DOMException('Aborted', 'AbortError') })).toBe(true);
    expect(shouldIgnoreHttpFailure({ operation: 'search', emptyResult: true })).toBe(true);
  });

  it('normalizes routes and removes sensitive context values', () => {
    expect(normalizeSentryRoute('/fr/pokemon/pikachu?token=secret#details')).toBe('/pokemon/:name');
    expect(normalizeSentryRoute('https://api.tcgdex.net/v2/en/cards/base-1?token=secret')).toBe('/v2/en/cards/:id');

    expect(sanitizeSentryContext({
      feature: 'profile',
      route: '/api/profile?email=user@example.com',
      method: 'POST',
      status: 500,
      token: 'secret',
      displayName: 'Ash',
      body: { name: 'Ash', email: 'user@example.com' },
    } as never)).toEqual({
      feature: 'profile',
      route: '/api/profile',
      method: 'POST',
      status: 500,
    });
  });

  it('deduplicates the same report while keeping different features distinct', () => {
    reportSentryMessage('API failure', { feature: 'pokemon', route: '/pokemon/:name', status: 503 });
    reportSentryMessage('API failure', { feature: 'pokemon', route: '/pokemon/:name', status: 503 });
    reportSentryMessage('API failure', { feature: 'tcg', route: '/tcg/cards/:id', status: 503 });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(2);
  });

  it('sanitizes direct exceptions before handing them to Sentry', () => {
    reportSentryException(
      new Error('Request failed for user@example.com with token=private'),
      { feature: 'profile', route: '/api/profile' },
    );

    const [captured] = vi.mocked(Sentry.captureException).mock.calls[0] ?? [];
    expect(captured).toBeInstanceOf(Error);
    expect(String(captured)).not.toContain('user@example.com');
    expect(String(captured)).not.toContain('private');
  });

  it('reports server failures from application API responses without reading the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('private response body', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchAppApi('/api/profile', { method: 'GET' }, { feature: 'profile' });

    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('does not report expected application API responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAppApi('/api/tcg/cards/missing', { method: 'GET' }, { feature: 'tcg' });

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('reports final Axios transport failures without serializing the request config', async () => {
    const rejectionHandlers: Array<(error: unknown) => Promise<never>> = [];
    const client = {
      interceptors: {
        response: {
          use: vi.fn((_success, failure: (error: unknown) => Promise<never>) => {
            rejectionHandlers.push(failure);
          }),
        },
      },
    };

    attachAxiosSentryInstrumentation(client as never, { feature: 'pokemon', service: 'pokeapi' });
    const error = Object.assign(new Error('upstream failed'), {
      response: { status: 502, data: { secret: 'private' } },
      config: { url: '/pokemon/pikachu?token=secret', data: { name: 'Ash' }, headers: { Authorization: 'Bearer secret' } },
    });

    await expect(rejectionHandlers[0]?.(error)).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('reports stale cache fallbacks without including cached data', async () => {
    vi.stubGlobal('window', { indexedDB: {} });
    vi.mocked(idbKeyval.get).mockResolvedValue({
      data: { secret: 'private payload' },
      timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000),
    });

    await expect(getCachedData('tcg-card-secret', true)).resolves.toEqual({ secret: 'private payload' });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Lunidex fallback: stale-cache', 'warning');
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain('private payload');
  });

  it('reports invalid GraphQL responses without embedding the response payload', async () => {
    vi.spyOn(graphqlClient, 'post').mockResolvedValue({
      data: { data: { secret: 'private payload' } },
    } as never);

    await expect(getPokemonSummarySlice()).rejects.toThrow('Invalid GraphQL response');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Lunidex fallback: invalid-response', 'warning');
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain('private payload');
  });
});
