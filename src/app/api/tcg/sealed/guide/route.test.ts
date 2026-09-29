import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ allowed: true, payload: { index: { status: 'available' }, products: { status: 'available' }, series: { status: 'unavailable' } } }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: () => ({}) }));
vi.mock('@/lib/rate-limit', () => ({ ipKey: () => 'test', rateLimit: () => state.allowed }));
vi.mock('@/lib/tcg-sealed-guide-server', () => ({ getPublicSealedGuide: async () => state.payload }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_path: string, _feature: string, handler: unknown) => handler }));
import { GET } from './route';

beforeEach(() => { state.allowed = true; state.payload.index.status = 'available'; });

describe('public sealed guide API', () => {
  it('shares only available global guide responses with a bounded cache age', async () => {
    const response = await GET(new NextRequest('https://lunidex.test/api/tcg/sealed/guide'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
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
});
