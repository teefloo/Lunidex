import { describe, it, expect } from 'vitest';
import {
  getCardMarketValue,
  toCollectionCard,
  getSetCompletionFromCards,
  getTopMissingCards,
  aggregateCollectionValue,
  computeActiveSetInsights,
  sortCollectionCardsByRarity,
} from './tcg-collection';
import type { TCGCard, TCGCollectionCard } from '@/types/tcg';

function card(partial: Partial<TCGCard> & { id: string }): TCGCard {
  return {
    localId: partial.id.split('-')[1] ?? partial.id,
    name: partial.name ?? partial.id,
    ...partial,
  } as TCGCard;
}

function collectionCard(partial: Partial<TCGCollectionCard> & { id: string }): TCGCollectionCard {
  return {
    localId: partial.id,
    name: partial.id,
    ...partial,
  };
}

describe('getCardMarketValue', () => {
  it('prefers Cardmarket trend in EUR', () => {
    const value = getCardMarketValue(
      card({
        id: 'a-1',
        pricing: { cardmarket: { unit: 'EUR', trend: 1.5, avg: 1.2, low: 0.5 } },
      }),
    );
    expect(value).toEqual({ amount: 1.5, currency: 'EUR' });
  });

  it('falls back through Cardmarket avg/avg30/low', () => {
    expect(
      getCardMarketValue(card({ id: 'a-1', pricing: { cardmarket: { avg: 2 } } })),
    ).toEqual({ amount: 2, currency: 'EUR' });
    expect(
      getCardMarketValue(card({ id: 'a-1', pricing: { cardmarket: { avg30: 3 } } })),
    ).toEqual({ amount: 3, currency: 'EUR' });
  });

  it('falls back to TCGplayer market price in USD when Cardmarket is absent', () => {
    const value = getCardMarketValue(
      card({
        id: 'a-1',
        pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: 4.2, lowPrice: 1 } } },
      }),
    );
    expect(value).toEqual({ amount: 4.2, currency: 'USD' });
  });

  it('returns null when no pricing is available', () => {
    expect(getCardMarketValue(card({ id: 'a-1' }))).toBeNull();
    expect(getCardMarketValue(card({ id: 'a-1', pricing: { cardmarket: {} } }))).toBeNull();
  });

  it('ignores non-finite amounts', () => {
    expect(
      getCardMarketValue(card({ id: 'a-1', pricing: { cardmarket: { trend: NaN, avg: 1 } } })),
    ).toEqual({ amount: 1, currency: 'EUR' });
  });
});

describe('toCollectionCard', () => {
  it('projects to the slim shape with resolved value', () => {
    const slim = toCollectionCard(
      card({
        id: 'set1-10',
        name: 'Pikachu',
        image: 'https://img/10',
        rarity: 'Rare Holo',
        pricing: { cardmarket: { trend: 2 } },
      }),
    );
    expect(slim).toEqual({
      id: 'set1-10',
      localId: '10',
      name: 'Pikachu',
      image: 'https://img/10',
      rarity: 'Rare Holo',
      value: { amount: 2, currency: 'EUR' },
    });
  });
});

describe('getSetCompletionFromCards', () => {
  const cards = [collectionCard({ id: 'a' }), collectionCard({ id: 'b' }), collectionCard({ id: 'c' })];

  it('computes owned/total/percentage', () => {
    expect(getSetCompletionFromCards(cards, new Set(['a', 'b']))).toEqual({
      owned: 2,
      total: 3,
      percentage: 67,
    });
  });

  it('handles an empty set without dividing by zero', () => {
    expect(getSetCompletionFromCards([], new Set(['a']))).toEqual({
      owned: 0,
      total: 0,
      percentage: 0,
    });
  });
});

