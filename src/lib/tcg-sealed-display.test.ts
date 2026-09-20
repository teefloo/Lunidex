import { describe, expect, it } from 'vitest';
import type { SealedTransaction } from '@primedex/core';
import { formatSealedExchangeSummary, getSealedTransactionProductIds } from './tcg-sealed-display';

describe('sealed exchange display helpers', () => {
  it('formats both legs in the journal shape', () => {
    expect(formatSealedExchangeSummary({
      kind: 'exchange',
      quantity: 1,
      cardmarketProductId: 200,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    }, new Map([
      [100, 'ETB ME04'],
      [200, 'ETB ME03'],
    ]))).toBe('1 × ETB ME04 → 1 × ETB ME03');
  });

  it('returns null for non-exchanges and falls back to product ids', () => {
    expect(formatSealedExchangeSummary({
      kind: 'buy',
      quantity: 1,
      cardmarketProductId: 200,
    }, new Map())).toBeNull();
    expect(formatSealedExchangeSummary({
      kind: 'exchange',
      quantity: 2,
      cardmarketProductId: 200,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 3 },
    }, new Map())).toBe('3 × #100 → 2 × #200');
  });

  it('returns received then given product ids without duplicates', () => {
    const exchange = {
      kind: 'exchange',
      cardmarketProductId: 200,
      exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
    } as unknown as SealedTransaction;
    expect(getSealedTransactionProductIds(exchange)).toEqual([200, 100]);
    expect(getSealedTransactionProductIds({
      ...exchange,
      exchangeGive: { cardmarketProductId: 200, language: 'fr', quantity: 1 },
    })).toEqual([200]);
    expect(getSealedTransactionProductIds({
      ...exchange,
      kind: 'buy',
      exchangeGive: undefined,
    })).toEqual([200]);
  });
});
