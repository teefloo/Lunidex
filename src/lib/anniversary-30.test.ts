import { describe, expect, it } from 'vitest';

import {
  ANNIVERSARY_30_HERO_IMAGE,
  ANNIVERSARY_30_LAST_MODIFIED_DATE,
  ANNIVERSARY_30_PUBLICATION_DATE,
  ANNIVERSARY_30_PIKACHU_SLOTS,
  ANNIVERSARY_30_PRODUCTS,
  countAnniversary30Progress,
  createEmptyAnniversary30Progress,
  parseAnniversary30Progress,
  toggleAnniversary30Slot,
} from './anniversary-30';

describe('30th anniversary campaign data', () => {
  it('keeps publication and update dates explicit', () => {
    expect(ANNIVERSARY_30_PUBLICATION_DATE).toBe('2026-08-25');
    expect(ANNIVERSARY_30_LAST_MODIFIED_DATE).toBe('2026-08-26');
  });

  it('defines 30 stable Pikachu tracker slots', () => {
    expect(ANNIVERSARY_30_PIKACHU_SLOTS).toHaveLength(30);
    expect(ANNIVERSARY_30_PIKACHU_SLOTS[0].id).toBe('pikachu-rare-01');
    expect(ANNIVERSARY_30_PIKACHU_SLOTS.at(-1)?.id).toBe('pikachu-rare-30');
  });

  it('keeps every product tied to an official source', () => {
    expect(ANNIVERSARY_30_PRODUCTS).toHaveLength(13);
    expect(ANNIVERSARY_30_PRODUCTS.every((product) => (
      product.sourceStatus === 'confirmed' && product.sourceUrl.startsWith('https://www.pokemon.com/')
    ))).toBe(true);
    expect(ANNIVERSARY_30_PRODUCTS.filter((product) => product.availabilityGroup === 'launch')).toHaveLength(6);
    expect(ANNIVERSARY_30_PRODUCTS.filter((product) => product.availabilityGroup === 'q3')).toHaveLength(4);
    expect(ANNIVERSARY_30_PRODUCTS.filter((product) => product.availabilityGroup === 'q4')).toHaveLength(3);
    expect(Object.values(ANNIVERSARY_30_HERO_IMAGE.url).every((url) => url.includes('mcdn.pokemon.com/image/upload/'))).toBe(true);
    expect(ANNIVERSARY_30_PRODUCTS.every((product) => (
      Object.values(product.imageUrl).every((url) => url.includes('mcdn.pokemon.com/image/upload/'))
    ))).toBe(true);
  });
});

describe('30th anniversary tracker progress', () => {
  it('toggles a slot and preserves the stable slot order', () => {
    const initial = createEmptyAnniversary30Progress();
    const checked = toggleAnniversary30Slot(initial, 'pikachu-rare-04');
    const unchecked = toggleAnniversary30Slot(checked, 'pikachu-rare-04');

    expect(checked.checkedSlotIds).toEqual(['pikachu-rare-04']);
    expect(countAnniversary30Progress(checked)).toBe(1);
    expect(unchecked).toEqual(initial);
  });

  it('rejects malformed, unknown, and duplicate stored entries', () => {
    const stored = JSON.stringify({
      version: 1,
      checkedSlotIds: ['pikachu-rare-02', 'pikachu-rare-02', 'unknown-slot'],
    });

    expect(parseAnniversary30Progress(stored)).toEqual({
      version: 1,
      checkedSlotIds: ['pikachu-rare-02'],
    });
    expect(parseAnniversary30Progress('{broken')).toEqual(createEmptyAnniversary30Progress());
    expect(parseAnniversary30Progress(JSON.stringify({ version: 2, checkedSlotIds: [] }))).toEqual(
      createEmptyAnniversary30Progress(),
    );
  });
});
