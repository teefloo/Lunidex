import { describe, expect, it } from 'vitest';

import {
  ANNIVERSARY_30_LAST_VERIFIED_DATE,
  ANNIVERSARY_30_PRODUCTS,
} from '@/lib/anniversary-30';
import {
  ANNIVERSARY_30_CARD_MANIFEST,
  ANNIVERSARY_30_PIKACHU_CARDS,
  getAnniversary30Manifest,
} from '@/lib/anniversary-30-cards';

describe('30th Celebration verified data', () => {
  it('uses the requested editorial snapshot and release date', () => {
    expect(ANNIVERSARY_30_LAST_VERIFIED_DATE).toBe('2026-09-12');
  });

  it('contains the 30 real Pikachu cards in collector order', () => {
    expect(ANNIVERSARY_30_PIKACHU_CARDS).toHaveLength(30);
    expect(ANNIVERSARY_30_PIKACHU_CARDS.map((card) => card.localId)).toEqual(
      Array.from({ length: 30 }, (_, index) => String(index + 23).padStart(3, '0')),
    );
    expect(new Set(ANNIVERSARY_30_PIKACHU_CARDS.map((card) => card.id)).size).toBe(30);
    expect(ANNIVERSARY_30_PIKACHU_CARDS.every((card) => card.name === 'Pikachu')).toBe(true);
  });

  it('contains a complete, non-placeholder main checklist', () => {
    expect(getAnniversary30Manifest().numberedMain).toHaveLength(128);
    expect(ANNIVERSARY_30_CARD_MANIFEST.some((card) => /slot/i.test(card.name))).toBe(false);
    expect(new Set(ANNIVERSARY_30_CARD_MANIFEST.map((card) => card.id)).size)
      .toBe(ANNIVERSARY_30_CARD_MANIFEST.length);
  });

  it('does not duplicate product identities', () => {
    expect(new Set(ANNIVERSARY_30_PRODUCTS.map((product) => product.id)).size)
      .toBe(ANNIVERSARY_30_PRODUCTS.length);
    expect(ANNIVERSARY_30_PRODUCTS).toHaveLength(14);
  });
});
