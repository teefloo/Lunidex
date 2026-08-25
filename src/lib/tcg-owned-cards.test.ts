import { describe, expect, it } from 'vitest';
import {
  MAX_TCG_OWNED_CARDS,
  isValidTcgCardId,
  normalizeTcgOwnedCards,
  normalizeUserStateData,
} from './tcg-owned-cards';

describe('TCG owned-card state normalization', () => {
  it('accepts path-safe identifiers of any supported case', () => {
    expect(isValidTcgCardId('sv01-1')).toBe(true);
    expect(isValidTcgCardId('smp-SMP01')).toBe(true);
    expect(isValidTcgCardId('swsh45sv-SV084PV')).toBe(true);
  });

  it('rejects identifiers that could alter an upstream URL path', () => {
    expect(isValidTcgCardId('../../sets')).toBe(false);
    expect(isValidTcgCardId('sv01-1/../../sets/base')).toBe(false);
    expect(isValidTcgCardId('sv01-1\\../../sets/base')).toBe(false);
    expect(isValidTcgCardId('sv01-1?x=1')).toBe(false);
    expect(isValidTcgCardId('sv01-1#frag')).toBe(false);
    expect(isValidTcgCardId('sv01 1')).toBe(false);
    expect(isValidTcgCardId('')).toBe(false);
    expect(isValidTcgCardId(' sv01-1')).toBe(false);
    expect(isValidTcgCardId(`${'a'.repeat(127)}-b`)).toBe(false);
    expect(isValidTcgCardId(25)).toBe(false);
  });

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
