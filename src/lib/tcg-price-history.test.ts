import { describe, expect, it } from 'vitest';
import { getSafePriceHistoryResponse } from './tcg-price-history';

describe('legacy price history responses', () => {
  it('rejects older cached prices without a qualified series identity', () => {
    const result = getSafePriceHistoryResponse({ history: [{ card_id: 'base1-4', cardmarket_trend: 0.02 }] });
    expect(result).toEqual({ history: [], status: 'unqualified-history' });
  });

  it('never exposes values attached to an unqualified status', () => {
    const result = getSafePriceHistoryResponse({ status: 'unqualified-history', history: [{ cardmarket_trend: 123.63 }] });
    expect(result).toEqual({ history: [], status: 'unqualified-history' });
  });

  it.each(['empty', 'unavailable'] as const)('preserves the %s explanation', (status) => {
    expect(getSafePriceHistoryResponse({ status, history: [] })).toEqual({ history: [], status });
  });

  it('accepts a qualified series only when card, language, variant, source, metric, and currency are explicit', () => {
    const point = {
      id: 1,
      card_id: 'base1-4',
      set_id: 'base1',
      cardmarket_product_id: 1234,
      card_language: 'fr',
      variant: 'holo',
      source: 'tcgdex-cardmarket',
      metric: 'trend',
      currency: 'EUR',
      value: 123.45,
      source_observed_at: '2026-11-06T13:00:00.000Z',
      collected_at: '2026-11-06T13:01:00.000Z',
    };
    const result = getSafePriceHistoryResponse({ status: 'ready', history: [point, { ...point, id: 2, value: 120 }] });
    expect(result).toEqual({ status: 'ready', history: [point, { ...point, id: 2, value: 120 }] });
    expect(getSafePriceHistoryResponse({ status: 'ready', history: [point, { ...point, id: 2, currency: 'USD' }] }))
      .toEqual({ history: [], status: 'unqualified-history' });
    expect(getSafePriceHistoryResponse({ status: 'ready', history: [point, { ...point, id: 2, cardmarket_product_id: 5678 }] }))
      .toEqual({ history: [], status: 'unqualified-history' });
    expect(getSafePriceHistoryResponse({ status: 'ready', history: [point, { ...point, id: 2, set_id: 'other-set' }] }))
      .toEqual({ history: [], status: 'unqualified-history' });
  });
});
