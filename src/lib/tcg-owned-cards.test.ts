import { describe, expect, it } from 'vitest';
import {
  MAX_TCG_OWNED_CARDS,
  normalizeTcgOwnedCards,
  normalizeUserStateData,
} from './tcg-owned-cards';

describe('TCG owned-card state normalization', () => {
  it('canonicalizes and deduplicates card identifiers', () => {
    expect(normalizeTcgOwnedCards([' SV01-1 ', 'sv01-1', 'base-25'])).toEqual([
      'sv01-1',
      'base-25',
    ]);
  });

  it('rejects arbitrary values and malformed identifiers', () => {
    expect(normalizeTcgOwnedCards(['sv01-1', 25])).toBeNull();
    expect(normalizeTcgOwnedCards(['not-a-card id'])).toBeNull();
    expect(normalizeTcgOwnedCards(['sv011'])).toBeNull();
  });

  it('enforces the collection bound before allocating the normalized set', () => {
    const tooLarge = Array.from({ length: MAX_TCG_OWNED_CARDS + 1 }, (_, index) => `sv01-${index + 1}`);
    expect(normalizeTcgOwnedCards(tooLarge)).toBeNull();
  });

  it('rejects a malformed synchronized field without changing unrelated state', () => {
    expect(normalizeUserStateData({ favorites: [25], tcgOwnedCards: ['bad value'] })).toBeNull();
    expect(normalizeUserStateData({ favorites: [25] })).toEqual({ favorites: [25] });
  });
});