describe('getTopMissingCards', () => {
  const cards = [
    collectionCard({ id: 'common', rarity: 'Common' }),
    collectionCard({ id: 'secret', rarity: 'Secret Rare' }),
    collectionCard({ id: 'rare', rarity: 'Rare' }),
    collectionCard({ id: 'ultra', rarity: 'Ultra Rare' }),
  ];

  it('returns only non-owned cards, rarest first', () => {
    const owned = new Set(['secret']);
    const result = getTopMissingCards(cards, owned, 10);
    expect(result.map((c) => c.id)).toEqual(['ultra', 'rare', 'common']);
    expect(result.every((c) => !owned.has(c.id))).toBe(true);
  });

  it('respects the limit', () => {
    expect(getTopMissingCards(cards, new Set(), 2).map((c) => c.id)).toEqual(['secret', 'ultra']);
  });

  it('returns nothing for a non-positive limit', () => {
    expect(getTopMissingCards(cards, new Set(), 0)).toEqual([]);
    expect(getTopMissingCards(cards, new Set(), -3)).toEqual([]);
  });

  it('returns an empty list when everything is owned', () => {
    expect(getTopMissingCards(cards, new Set(['common', 'secret', 'rare', 'ultra']), 5)).toEqual([]);
  });
});

describe('sortCollectionCardsByRarity', () => {
  it('breaks rarity ties by name', () => {
    const result = sortCollectionCardsByRarity([
      { id: '2', localId: '2', name: 'Zubat', rarity: 'Rare' },
      { id: '1', localId: '1', name: 'Abra', rarity: 'Rare' },
    ]);
    expect(result.map((c) => c.name)).toEqual(['Abra', 'Zubat']);
  });
});

describe('aggregateCollectionValue', () => {
  const cards: TCGCollectionCard[] = [
    collectionCard({ id: 'a', value: { amount: 1.5, currency: 'EUR' } }),
    collectionCard({ id: 'b', value: { amount: 2.25, currency: 'EUR' } }),
    collectionCard({ id: 'c', value: { amount: 3, currency: 'USD' } }),
    collectionCard({ id: 'd', value: null }),
  ];

  it('groups owned values by currency and counts coverage', () => {
    const result = aggregateCollectionValue(cards, new Set(['a', 'b', 'c', 'd']));
    expect(result.ownedCount).toBe(4);
    expect(result.pricedCount).toBe(3);
    expect(result.groups).toEqual([
      { currency: 'EUR', total: 3.75, count: 2 },
      { currency: 'USD', total: 3, count: 1 },
    ]);
  });

  it('only counts owned cards', () => {
    const result = aggregateCollectionValue(cards, new Set(['a']));
    expect(result.ownedCount).toBe(1);
    expect(result.pricedCount).toBe(1);
    expect(result.groups).toEqual([{ currency: 'EUR', total: 1.5, count: 1 }]);
  });

  it('rounds floating point sums to cents', () => {
    const result = aggregateCollectionValue(
      [
        collectionCard({ id: 'x', value: { amount: 0.1, currency: 'EUR' } }),
        collectionCard({ id: 'y', value: { amount: 0.2, currency: 'EUR' } }),
      ],
      new Set(['x', 'y']),
    );
    expect(result.groups[0].total).toBe(0.3);
  });

  it('returns no groups when nothing owned is priced', () => {
    const result = aggregateCollectionValue([collectionCard({ id: 'd', value: null })], new Set(['d']));
    expect(result.groups).toEqual([]);
    expect(result.ownedCount).toBe(1);
    expect(result.pricedCount).toBe(0);
  });
});

describe('computeActiveSetInsights', () => {
  it('combines completion, top missing and valuation', () => {
    const cards: TCGCollectionCard[] = [
      collectionCard({ id: 'a', rarity: 'Common', value: { amount: 1, currency: 'EUR' } }),
      collectionCard({ id: 'b', rarity: 'Ultra Rare', value: { amount: 10, currency: 'EUR' } }),
      collectionCard({ id: 'c', rarity: 'Secret Rare' }),
    ];
    const insights = computeActiveSetInsights(cards, new Set(['a']), 5);
    expect(insights.completion).toEqual({ owned: 1, total: 3, percentage: 33 });
    expect(insights.topMissing.map((c) => c.id)).toEqual(['c', 'b']);
    expect(insights.valuation.groups).toEqual([{ currency: 'EUR', total: 1, count: 1 }]);
  });
});
