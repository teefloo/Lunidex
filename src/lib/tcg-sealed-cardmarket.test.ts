import { describe, expect, it } from 'vitest';
import { parseSealedCardmarketFiles } from './tcg-sealed-cardmarket';

const now = new Date('2026-09-10T12:00:00.000Z');

function catalogue(products: unknown[], createdAt = '2026-09-09T06:00:00.000Z') {
  return { version: 1, createdAt, products };
}

function prices(priceGuides: unknown[], createdAt = '2026-09-09T07:00:00.000Z') {
  return { version: 1, createdAt, priceGuides };
}

function product(idProduct = 42, idCategory = 53) {
  return { idProduct, name: 'Display test', idCategory, categoryName: 'Display', idExpansion: 6569 };
}

function price(idProduct = 42, idCategory = 53) {
  return { idProduct, idCategory, avg: 30.125, low: 25, trend: 31.5, avg1: 30, avg7: null, avg30: 28 };
}

describe('Cardmarket sealed parser', () => {
  it('keeps sealed categories, normalizes euros to cents and drops raw payloads', () => {
    const parsed = parseSealedCardmarketFiles(
      catalogue([product(), { ...product(99, 1), name: 'Single card' }]),
      prices([price()]),
      now,
    );
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0]).toMatchObject({ cardmarketProductId: 42, expansionId: 6569, active: true });
    expect(parsed.prices[0].metrics).toMatchObject({ avgCents: 3013, trendCents: 3150, avg1Cents: 3000 });
    expect(parsed.prices[0].day).toBe('2026-09-10');
    expect(parsed.products[0]).not.toHaveProperty('raw');
  });

  it('rejects future publications, duplicates and category mismatches', () => {
    expect(() => parseSealedCardmarketFiles(catalogue([product()], '2026-09-11T00:00:00.000Z'), prices([price()]), now)).toThrow(/future/i);
    expect(() => parseSealedCardmarketFiles(catalogue([product(), product()]), prices([price()]), now)).toThrow(/duplicate/i);
    expect(() => parseSealedCardmarketFiles(catalogue([product()]), prices([price(42, 52)]), now)).toThrow(/mismatch/i);
  });

  it('requires at least one matching sealed price guide entry', () => {
    expect(() => parseSealedCardmarketFiles(catalogue([product()]), prices([price(100)]), now)).toThrow(/matching sealed/i);
  });
});
