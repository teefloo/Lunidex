import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  getNeonClient: vi.fn(),
  readJsonBody: vi.fn(),
  reportSentryException: vi.fn(),
}));

vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getNeonClient }));
vi.mock('@/lib/api/route-helpers', () => ({ readJsonBody: mocks.readJsonBody }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => true, trustedClientIp: () => '127.0.0.1' }));
vi.mock('@/lib/posthog-consent', () => ({ getProductMeasurementConsentFromCookie: () => 'granted' }));
vi.mock('@/lib/sentry-observability', () => ({ reportSentryException: mocks.reportSentryException }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));

import { POST } from './route';

describe('product analytics API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getNeonClient.mockReturnValue(mocks.sql);
    mocks.readJsonBody.mockResolvedValue({ event: 'tcg_first_value_reached' });
  });

  it('keeps the safe 503 response and captures the database exception', async () => {
    const error = new Error('Neon database is over quota');
    mocks.sql.mockRejectedValue(error);
    const request = new NextRequest('https://lunidex.test/api/analytics/product', {
      method: 'POST',
      headers: {
        origin: 'https://lunidex.test',
        host: 'lunidex.test',
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ event: 'tcg_first_value_reached' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.reportSentryException).toHaveBeenCalledWith(error, {
      feature: 'analytics',
      route: '/api/analytics/product',
      method: 'POST',
      operation: 'daily-metric-increment',
    });
  });
});
