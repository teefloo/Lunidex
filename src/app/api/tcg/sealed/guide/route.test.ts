import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ allowed: true, error: null as Error | null, payload: { index: { status: 'available' }, products: { status: 'available' }, series: { status: 'unavailable' } } }));
const mocks = vi.hoisted(() => ({ reportSentryException: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: () => ({}) }));
vi.mock('@/lib/rate-limit', () => ({ ipKey: () => 'test', rateLimit: () => state.allowed }));
vi.mock('@/lib/tcg-sealed-guide-server', () => ({ getPublicSealedGuide: async () => { if (state.error) throw state.error; return state.payload; } }));
vi.mock('@/lib/sentry-observability', () => ({ reportSentryException: mocks.reportSentryException }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_path: string, _feature: string, handler: unknown) => handler }));
import { GET } from './route';

beforeEach(() => { state.allowed = true; state.error = null; state.payload.index.status = 'available'; mocks.reportSentryException.mockReset(); });

describe('public sealed guide API', () => {
  it('shares only available global guide responses with a bounded cache age', async () => {
    const response = await GET(new NextRequest('https://lunidex.test/api/tcg/sealed/guide'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
    expect(await response.json()).toMatchObject({ index: { status: 'available' } });
  });

  it('does not cache unavailable or rate-limited responses', async () => {
    state.payload.index.status = 'unavailable';
    const unavailable = await GET(new NextRequest('https://lunidex.test/api/tcg/sealed/guide'));
    expect(unavailable.headers.get('Cache-Control')).toBe('public, no-store');
    state.allowed = false;
    const limited = await GET(new NextRequest('https://lunidex.test/api/tcg/sealed/guide'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('captures the database exception while keeping the unavailable response generic', async () => {
    const error = new Error('Neon database is over quota');
    state.error = error;

    const response = await GET(new NextRequest('https://lunidex.test/api/tcg/sealed/guide'));

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ error: 'Sealed guide unavailable.' });
    expect(mocks.reportSentryException).toHaveBeenCalledWith(error, {
      feature: 'tcg-sealed',
      route: '/api/tcg/sealed/guide',
      method: 'GET',
      operation: 'guide-read',
    });
  });
});
