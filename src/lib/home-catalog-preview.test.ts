import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HOME_CATALOG_PREVIEW_CARDS,
  getHomeCatalogCandidates,
  getHomeCatalogPreviewImageSrcSet,
  getInitialHomeCatalogSelection,
  getNextHomeCatalogSelection,
  type HomeCatalogPreviewCard,
} from './home-catalog-preview';

function previewCard(id: string, rarity = 'Hyper Rare'): HomeCatalogPreviewCard {
  return {
    id,
    localId: id.split('-').at(-1) ?? id,
    name: id,
    rarity,
    image: `/tcg-showcase/${id}.webp`,
    set: { id: id.split('-')[0], name: 'Test Set' },
  };
}

describe('home catalog preview selection', () => {
  it('starts with three distinct verified rare cards and their local images', () => {
    const initial = getInitialHomeCatalogSelection(HOME_CATALOG_PREVIEW_CARDS);

    expect(initial.map(({ id }) => id)).toEqual(['sv03-228', 'swsh7-215', 'sv06-214']);
    expect(new Set(HOME_CATALOG_PREVIEW_CARDS.map(({ id }) => id)).size).toBe(12);
    expect(HOME_CATALOG_PREVIEW_CARDS.every(({ image }) => existsSync(join(process.cwd(), 'public', image.slice(1))))).toBe(true);
  });

  it('serves responsive local variants for showcase images and ignores fallbacks', () => {
    expect(getHomeCatalogPreviewImageSrcSet('/tcg-showcase/sv03-228.webp')).toBe(
      '/tcg-showcase/responsive/sv03-228-160.webp 160w, '
      + '/tcg-showcase/responsive/sv03-228-256.webp 256w, '
      + '/tcg-showcase/sv03-228.webp 384w',
    );
    expect(getHomeCatalogPreviewImageSrcSet('/images/pokemon-card-back.webp')).toBeUndefined();
    expect(getHomeCatalogPreviewImageSrcSet('https://assets.tcgdex.net/en/swsh7/ss7/215')).toBeUndefined();
  });

  it('has each responsive variant available for all home showcase cards', () => {
    for (const card of HOME_CATALOG_PREVIEW_CARDS) {
      const srcSet = getHomeCatalogPreviewImageSrcSet(card.image);
      expect(srcSet).toBeDefined();

      for (const path of srcSet?.matchAll(/([^ ,]+\.webp) \d+w/g) ?? []) {
        expect(existsSync(join(process.cwd(), 'public', path[1].slice(1)))).toBe(true);
      }
    }
  });

  it('rejects duplicate IDs, missing images, failed images, and common rarities', () => {
    const candidates = getHomeCatalogCandidates([
      previewCard('set-001'),
      previewCard('set-001', 'Common'),
      { ...previewCard('set-002', 'Illustration Rare'), image: '' },
      previewCard('set-003', 'Uncommon'),
      previewCard('set-004', 'Secret Rare'),
    ], new Set(['set-004']));

    expect(candidates.map(({ id }) => id)).toEqual(['set-001']);
  });

  it.each([0, 1, 2, 3, 4, 5])('keeps a distinct, valid selection with a reservoir of %i cards', (size) => {
    const cards = Array.from({ length: size }, (_, index) => previewCard(`set-${index}`));
    const initial = getInitialHomeCatalogSelection(cards);
    const next = getNextHomeCatalogSelection(cards, initial, new Set(initial.map(({ id }) => id)), new Set(), () => 0.5);

    expect(initial).toHaveLength(Math.min(size, 3));
    expect(next).toHaveLength(Math.min(size, 3));
    expect(new Set(next.map(({ id }) => id)).size).toBe(next.length);
  });

  it('shows every available card once across rotations before starting another cycle', () => {
    let current = getInitialHomeCatalogSelection(HOME_CATALOG_PREVIEW_CARDS);
    const seen = new Set(current.map(({ id }) => id));

    for (let rotation = 0; rotation < 3; rotation += 1) {
      const next = getNextHomeCatalogSelection(
        HOME_CATALOG_PREVIEW_CARDS,
        current,
        seen,
        new Set(),
        () => 0.5,
      );

      expect(next).toHaveLength(3);
      expect(new Set(next.map(({ id }) => id)).size).toBe(3);
      expect(next.every(({ id }) => !seen.has(id))).toBe(true);
      current = next;
      for (const { id } of current) seen.add(id);
    }

    expect(seen.size).toBe(12);
  });

  it('retries another card after an image failure without repeating the visible cards', () => {
    const cards = Array.from({ length: 6 }, (_, index) => previewCard(`set-${index}`));
    const current = cards.slice(0, 3);
    const next = getNextHomeCatalogSelection(
      cards,
      current,
      new Set(current.map(({ id }) => id)),
      new Set(['set-3']),
      () => 0.5,
    );

    expect(next).toHaveLength(3);
    expect(next.every(({ id }) => id !== 'set-3')).toBe(true);
    expect(next.filter(({ id }) => current.some((card) => card.id === id))).toHaveLength(1);
  });

  it('prioritizes higher rarity tiers before lower ones', () => {
    const current = [
      previewCard('set-current-1', 'Illustration Rare'),
      previewCard('set-current-2', 'Illustration Rare'),
      previewCard('set-current-3', 'Illustration Rare'),
    ];
    const cards = [
      ...current,
      previewCard('set-illustration', 'Illustration Rare'),
      previewCard('set-secret', 'Secret Rare'),
      previewCard('set-special', 'Special Illustration Rare'),
      previewCard('set-hyper', 'Hyper Rare'),
    ];

    expect(getNextHomeCatalogSelection(cards, current, new Set(current.map(({ id }) => id)), new Set(), () => 0.5).map(({ id }) => id)).toEqual([
      'set-hyper',
      'set-secret',
      'set-special',
    ]);
  });
});
