import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ error: null as Error | null, sqlConfigured: true }));
const telemetry = vi.hoisted(() => ({
  reportSentryException: vi.fn(),
  reportHttpFailure: vi.fn(),
  flushSentryEvents: vi.fn().mockResolvedValue(undefined),
  capturePostHogServerException: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => state.sqlConfigured ? {} : null,
}));
vi.mock('@/lib/rate-limit', () => ({ ipKey: () => 'test', rateLimit: () => true }));
vi.mock('@/lib/tcg-sealed-server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tcg-sealed-server')>();
  return {
    ...actual,
    getSealedImageUrl: async () => {
      if (state.error) throw state.error;
      return [];
    },
  };
});
vi.mock('@/lib/sentry-observability', () => ({
  reportSentryException: telemetry.reportSentryException,
  reportHttpFailure: telemetry.reportHttpFailure,
  flushSentryEvents: telemetry.flushSentryEvents,
}));
vi.mock('@/lib/posthog-server', () => ({ capturePostHogServerException: telemetry.capturePostHogServerException }));

import { SealedNotFoundError } from '@/lib/tcg-sealed-server';
import { GET } from './route';

beforeEach(() => {
  state.error = null;
  state.sqlConfigured = true;
  vi.clearAllMocks();
});

describe('sealed product image API', () => {
  it('reports the original unexpected exception once and keeps the client response generic', async () => {
    const error = new Error('private database failure detail');
    state.error = error;

    const response = await GET(
      new NextRequest('https://lunidex.test/api/tcg/sealed/products/42/image'),
      { params: Promise.resolve({ id: '42' }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'The sealed portfolio request failed.' });
    expect(telemetry.reportSentryException).toHaveBeenCalledTimes(1);
    expect(telemetry.reportSentryException).toHaveBeenCalledWith(error, {
      feature: 'tcg-sealed',
      route: '/api/tcg/sealed/products/:id/image',
      method: 'GET',
      operation: 'image-read',
    });
    expect(telemetry.reportHttpFailure).not.toHaveBeenCalled();
    expect(telemetry.flushSentryEvents).toHaveBeenCalledTimes(1);
  });

  it('keeps expected missing-image responses as 404s without reporting them as exceptions', async () => {
    state.error = new SealedNotFoundError('Sealed product image not found.');

    const response = await GET(
      new NextRequest('https://lunidex.test/api/tcg/sealed/products/42/image'),
      { params: Promise.resolve({ id: '42' }) },
    );

    expect(response.status).toBe(404);
    expect(telemetry.reportSentryException).not.toHaveBeenCalled();
    expect(telemetry.reportHttpFailure).not.toHaveBeenCalled();
  });

  it('preserves the Sentry unavailable report when Neon is not configured', async () => {
    state.sqlConfigured = false;

    const response = await GET(
      new NextRequest('https://lunidex.test/api/tcg/sealed/products/42/image'),
      { params: Promise.resolve({ id: '42' }) },
    );

    expect(response.status).toBe(503);
    expect(telemetry.reportSentryException).not.toHaveBeenCalled();
    expect(telemetry.reportHttpFailure).toHaveBeenCalledTimes(1);
  });
});
