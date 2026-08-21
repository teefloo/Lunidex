import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockSql = vi.hoisted(() => vi.fn());
const mockGetTCGCardCached = vi.hoisted(() => vi.fn());
const mockGetNeonClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: mockGetNeonClient,
}));

vi.mock('../../../../../lib/api/server-cache', () => ({
  getTCGCardCached: mockGetTCGCardCached,
}));

import { GET } from './route';

const CARD_ID = 'me05-001';

function request(days = 30) {
  return new NextRequest(
    `https://lunidex.test/api/tcg/price-history/${CARD_ID}?days=${days}`,
  );
}

function sqlResult(rows: unknown[]) {
  return Promise.resolve(rows);
}

describe('TCG price history API', () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockGetTCGCardCached.mockReset();
    mockGetNeonClient.mockReset().mockReturnValue(mockSql);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records a real snapshot when the table is empty for this card', async () => {
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      const query = strings.join('');
      if (query.includes('from public.tcg_price_history') && query.includes('order by recorded_at desc')) {
        return sqlResult([]);
      }
      if (query.includes('from public.tcg_price_history')) {
        return sqlResult([
          {
            id: 1,
            card_id: CARD_ID,
            card_name: 'Pikachu',
            set_id: 'me05',
            tcgplayer_low: 4.5,
            tcgplayer_mid: 6,
            tcgplayer_high: 9.2,
            cardmarket_avg: 5.1,
            cardmarket_low: 4.8,
            cardmarket_trend: 5.4,
            recorded_at: new Date().toISOString(),
          },
        ]);
      }
      return sqlResult([]);
    });

    mockGetTCGCardCached.mockResolvedValue({
      id: CARD_ID,
      name: 'Pikachu',
      set: { id: 'me05' },
      pricing: {
        tcgplayer: {
          holofoil: { lowPrice: 4.5, midPrice: 6, highPrice: 9.2 },
        },
        cardmarket: { avg: 5.1, low: 4.8, trend: 5.4 },
      },
    });

    const response = await GET(request(), {
      params: Promise.resolve({ cardId: CARD_ID }),
    });
    const body = await response.json();

    expect(mockSql).toHaveBeenCalledTimes(3);
    expect(body.history).toHaveLength(1);
    expect(body.history[0].tcgplayer_mid).toBe(6);
  });

  it('skips recording when a recent snapshot already exists', async () => {
    const now = new Date().toISOString();
    mockSql.mockImplementation(() => sqlResult([{ recorded_at: now }]));

    await GET(request(), { params: Promise.resolve({ cardId: CARD_ID }) });

    expect(mockSql).toHaveBeenCalledTimes(2);
    expect(mockGetTCGCardCached).not.toHaveBeenCalled();
  });

  it('returns an empty history when Neon is not configured', async () => {
    mockGetNeonClient.mockReturnValueOnce(null);

    const response = await GET(request(), {
      params: Promise.resolve({ cardId: CARD_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ history: [] });
  });
});
