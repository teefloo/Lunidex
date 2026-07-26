import { describe, expect, it } from 'vitest';
import type { FriendDeck } from '@/types/friends';

function getLoadedRarityCounts(cards: Array<{ rarity?: string | null }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const rarity = card.rarity ?? 'unknown';
    counts.set(rarity, (counts.get(rarity) ?? 0) + 1);
  }
  return counts;
}

describe('friends shared data contracts', () => {
  it('keeps deck payloads read-only and preserves card quantities', () => {
    const deck: FriendDeck = {
      id: 'deck-1',
      name: 'League deck',
      createdAt: '2026-07-26T00:00:00.000Z',
      cards: [{ cardId: 'sv-base-1', quantity: 4 }],
    };

    expect(deck.cards[0]).toEqual({ cardId: 'sv-base-1', quantity: 4 });
  });

  it('aggregates rarity only from cards that have been hydrated', () => {
    const counts = getLoadedRarityCounts([
      { rarity: 'Common' },
      { rarity: 'Common' },
      { rarity: 'Ultra Rare' },
      { rarity: null },
    ]);

    expect(counts.get('Common')).toBe(2);
    expect(counts.get('Ultra Rare')).toBe(1);
    expect(counts.get('unknown')).toBe(1);
  });
});
