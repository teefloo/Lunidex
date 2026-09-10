import { describe, expect, it } from 'vitest';
import { getCardmarketProductId, getCardmarketProductUrl } from './tcg-marketplace';

describe('getCardmarketProductUrl', () => {
  it('targets the exact localized Cardmarket product route', () => {
    const url = new URL(getCardmarketProductUrl({
      variants_detailed: [{
        type: 'normal',
        thirdParty: { cardmarket: 895789 },
      }],
    }, 'fr')!);

    expect(url.origin).toBe('https://www.cardmarket.com');
    expect(url.pathname).toBe('/fr/Pokemon/Products');
    expect(url.searchParams.get('idProduct')).toBe('895789');
  });

  it('prefers an unmarked standard printing over special variants', () => {
    expect(getCardmarketProductId({
      variants_detailed: [
        { type: 'reverse', foil: 'energy', thirdParty: { cardmarket: 895790 } },
        { type: 'normal', thirdParty: { cardmarket: 895789 } },
      ],
    })).toBe(895789);
  });

  it('falls back to the pricing product id and English for unsupported locales', () => {
    const url = new URL(getCardmarketProductUrl({
      pricing: { cardmarket: { idProduct: 895789 } },
    }, 'ja')!);

    expect(url.pathname).toBe('/en/Pokemon/Products');
    expect(url.searchParams.get('idProduct')).toBe('895789');
  });

  it('does not create a misleading search fallback when no product id exists', () => {
    expect(getCardmarketProductUrl({ pricing: {} }, 'fr')).toBeNull();
  });
});
