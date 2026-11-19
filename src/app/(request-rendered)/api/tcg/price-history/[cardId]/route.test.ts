import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getNeonClient: vi.fn(), getTCGCardLocalizedCached: vi.fn(), reportSentryException: vi.fn() }));
vi.mock('@/lib/neon/server', () => ({ getNeonClient: mocks.getNeonClient }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGCardLocalizedCached: mocks.getTCGCardLocalizedCached }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => true, ipKey: () => 'test' }));
vi.mock('@/lib/sentry-observability', () => ({ reportSentryException: mocks.reportSentryException }));
vi.mock('@/lib/api/observed-route', () => ({ withObservedRouteHandler: (_route: string, _feature: string, handler: unknown) => handler }));

import { GET, POST } from './route';

const context = { params: Promise.resolve({ cardId: 'base1-4' }) };
const sourceCard = {
  id: 'base1-4', localId: '4', name: 'Charizard', set: { id: 'base1', name: 'Base' },
  variants: { normal: true, holo: true, reverse: true },
  pricing: { cardmarket: { unit: 'EUR', updated: '2026-11-06T13:00:00.000Z', idProduct: 1234, trend: 0.25, 'trend-holo': 125.5 } },
};

function requestHistory(overrides: Record<string, string> = {}) {
  const params = new URLSearchParams({ days: '30', language: 'fr', variant: 'normal', ...overrides });
  return GET(new NextRequest(`https://lunidex.app/api/tcg/price-history/base1-4?${params}`), context);
}

function requestCapture(body: unknown = { language: 'fr' }) {
  return POST(new NextRequest('https://lunidex.app/api/tcg/price-history/base1-4', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), context);
}

