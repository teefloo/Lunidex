import { describe, expect, it } from 'vitest';
import { getSealedCardmarketUrl } from '@primedex/core/lib/sealed-catalogue';
import { getSealedProductCardmarketUrl } from './tcg-sealed-marketplace';

describe('getSealedProductCardmarketUrl', () => {
  it('keeps the canonical French product URL for the exact Cardmarket ID', () => {
    const product = { cardmarketProductId: 1842, cardmarketUrl: getSealedCardmarketUrl(1842) };

    expect(getSealedProductCardmarketUrl(product)).toBe(
      'https://www.cardmarket.com/fr/Pokemon/Products?idProduct=1842',
    );
  });

  it.each([
    { cardmarketProductId: 1842, cardmarketUrl: 'https://www.cardmarket.com/fr/Pokemon/Products?idProduct=9999' },
    { cardmarketProductId: 1842, cardmarketUrl: 'https://www.cardmarket.com/en/Pokemon/Products?idProduct=1842' },
    { cardmarketProductId: 0, cardmarketUrl: getSealedCardmarketUrl(0) },
    { cardmarketProductId: 1842, cardmarketUrl: 'https://www.cardmarket.com/fr/Pokemon/Search?searchString=ETB' },
  ])('rejects a URL that cannot be trusted for this product', (product) => {
    expect(getSealedProductCardmarketUrl(product)).toBeNull();
  });
});
