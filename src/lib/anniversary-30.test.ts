import { describe, expect, it } from 'vitest';

import type { TCGCard } from '@/types/tcg';
import {
  ANNIVERSARY_30_RELEASE_DATE,
  ANNIVERSARY_30_LAST_VERIFIED_DATE,
  ANNIVERSARY_30_PRODUCTS,
  getAnniversary30ReleaseState,
} from '@/lib/anniversary-30';
import {
  ANNIVERSARY_30_CARD_MANIFEST,
  ANNIVERSARY_30_PIKACHU_CARDS,
  getAnniversary30Manifest,
  filterAnniversary30Cards,
  mergeAnniversary30Cards,
} from '@/lib/anniversary-30-cards';

describe('30th Celebration verified data', () => {
  it('uses the requested editorial snapshot and release date', () => {
    expect(ANNIVERSARY_30_LAST_VERIFIED_DATE).toBe('2026-09-12');
    expect(ANNIVERSARY_30_RELEASE_DATE).toBe('2026-09-16');
  });

  it('keeps the countdown bounded before, at, and after release', () => {
    const before = getAnniversary30ReleaseState(new Date('2026-09-15T23:59:59.000Z'));
    expect(before.status).toBe('upcoming');
    expect(before.totalSeconds).toBe(1);
    expect(getAnniversary30ReleaseState(new Date('2026-09-16T00:00:00.000Z')))
      .toEqual({ status: 'available', totalSeconds: 0 });
    expect(getAnniversary30ReleaseState(new Date('2026-09-17T00:00:00.000Z')))
      .toEqual({ status: 'available', totalSeconds: 0 });
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

  it('keeps the complete manifest when the provider returns a partial list', () => {
    const result = mergeAnniversary30Cards(ANNIVERSARY_30_CARD_MANIFEST, [
      { id: 'provider-023', localId: '023', name: 'Pikachu', image: '/provider.webp' } as TCGCard,
    ]);

    expect(result.filter((card) => card.scope === 'pikachu')).toHaveLength(30);
    expect(result.find((card) => card.localId === '023')?.lunidexCardId).toBe('provider-023');
    expect(result.find((card) => card.localId === '052')?.lunidexCardId).toBeUndefined();
    expect(result.find((card) => card.localId === '023')?.imageStatus).toBe('available');
  });

  it('filters the same manifest by ownership and verified card families', () => {
    const cards = getAnniversary30Manifest().cards;
    const owned = new Set(['30th-023', '30th-129']);

    expect(filterAnniversary30Cards(cards, 'owned', owned).map((card) => card.localId)).toEqual(['023', '129']);
    expect(filterAnniversary30Cards(cards, 'missing', owned)).toHaveLength(cards.length - 2);
    expect(filterAnniversary30Cards(cards, 'pikachu')).toHaveLength(30);
    expect(filterAnniversary30Cards(cards, 'classic-collection')).toHaveLength(30);
    expect(filterAnniversary30Cards(cards, 'illustration-rare')).toHaveLength(18);
    expect(filterAnniversary30Cards(cards, 'special-illustration-rare')).toHaveLength(10);
    expect(filterAnniversary30Cards(cards, 'futuristic-rare')).toHaveLength(2);
  });
});
