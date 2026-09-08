import { describe, expect, it } from 'vitest';

import { fetchCollectionValue, normalizeOwnedVariantsForValuation } from './api/tcg';
import type { TCGCard } from '@/types/tcg';

function pricedCard(id: string, setId = 'sv1', amount = 2): TCGCard {
  return {
    id,
    localId: id.split('-')[1] ?? '1',
    name: id,
    category: 'Pokemon',
    set: { id: setId, name: setId },
    variants: { normal: true },
    pricing: { tcgplayer: { unit: 'USD', normal: { marketPrice: amount } } },
  };
}

describe('normalizeOwnedVariantsForValuation', () => {
  it('deduplicates legacy ids and variant entries without losing quantities', () => {
    expect(
      normalizeOwnedVariantsForValuation([
        'sv1-1',
        'sv1-1',
        { cardId: 'sv1-1', variant: 'normal', quantity: 2 },
        { cardId: 'sv1-1', variant: 'holo', quantity: 3 },
        { cardId: 'sv1-1', variant: 'holo', quantity: 1 },
      ]),
    ).toEqual([
      { cardId: 'sv1-1', variant: 'unspecified', quantity: 2 },
      { cardId: 'sv1-1', variant: 'normal', quantity: 2 },
      { cardId: 'sv1-1', variant: 'holo', quantity: 4 },
    ]);
  });

  it('drops malformed entries and caps the number of physical cards', () => {
    const result = normalizeOwnedVariantsForValuation(
      [
        null,
        { cardId: '', variant: 'normal', quantity: 4 },
        ...Array.from({ length: 10 }, (_, index) => ({
          cardId: `sv1-${index + 1}`,
          variant: 'normal' as const,
          quantity: 1,
        })),
      ],
      3,
    );

    expect(result).toHaveLength(3);
    expect(result.every((entry) => entry.cardId.length > 0)).toBe(true);
  });
});

describe('fetchCollectionValue', () => {
  it('fetches each card once, keeps priced cards, and reports missing prices as partial data', async () => {
    const calls: string[] = [];
    const result = await fetchCollectionValue(
      [
        'sv1-1',
        'sv1-1',
        { cardId: 'sv1-1', variant: 'normal', quantity: 2 },
        { cardId: 'sv1-2', variant: 'normal', quantity: 1 },
      ],
      'fr',
      undefined,
      undefined,
      {
        fetchCard: async (cardId, language) => {
          calls.push(`${language}:${cardId}`);
          return cardId === 'sv1-1' ? pricedCard(cardId) : null;
        },
        cardTimeoutMs: 25,
      },
    );

    expect(calls).toEqual(['fr:sv1-1', 'fr:sv1-2']);
    expect(result.ownedCount).toBe(5);
    expect(result.pricedCount).toBe(4);
    expect(result.unpricedCount).toBe(1);
    expect(result.groups).toEqual([{ currency: 'USD', total: 8, count: 4 }]);
  });

  it('times out one card without blocking the rest of the valuation', async () => {
    const result = await fetchCollectionValue(
      ['sv1-1', 'sv1-2'],
      'en',
      undefined,
      undefined,
      {
        concurrency: 2,
        cardTimeoutMs: 5,
        fetchCard: (cardId) => cardId === 'sv1-1'
          ? new Promise<TCGCard>(() => undefined)
          : Promise.resolve(pricedCard(cardId)),
      },
    );

    expect(result.ownedCount).toBe(2);
    expect(result.pricedCount).toBe(1);
    expect(result.unpricedCount).toBe(1);
  });

  it('limits concurrent detail requests and caps large collections', async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const result = await fetchCollectionValue(
      Array.from({ length: 20 }, (_, index) => `sv1-${index + 1}`),
      'en',
      undefined,
      undefined,
      {
        concurrency: 2,
        maxUniqueCards: 5,
        fetchCard: async (cardId) => {
          calls += 1;
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 1));
          active -= 1;
          return pricedCard(cardId);
        },
      },
    );

    expect(calls).toBe(5);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(result.ownedCount).toBe(20);
    expect(result.pricedCount).toBe(5);
    expect(result.unpricedCount).toBe(15);
  });
});
