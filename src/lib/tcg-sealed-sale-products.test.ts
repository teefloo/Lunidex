import { describe, expect, it } from 'vitest';
import type { SealedProduct, SealedProductLanguage } from '@primedex/core';
import { getSealedExchangeProducts, getSealedSaleProducts } from './tcg-sealed-sale-products';

function product(cardmarketProductId: number, name: string): SealedProduct {
  return {
    cardmarketProductId,
    name,
    categoryId: 53,
    categoryName: 'Display',
    expansionId: 6569,
    cardmarketUrl: `https://www.cardmarket.com/fr/Pokemon/Products?idProduct=${cardmarketProductId}`,
    imageAvailable: true,
    sourceAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
    active: true,
  };
}

describe('sealed sale product candidates', () => {
  it('keeps only products with stock and aggregates duplicate positions', () => {
    const display = product(100, 'Display Nuit Noire');
    const booster = product(200, 'Booster Nuit Noire');

    expect(getSealedSaleProducts([
      { product: display, quantity: 2 },
      { product: booster, quantity: 0 },
      { product: display, quantity: 3 },
      { product: product(300, 'Épuisé'), quantity: -1 },
    ])).toEqual([
      { product: display, availableQuantity: 5 },
    ]);
  });

  it('returns an empty list when no position can be sold', () => {
    expect(getSealedSaleProducts([
      { product: product(100, 'Épuisé'), quantity: 0 },
    ])).toEqual([]);
  });
});

describe('sealed exchange product candidates', () => {
  it('keeps exchange source candidates distinct by product and language', () => {
    const display = product(100, 'ETB ME04');
    expect(getSealedExchangeProducts([
      { product: display, language: 'fr', quantity: 1 },
      { product: display, language: 'en', quantity: 2 },
      { product: product(200, 'Empty'), language: 'fr', quantity: 0 },
      { product: display, language: 'fr', quantity: 3 },
    ])).toEqual([
      { product: display, language: 'fr', availableQuantity: 4 },
      { product: display, language: 'en', availableQuantity: 2 },
    ]);
  });

  it('ignores non-positive and unsafe source quantities', () => {
    const languages: SealedProductLanguage[] = ['fr'];
    expect(getSealedExchangeProducts([
      { product: product(100, 'Empty'), language: languages[0], quantity: 0 },
      { product: product(200, 'Negative'), language: languages[0], quantity: -1 },
      { product: product(300, 'Unsafe'), language: languages[0], quantity: Number.MAX_SAFE_INTEGER + 1 },
    ])).toEqual([]);
  });
});
