import { describe, expect, it } from 'vitest';
import {
  addTCGCustomCollectionCard,
  createTCGCustomCollection,
  filterTCGCustomCollectionCards,
  normalizeTCGCustomCollectionCards,
  normalizeTCGCustomCollections,
  removeTCGCustomCollectionCard,
} from './tcg-custom-collections';

const firstId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const secondId = '36e431a6-c3c1-46d4-804d-f5fa08f1af9d';
const createdAt = '2026-10-19T10:00:00.000Z';

describe('custom TCG collections', () => {
  it('normalizes names and descriptions while preserving duplicate names', () => {
    const collection = createTCGCustomCollection(firstId, '  1025  ', '  Every Pokémon  ', createdAt);

    expect(collection).toEqual({
      id: firstId,
      name: '1025',
      description: 'Every Pokémon',
      createdAt,
      updatedAt: createdAt,
    });
    expect(normalizeTCGCustomCollections([
      collection,
      { ...collection, id: secondId },
    ])).toHaveLength(2);
  });

  it('rejects invalid collection names, identifiers, and timestamps', () => {
    expect(createTCGCustomCollection(firstId, '   ', '', createdAt)).toBeNull();
    expect(createTCGCustomCollection(firstId, 'x'.repeat(121), '', createdAt)).toBeNull();
    expect(createTCGCustomCollection('not-a-uuid', 'Binder', '', createdAt)).toBeNull();
    expect(normalizeTCGCustomCollections([{ id: firstId, name: 'Binder', createdAt: 'bad' }])).toBeNull();
  });

  it('allows the same catalog card in multiple collections and treats duplicates idempotently', () => {
    const collections = normalizeTCGCustomCollections([
      createTCGCustomCollection(firstId, '1025', '', createdAt),
      createTCGCustomCollection(secondId, 'Artwork', '', createdAt),
    ])!;
    const card = { cardId: 'sv03.5-199', collectionId: firstId, language: 'fr', cardName: 'Dracaufeu', addedAt: createdAt };
    const once = addTCGCustomCollectionCard(collections, [], card);
    const twice = addTCGCustomCollectionCard(collections, once, card);
    const shared = addTCGCustomCollectionCard(collections, twice, { ...card, collectionId: secondId });

    expect(once).toHaveLength(1);
    expect(twice).toEqual(once);
    expect(shared).toHaveLength(2);
    expect(addTCGCustomCollectionCard(collections, shared, { ...card, language: 'en' })).toHaveLength(3);
  });

  it('removes one membership without changing another collection or the input', () => {
    const cards = normalizeTCGCustomCollectionCards([
      { collectionId: firstId, cardId: 'sv03.5-199', language: 'fr', cardName: 'Dracaufeu', addedAt: createdAt },
      { collectionId: secondId, cardId: 'sv03.5-199', language: 'fr', cardName: 'Dracaufeu', addedAt: createdAt },
    ], [firstId, secondId])!;
    const remaining = removeTCGCustomCollectionCard(firstId, 'sv03.5-199', 'fr', cards);

    expect(remaining).toHaveLength(1);
    expect(remaining[0].collectionId).toBe(secondId);
    expect(cards).toHaveLength(2);
  });

  it('searches compact name and ID and pages in addition order', () => {
    const cards = normalizeTCGCustomCollectionCards([
      { collectionId: firstId, cardId: 'sv03.5-199', language: 'fr', cardName: 'Dracaufeu', addedAt: createdAt },
      { collectionId: firstId, cardId: 'base1-58', language: 'en', cardName: 'Pikachu', addedAt: '2026-10-20T10:00:00.000Z' },
    ], [firstId])!;

    expect(filterTCGCustomCollectionCards(cards, 'drac', 1, 1).items[0].cardId).toBe('sv03.5-199');
    expect(filterTCGCustomCollectionCards(cards, 'base1', 1, 1).items[0].cardName).toBe('Pikachu');
    expect(filterTCGCustomCollectionCards(cards, '', 2, 1).items[0].cardId).toBe('base1-58');
    expect(filterTCGCustomCollectionCards(cards, 'missing', 1, 48).total).toBe(0);
  });

  it('pages through thousands of compact references without changing addition order', () => {
    const cards = Array.from({ length: 4_800 }, (_, index) => ({
      collectionId: firstId,
      cardId: `set-${String(index + 1).padStart(5, '0')}`,
      language: 'en' as const,
      cardName: `Card ${index + 1}`,
      addedAt: new Date(Date.parse(createdAt) + index * 1_000).toISOString(),
    }));
    const firstPage = filterTCGCustomCollectionCards(cards, '', 1);
    const hundredthPage = filterTCGCustomCollectionCards(cards, '', 100);

    expect(firstPage.items).toHaveLength(48);
    expect(firstPage.items[0].cardId).toBe('set-00001');
    expect(firstPage.items.at(-1)?.cardId).toBe('set-00048');
    expect(hundredthPage.items).toHaveLength(48);
    expect(hundredthPage.items[0].cardId).toBe('set-04753');
    expect(hundredthPage.hasNextPage).toBe(false);
    expect(hundredthPage.total).toBe(4_800);
  });
});
