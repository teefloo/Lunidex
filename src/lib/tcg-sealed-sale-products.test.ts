import { describe, expect, it } from 'vitest';
import type { SealedProduct } from '@primedex/core';
import { getSealedSaleProducts } from './tcg-sealed-sale-products';

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
