import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getNeonClient: vi.fn(), refreshDuePriceHistoryCards: vi.fn(), reportSentryException: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getNeonClient }));
vi.mock('@/lib/tcg-price-history-refresh', () => ({ refreshDuePriceHistoryCards: mocks.refreshDuePriceHistoryCards }));
vi.mock('@/lib/sentry-observability', () => ({ reportSentryException: mocks.reportSentryException }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));

import { GET } from './route';

const previousSecret = process.env.CRON_SECRET;
const previousLunidexSecret = process.env.LUNIDEX_CRON_SECRET;

function request(authorization?: string) {
  return new NextRequest('https://lunidex.app/api/cron/metrics-retention', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('metrics retention cron price history refresh', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    delete process.env.LUNIDEX_CRON_SECRET;
    mocks.sql.mockResolvedValue([{ count: 0 }]);
    mocks.getNeonClient.mockReturnValue(mocks.sql);
    mocks.refreshDuePriceHistoryCards.mockResolvedValue({ attempted: 2, captured: 1, failed: 1 });
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
    if (previousLunidexSecret === undefined) delete process.env.LUNIDEX_CRON_SECRET;
    else process.env.LUNIDEX_CRON_SECRET = previousLunidexSecret;
  });

  it('requires the existing cron bearer secret', async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.getNeonClient).not.toHaveBeenCalled();
    expect(mocks.refreshDuePriceHistoryCards).not.toHaveBeenCalled();
  });

  it('runs the bounded refresh after authorizing and returns per-card results', async () => {
    const response = await GET(request('Bearer test-cron-secret'));

    expect(response.status).toBe(200);
    expect(mocks.refreshDuePriceHistoryCards).toHaveBeenCalledWith(mocks.sql);
    expect(await response.json()).toMatchObject({
      ok: true,
      priceHistoryRefresh: { attempted: 2, captured: 1, failed: 1 },
    });
  });

  it('accepts the self-hosted cron secret independently of the Edge Function secret name', async () => {
    delete process.env.CRON_SECRET;
    process.env.LUNIDEX_CRON_SECRET = 'test-lunidex-cron-secret';

    const response = await GET(request('Bearer test-lunidex-cron-secret'));

    expect(response.status).toBe(200);
  });

  it('keeps retention successful when the refresh claim fails', async () => {
    const error = new Error('Refresh target table unavailable');
    mocks.refreshDuePriceHistoryCards.mockRejectedValue(error);

    const response = await GET(request('Bearer test-cron-secret'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, priceHistoryRefreshUnavailable: true });
    expect(mocks.reportSentryException).toHaveBeenCalledWith(error, expect.objectContaining({
      operation: 'price-history-daily-refresh-claim',
      service: 'tcgdex-cardmarket',
    }));
  });
});
