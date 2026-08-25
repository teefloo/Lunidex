import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => mockSql,
}));

import { GET } from './route';

function request(): NextRequest {
  return new NextRequest('https://lunidex.test/api/cron/metrics-retention');
}

const originalSecret = process.env.CRON_SECRET;

describe('metrics retention cron', () => {
  beforeEach(() => {
    mockSql.mockReset();
    process.env.CRON_SECRET = originalSecret;
  });

  it('is disabled when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('rejects requests without the bearer secret', async () => {
    process.env.CRON_SECRET = 'cron-secret';

    expect((await GET(request())).status).toBe(401);
    expect(
      (
        await GET(
          new NextRequest('https://lunidex.test/api/cron/metrics-retention', {
            headers: { authorization: 'Bearer wrong' },
          }),
        )
      ).status,
    ).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('expires stale attempts, trims history, and reports counts', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    mockSql
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    const authorized = new NextRequest('https://lunidex.test/api/cron/metrics-retention', {
      headers: { authorization: 'Bearer cron-secret' },
    });
    const response = await GET(authorized);

    await expect(response.json()).resolves.toEqual({
      ok: true,
      expiredQuizAttempts: 2,
      deletedPriceHistoryRows: 1,
      deletedDailyMetricsDays: 0,
    });
    const firstQuery = mockSql.mock.calls[0][0].join(' ? ');
    expect(firstQuery).toContain('with expired as');
    expect(firstQuery).toContain("set status = 'expired'");
    expect(mockSql.mock.calls[1][0].join(' ? ')).toContain('delete from public.tcg_price_history');
  });
});