describe('qualified card price history route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getNeonClient.mockReturnValue(mocks.sql);
    mocks.getTCGCardLocalizedCached.mockResolvedValue(sourceCard);
  });

  it('returns a single exact qualified series with no public caching', async () => {
    mocks.sql.mockResolvedValue([
      { id: 1, card_id: 'base1-4', set_id: 'base1', card_language: 'fr', cardmarket_product_id: 1234, variant: 'normal', source: 'tcgdex-cardmarket', metric: 'trend', currency: 'EUR', value: '0.25', source_observed_at: '2026-11-05T13:00:00.000Z', collected_at: '2026-11-05T13:01:00.000Z' },
      { id: 2, card_id: 'base1-4', set_id: 'base1', card_language: 'fr', cardmarket_product_id: 1234, variant: 'normal', source: 'tcgdex-cardmarket', metric: 'trend', currency: 'EUR', value: '0.3', source_observed_at: '2026-11-06T13:00:00.000Z', collected_at: '2026-11-06T13:01:00.000Z' },
    ]);

    const response = await requestHistory();

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ status: 'ready', history: [{ value: 0.25 }, { value: 0.3 }] });
    expect(mocks.sql).toHaveBeenCalledOnce();
    expect(mocks.sql.mock.calls[0][0].join(' ')).toContain('latest_identity');
    expect(mocks.sql.mock.calls[0][0].join(' ')).toContain('market_language_scope =');
    expect(mocks.getTCGCardLocalizedCached).not.toHaveBeenCalled();
  });

  it('keeps a one-point history unavailable for charting', async () => {
    mocks.sql.mockResolvedValue([{ id: 1, card_id: 'base1-4', set_id: 'base1', card_language: 'fr', cardmarket_product_id: 1234, variant: 'normal', source: 'tcgdex-cardmarket', metric: 'trend', currency: 'EUR', value: '0.25', source_observed_at: '2026-11-06T13:00:00.000Z', collected_at: '2026-11-06T13:01:00.000Z' }]);
    const response = await requestHistory();
    expect(await response.json()).toMatchObject({ status: 'insufficient-data', history: [{ value: 0.25 }] });
  });

  it('does not combine points after the Cardmarket product or set identity changes', async () => {
    mocks.sql.mockResolvedValue([
      { id: 1, card_id: 'base1-4', set_id: 'old-set', card_language: 'fr', cardmarket_product_id: 111, variant: 'normal', source: 'tcgdex-cardmarket', metric: 'trend', currency: 'EUR', value: '0.25', source_observed_at: '2026-11-05T13:00:00.000Z', collected_at: '2026-11-05T13:01:00.000Z' },
      { id: 2, card_id: 'base1-4', set_id: 'new-set', card_language: 'fr', cardmarket_product_id: 222, variant: 'normal', source: 'tcgdex-cardmarket', metric: 'trend', currency: 'EUR', value: '0.3', source_observed_at: '2026-11-06T13:00:00.000Z', collected_at: '2026-11-06T13:01:00.000Z' },
    ]);

    const response = await requestHistory();
    const payload = await response.json();

    expect(payload).toMatchObject({ status: 'insufficient-data', history: [expect.objectContaining({ cardmarket_product_id: 222, set_id: 'new-set' })] });
    expect(payload.history).toHaveLength(1);
  });

  it('explains legacy points without exposing their unqualified values', async () => {
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ present: 1 }]);
    const response = await requestHistory();
    expect(await response.json()).toEqual({ history: [], status: 'unqualified-history' });
    expect(mocks.sql).toHaveBeenCalledTimes(2);
  });

  it('returns empty when no qualified or legacy points exist', async () => {
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const response = await requestHistory();
    expect(await response.json()).toEqual({ history: [], status: 'empty' });
  });

  it('rejects invalid language, variant, and range values', async () => {
    expect((await requestHistory({ language: 'xx' })).status).toBe(400);
    expect((await requestHistory({ variant: 'reverse-holofoil' })).status).toBe(400);
    expect((await requestHistory({ days: '365' })).status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('captures only metric and finish pairs actually returned by the source', async () => {
    mocks.sql.mockResolvedValue([{ id: 88 }]);
    const response = await requestCapture();
    expect(await response.json()).toMatchObject({ captured: 2, variants: ['normal', 'holo'], status: 'captured' });
    expect(mocks.sql).toHaveBeenCalledTimes(3);
    const statements = mocks.sql.mock.calls.map((call) => call[0].join(' '));
    expect(statements[0]).toContain('tcg_price_history_refresh_targets');
    const captureStatements = statements.filter((statement: string) => statement.includes('tcg_price_history_qualified'));
    expect(captureStatements.every((statement: string) => statement.includes('on conflict'))).toBe(true);
    expect(captureStatements.every((statement: string) => statement.includes('cardmarket_product_id, set_id, variant'))).toBe(true);
    expect(mocks.sql.mock.calls.slice(1).map((call) => call[5])).toEqual(['normal', 'holo']);
    expect(mocks.getTCGCardLocalizedCached).toHaveBeenCalledWith('base1-4', 'fr');
  });

  it('does not duplicate an already-current daily observation', async () => {
    mocks.sql.mockResolvedValue([]);
    const response = await requestCapture();
    expect(await response.json()).toMatchObject({ captured: 0, variants: ['normal', 'holo'], status: 'already-current' });
    expect(mocks.sql).toHaveBeenCalledTimes(3);
  });

  it('does not capture when source timestamp or exact metric is missing', async () => {
    mocks.getTCGCardLocalizedCached.mockResolvedValue({ ...sourceCard, pricing: { cardmarket: { ...sourceCard.pricing.cardmarket, updated: 'invalid', 'trend-reverse-holo': 10 } } });
    const response = await requestCapture();
    expect(await response.json()).toEqual({ captured: 0, variants: [], status: 'empty' });
    expect(mocks.sql).toHaveBeenCalledOnce();
    expect(mocks.sql.mock.calls[0][0].join(' ')).toContain('tcg_price_history_refresh_targets');
  });

  it('validates the card language before touching the source or database', async () => {
    const response = await requestCapture({ language: 'xx' });
    expect(response.status).toBe(400);
    expect(mocks.getTCGCardLocalizedCached).not.toHaveBeenCalled();
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('does not label an English fallback as a French printing when the localized card is unavailable', async () => {
    mocks.getTCGCardLocalizedCached.mockRejectedValue(new Error('Localized TCG card details are unavailable for base1-4'));

    const response = await requestCapture();

    expect(await response.json()).toEqual({ captured: 0, variants: [], status: 'unavailable' });
    expect(mocks.getTCGCardLocalizedCached).toHaveBeenCalledWith('base1-4', 'fr');
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('reports Neon capture errors and leaves the request gracefully unavailable', async () => {
    const error = new Error('Neon connection failed');
    mocks.sql.mockRejectedValue(error);

    const response = await requestCapture();

    expect(await response.json()).toEqual({ captured: 0, variants: [], status: 'unavailable' });
    expect(mocks.reportSentryException).toHaveBeenCalledWith(error, {
      feature: 'tcg',
      route: '/api/tcg/price-history/:id',
      method: 'POST',
      operation: 'price-history-capture',
    });
  });

  it('keeps a graceful unavailable response without Neon', async () => {
    mocks.getNeonClient.mockReturnValue(null);
    expect(await (await requestHistory()).json()).toEqual({ history: [], status: 'unavailable' });
    expect(await (await requestCapture()).json()).toMatchObject({ captured: 0, variants: [], status: 'unavailable' });
  });
});
