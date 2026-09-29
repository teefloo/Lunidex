import { describe, expect, it } from 'vitest';
import { selectTopValuedCollectionCards } from './tcg-collection-preview';
import type { TCGCard, TCGCardValue } from '@/types/tcg';

function valuedCard(id: string, amount: number): { card: TCGCard; value: TCGCardValue } {
  return {
    card: { id, localId: id.split('-').at(-1) ?? '', name: id },
    value: { amount, currency: 'EUR', provider: 'cardmarket' },
  };
}

describe('selectTopValuedCollectionCards', () => {
  it('selects the most valuable cards across collections and keeps each card once', () => {
    const result = selectTopValuedCollectionCards([
      valuedCard('sv1-1', 12),
      valuedCard('sv1-2', 5),
      valuedCard('base1-1', 20),
      valuedCard('sv1-1', 18),
      valuedCard('sv1-3', 7),
    ], 'EUR');

    expect(result.map(({ card, value }) => [card.id, value.amount])).toEqual([
      ['base1-1', 20],
      ['sv1-1', 18],
      ['sv1-3', 7],
    ]);
  });

  it('excludes invalid values and respects the requested limit', () => {
    const result = selectTopValuedCollectionCards([
      valuedCard('sv1-1', 12),
      valuedCard('sv1-2', Number.NaN),
      valuedCard('sv1-3', 0),
      valuedCard('sv1-4', 5),
    ], 'EUR', 1);

    expect(result.map(({ card }) => card.id)).toEqual(['sv1-1']);
  });
});
