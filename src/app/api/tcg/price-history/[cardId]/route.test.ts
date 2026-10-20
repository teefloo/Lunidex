import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getNeonClient: vi.fn(), getTCGCardCached: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getNeonClient }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGCardCached: mocks.getTCGCardCached }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => true, ipKey: () => 'test' }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));

import { GET } from './route';

function requestHistory() {
  return GET(new NextRequest('https://lunidex.app/api/tcg/price-history/base1-4?days=30'), {
    params: Promise.resolve({ cardId: 'base1-4' }),
  });
}

describe('card price history safety', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getNeonClient.mockReturnValue(mocks.sql);
    mocks.getTCGCardCached.mockResolvedValue({ id: 'base1-4', name: 'Charizard', pricing: { cardmarket: { trend: 0.02 } } });
  });

  it('withholds historical prices whose language and finish cannot be identified', async () => {
    mocks.sql.mockResolvedValue([{ id: 1, card_id: 'base1-4', cardmarket_trend: '0.02', recorded_at: '2026-10-01T00:00:00Z' }]);

    const response = await requestHistory();

    expect(await response.json()).toEqual({ history: [], status: 'unqualified-history' });
    expect(mocks.sql).toHaveBeenCalledOnce();
    expect(mocks.sql.mock.calls[0][0].join(' ')).toMatch(/^\s*select\b/i);
    expect(mocks.getTCGCardCached).not.toHaveBeenCalled();
  });

  it('does not create a snapshot when there are no historical points', async () => {
    mocks.sql.mockResolvedValue([]);

    const response = await requestHistory();

    expect(await response.json()).toEqual({ history: [], status: 'empty' });
    expect(mocks.sql).toHaveBeenCalledOnce();
    expect(mocks.sql.mock.calls[0][0].join(' ')).toMatch(/^\s*select\b/i);
    expect(mocks.getTCGCardCached).not.toHaveBeenCalled();
  });

  it('preserves a usable unavailable response without cloud configuration', async () => {
    mocks.getNeonClient.mockReturnValue(null);

    const response = await requestHistory();

    expect(await response.json()).toEqual({ history: [], status: 'unavailable' });
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
