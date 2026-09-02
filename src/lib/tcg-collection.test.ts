import { describe, expect, it } from 'vitest';
import {
  aggregateCollectionValueWithVariants,
  getCardMarketValue,
  getTCGValueInCurrency,
  getTCGVariantValue,
  toCollectionCard,
} from './tcg-collection';
import type { TCGCard } from '@/types/tcg';

const baseCard: TCGCard = {
  id: 'base1-001',
  localId: '001',
  name: 'Bulbasaur',
  set: { id: 'base1', name: 'Base Set' },
  variants: { firstEdition: false, holo: true, normal: true, reverse: true, wPromo: false },
};

describe('TCG physical variant pricing', () => {
  it('resolves each variant from its exact provider fields and rejects zero quotes', () => {
    const card: TCGCard = {
      ...baseCard,
      pricing: {
        cardmarket: { unit: 'EUR', trend: 1.25, 'trend-holo': 4.5 },
        tcgplayer: {
          unit: 'USD',
          normal: { marketPrice: 2.5 },
          holofoil: { marketPrice: 5.5 },
          'reverse-holofoil': { marketPrice: 3.25 },
        },
      },
    };
    expect(getTCGVariantValue(card, 'normal')).toEqual({ amount: 1.25, currency: 'EUR' });
    expect(getTCGVariantValue(card, 'holo')).toEqual({ amount: 4.5, currency: 'EUR' });
    expect(getTCGVariantValue(card, 'reverse')).toEqual({ amount: 3.25, currency: 'USD' });
    expect(getTCGVariantValue({ ...card, pricing: { tcgplayer: { normal: { marketPrice: 0 } } } }, 'normal')).toBeNull();
    expect(getTCGVariantValue({ ...card, pricing: { tcgplayer: { reverse: { marketPrice: 1.75 } } } }, 'reverse')).toEqual({ amount: 1.75, currency: 'USD' });
    expect(getTCGVariantValue({ ...card, pricing: { cardmarket: { unit: 'EUR' }, tcgplayer: { normal: { marketPrice: 2.25 } } } }, 'normal')).toEqual({ amount: 2.25, currency: 'USD' });
    expect(getTCGVariantValue(card, 'normal', 'USD')).toEqual({ amount: 2.5, currency: 'USD' });
    expect(getTCGVariantValue(card, 'reverse', 'EUR')).toBeNull();
    expect(getCardMarketValue(card, 'USD')).toEqual({ amount: 2.5, currency: 'USD' });
    expect(getTCGValueInCurrency({ amount: 1, currency: 'EUR' }, 'USD')).toBeNull();
  });

  it('uses the exact pricing block from TCGdex variants_detailed', () => {
    const card: TCGCard = {
      ...baseCard,
      pricing: {
        cardmarket: { unit: 'EUR', trend: 0.03, 'trend-holo': 0 },
        tcgplayer: {
          unit: 'USD',
          normal: { marketPrice: 0.08 },
          'reverse-holofoil': { marketPrice: 0.17 },
          holofoil: { marketPrice: 4.58 },
        },
      },
      variants_detailed: [
        {
          type: 'Normal',
          pricing: { cardmarket: { unit: 'EUR', trend: 0.03 } },
        },
        {
          type: 'Reverse',
          pricing: { tcgplayer: { unit: 'USD', 'reverse-holofoil': { marketPrice: 0.17 } } },
        },
        {
          type: 'Holo',
          pricing: {
            cardmarket: { unit: 'EUR', trend: 25.53, 'trend-holo': 0 },
            tcgplayer: { unit: 'USD', holofoil: { marketPrice: 35.21 } },
          },
        },
      ],
    };

    expect(getTCGVariantValue(card, 'normal')).toEqual({ amount: 0.03, currency: 'EUR' });
    expect(getTCGVariantValue(card, 'reverse')).toEqual({ amount: 0.17, currency: 'USD' });
    expect(getTCGVariantValue(card, 'holo')).toEqual({ amount: 25.53, currency: 'EUR' });
  });

  it('multiplies quantities, groups currencies, and exposes unpriced variants', () => {
    const priced = toCollectionCard({
      ...baseCard,
      pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 2 }, 'reverse-holofoil': { marketPrice: 3 } } },
    });
    const unpriced = toCollectionCard({ ...baseCard, id: 'base1-002', localId: '002' });
    const result = aggregateCollectionValueWithVariants([
      priced,
      unpriced,
    ], [
      { cardId: 'base1-001', variant: 'normal', quantity: 2 },
      { cardId: 'base1-001', variant: 'reverse', quantity: 3 },
      { cardId: 'base1-002', variant: 'holo', quantity: 1 },
    ]);
    expect(result.groups).toEqual([{ currency: 'USD', total: 13, count: 5 }]);
    expect(result.ownedCount).toBe(6);
    expect(result.pricedCount).toBe(5);
    expect(result.unpricedCount).toBe(1);
    expect(result.bySet.base1.groups[0]).toEqual({ currency: 'USD', total: 13, count: 5 });
    expect(result.bySet.base1.ownedCount).toBe(6);
  });

  it('keeps unspecified ownership unpriced and never mixes currencies', () => {
    const card = toCollectionCard({
      ...baseCard,
      pricing: {
        cardmarket: { unit: 'EUR', trend: 2 },
        tcgplayer: { unit: 'USD', normal: { marketPrice: 3 } },
      },
    });
    const result = aggregateCollectionValueWithVariants([card], [
      { cardId: card.id, variant: 'unspecified', quantity: 2 },
      { cardId: card.id, variant: 'normal', quantity: 1 },
    ]);
    expect(result.groups).toEqual([{ currency: 'EUR', total: 2, count: 1 }]);
    expect(result.ownedCount).toBe(3);
    expect(result.pricedCount).toBe(1);
    expect(result.unpricedCount).toBe(2);
  });

  it('infers the only declared finish for unspecified ownership', () => {
    const card = toCollectionCard({
      ...baseCard,
      variants: { firstEdition: false, holo: true, normal: false, reverse: false, wPromo: false },
      pricing: {
        cardmarket: { unit: 'EUR', trend: 25.53, 'trend-holo': 0 },
      },
      variants_detailed: [
        {
          type: 'Holo',
          pricing: { cardmarket: { unit: 'EUR', trend: 25.53, 'trend-holo': 0 } },
        },
      ],
    });
    const result = aggregateCollectionValueWithVariants([card], [
      { cardId: card.id, variant: 'unspecified', quantity: 1 },
    ], 'EUR');

    expect(result.groups).toEqual([{ currency: 'EUR', total: 25.53, count: 1 }]);
    expect(result.pricedCount).toBe(1);
    expect(result.unpricedCount).toBe(0);
  });

  it('does not invent a price for a variant explicitly absent from the card', () => {
    const card = toCollectionCard({
      ...baseCard,
      variants: { normal: false, reverse: false, holo: true },
      pricing: { tcgplayer: { normal: { marketPrice: 7 }, holofoil: { marketPrice: 2 } } },
    });
    expect(card.variantValues?.normal).toBeNull();
    expect(card.variantValues?.reverse).toBeNull();
    const result = aggregateCollectionValueWithVariants([card], [
      { cardId: card.id, variant: 'normal', quantity: 1 },
      { cardId: card.id, variant: 'holo', quantity: 1 },
    ]);
    expect(result.groups).toEqual([{ currency: 'USD', total: 2, count: 1 }]);
    expect(result.unpricedCount).toBe(1);
  });

  it('does not infer a physical finish when variant metadata is absent', () => {
    const card = toCollectionCard({
      ...baseCard,
      variants: undefined,
      pricing: { tcgplayer: { normal: { marketPrice: 7 } } },
    });
    expect(card.variantValues?.normal).toBeNull();
    const result = aggregateCollectionValueWithVariants([card], [
      { cardId: card.id, variant: 'normal', quantity: 1 },
    ]);
    expect(result.groups).toEqual([]);
    expect(result.unpricedCount).toBe(1);
  });

  it('uses the first explicitly available finish for legacy single-price views', () => {
    const card: TCGCard = {
      ...baseCard,
      variants: { holo: true },
      pricing: { tcgplayer: { unit: 'USD', holofoil: { marketPrice: 2.5 } } },
    };
    expect(getCardMarketValue(card)).toEqual({ amount: 2.5, currency: 'USD' });
  });

  it('ignores a zero Cardmarket holo sentinel instead of valuing the card at zero', () => {
    const card: TCGCard = {
      ...baseCard,
      variants: { holo: true, normal: false, reverse: false },
      pricing: {
        cardmarket: { unit: 'EUR', trend: 2.92, 'trend-holo': 0 },
        tcgplayer: { unit: 'USD', holofoil: { marketPrice: 4.58 } },
      },
    };
    expect(getTCGVariantValue(card, 'holo')).toEqual({ amount: 2.92, currency: 'EUR' });
    expect(getCardMarketValue(card)).toEqual({ amount: 2.92, currency: 'EUR' });
  });

  it('falls back to another available finish for an unqualified card estimate', () => {
    const card: TCGCard = {
      ...baseCard,
      pricing: { tcgplayer: { unit: 'USD', reverse: { marketPrice: 1.75 } } },
    };
    expect(getCardMarketValue(card)).toEqual({ amount: 1.75, currency: 'USD' });
    const collectionCard = toCollectionCard(card);
    const result = aggregateCollectionValueWithVariants([collectionCard], [
      { cardId: card.id, variant: 'unspecified', quantity: 2 },
      { cardId: card.id, variant: 'normal', quantity: 1 },
    ]);
    expect(result.groups).toEqual([]);
    expect(result.ownedCount).toBe(3);
    expect(result.pricedCount).toBe(0);
    expect(result.unpricedCount).toBe(3);
  });

  it('keeps valuation totals and coverage in the selected source currency', () => {
    const rawCard = {
      ...baseCard,
      pricing: {
        cardmarket: { unit: 'EUR', trend: 1.25 },
        tcgplayer: { unit: 'USD', normal: { marketPrice: 2.5 }, reverse: { marketPrice: 3 } },
      },
    } satisfies TCGCard;
    const eurCard = toCollectionCard(rawCard, undefined, 'EUR');
    const eur = aggregateCollectionValueWithVariants([eurCard], [
      { cardId: eurCard.id, variant: 'normal', quantity: 2 },
      { cardId: eurCard.id, variant: 'reverse', quantity: 1 },
    ], 'EUR');
    expect(eur.groups).toEqual([{ currency: 'EUR', total: 2.5, count: 2 }]);
    expect(eur.pricedCount).toBe(2);
    expect(eur.unpricedCount).toBe(1);

    const usdCard = toCollectionCard(rawCard, undefined, 'USD');
    const usd = aggregateCollectionValueWithVariants([usdCard], [
      { cardId: usdCard.id, variant: 'normal', quantity: 2 },
      { cardId: usdCard.id, variant: 'reverse', quantity: 1 },
    ], 'USD');
    expect(usd.groups).toEqual([{ currency: 'USD', total: 8, count: 3 }]);
    expect(usd.pricedCount).toBe(3);
    expect(usd.unpricedCount).toBe(0);
  });
});
