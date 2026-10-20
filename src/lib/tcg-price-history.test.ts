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
});
