import { describe, expect, it } from 'vitest';
import {
  addTCGCustomCollectionCard,
  compressTCGCustomCollectionLayoutCardRefs,
  createTCGCustomCollection,
  filterTCGCustomCollectionCards,
  getTCGCustomCollectionGridDimensions,
  getTCGCustomCollectionLayoutCardCount,
  getTCGCustomCollectionLayoutCardIndex,
  getTCGCustomCollectionLayout,
  getTCGCustomCollectionLayoutPage,
  isTCGCustomCollectionLayoutWithinSyncBudget,
  moveTCGCustomCollectionLayoutCard,
  normalizeTCGCustomCollectionCards,
  normalizeTCGCustomCollectionCard,
  normalizeTCGCustomCollectionLayouts,
  normalizeTCGCustomCollections,
  removeTCGCustomCollectionCard,
} from './tcg-custom-collections';

const firstId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const secondId = '36e431a6-c3c1-46d4-804d-f5fa08f1af9d';
const createdAt = '2026-10-19T10:00:00.000Z';

describe('custom TCG collections', () => {
  it('upgrades legacy binder references to one independent copy and validates quantities', () => {
    const legacy = { collectionId: firstId, cardId: 'base1-4', language: 'fr', cardName: 'Dracaufeu', addedAt: createdAt };
    expect(normalizeTCGCustomCollectionCard(legacy)).toMatchObject({ quantity: 1 });
    expect(normalizeTCGCustomCollectionCard({ ...legacy, quantity: 7 })).toMatchObject({ quantity: 7 });
    expect(normalizeTCGCustomCollectionCard({ ...legacy, quantity: 0 })).toMatchObject({ quantity: 0 });
    for (const quantity of [-1, 1.5, '2', 10000, null]) {
      expect(normalizeTCGCustomCollectionCard({ ...legacy, quantity })).toBeNull();
    }
  });

  it('searches languages without mixing editions with the same catalog ID', () => {
    const cards = normalizeTCGCustomCollectionCards(['fr', 'ja'].map((language) => ({
      collectionId: firstId, cardId: 'base1-4', language, cardName: language === 'fr' ? 'Dracaufeu' : 'リザードン', addedAt: createdAt,
    })), [firstId])!;
    expect(filterTCGCustomCollectionCards(cards, 'ja', 1).items).toHaveLength(1);
    expect(filterTCGCustomCollectionCards(cards, 'ja', 1).items[0].language).toBe('ja');
    expect(filterTCGCustomCollectionCards(cards, 'リザードン', 1).total).toBe(1);
  });

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

  it('normalizes explicit layout order, prunes removed cards, and appends new cards by addition order', () => {
    const cards = normalizeTCGCustomCollectionCards([
      { collectionId: firstId, cardId: 'set-3', language: 'en', cardName: 'Three', addedAt: '2026-10-21T10:00:00.000Z' },
      { collectionId: firstId, cardId: 'set-1', language: 'fr', cardName: 'One', addedAt: createdAt },
      { collectionId: firstId, cardId: 'set-2', language: 'ja', cardName: 'Two', addedAt: '2026-10-20T10:00:00.000Z' },
      { collectionId: secondId, cardId: 'other-1', language: 'en', cardName: 'Other', addedAt: createdAt },
    ], [firstId, secondId])!;
    const legacyLayouts = normalizeTCGCustomCollectionLayouts([], [firstId, secondId], cards);
    const layouts = normalizeTCGCustomCollectionLayouts([{
      collectionId: firstId,
      gridPreset: '4x3',
      cardOrder: [
        { cardId: 'set-2', language: 'ja' },
        { cardId: 'removed-99', language: 'en' },
      ],
    }], [firstId, secondId], cards);

    expect(legacyLayouts).toEqual([]);
    expect(layouts).toEqual([{
      collectionId: firstId,
      gridPreset: '4x3',
      cardOrder: [
        { cardId: 'set-2', language: 'ja', copyIndex: 0 },
        { cardId: 'set-1', language: 'fr', copyIndex: 0 },
        { cardId: 'set-3', language: 'en', copyIndex: 0 },
      ],
    }]);
  });

  it('canonicalizes the outer layout array by collection identity', () => {
    const layouts = normalizeTCGCustomCollectionLayouts([
      { collectionId: secondId, gridPreset: '2x2', cardOrder: [] },
      { collectionId: firstId, gridPreset: '4x4', cardOrder: [] },
    ], [firstId, secondId], []);

    expect(layouts?.map((layout) => layout.collectionId)).toEqual([firstId, secondId].sort());
  });

  it('rejects malformed layouts, duplicate layout identities, and duplicate or invalid card identities', () => {
    const cards = normalizeTCGCustomCollectionCards([
      { collectionId: firstId, cardId: 'set-1', language: 'en', cardName: 'One', addedAt: createdAt },
    ], [firstId])!;
    const layout = { collectionId: firstId, gridPreset: '3x3', cardOrder: [{ cardId: 'set-1', language: 'en' }] };

    expect(normalizeTCGCustomCollectionLayouts([layout, layout], [firstId], cards)).toBeNull();
    expect(normalizeTCGCustomCollectionLayouts([{
      ...layout,
      cardOrder: [...layout.cardOrder, ...layout.cardOrder],
    }], [firstId], cards)).toBeNull();
    expect(normalizeTCGCustomCollectionLayouts([{
      ...layout,
      cardOrder: [{ cardId: 'notvalid', language: 'en' }],
    }], [firstId], cards)).toBeNull();
    expect(normalizeTCGCustomCollectionLayouts([{
      ...layout,
      cardOrder: [{ cardId: 'set-1', language: 'xx' }],
    }], [firstId], cards)).toBeNull();
    expect(normalizeTCGCustomCollectionLayouts([{ ...layout, gridPreset: '5x5' }], [firstId], cards)).toBeNull();
    expect(normalizeTCGCustomCollectionLayouts([{ ...layout, collectionId: secondId }], [firstId], cards)).toBeNull();
    expect(normalizeTCGCustomCollectionLayouts([{ ...layout, cardOrder: null }], [firstId], cards)).toBeNull();
  });

  it('derives a non-persisted 3×3 legacy layout from card addition order', () => {
    const cards = normalizeTCGCustomCollectionCards([
      { collectionId: firstId, cardId: 'set-2', language: 'fr', cardName: 'Two', addedAt: '2026-10-20T10:00:00.000Z' },
      { collectionId: secondId, cardId: 'other-1', language: 'en', cardName: 'Other', addedAt: createdAt },
      { collectionId: firstId, cardId: 'set-1', language: 'ja', cardName: 'One', addedAt: createdAt },
    ], [firstId, secondId])!;

    expect(getTCGCustomCollectionLayout(firstId, [], cards)).toEqual({
      collectionId: firstId,
      gridPreset: '3x3',
      cardOrder: [
        { cardId: 'set-1', language: 'ja', copyIndex: 0 },
        { cardId: 'set-2', language: 'fr', copyIndex: 0 },
      ],
    });
    const explicit = { collectionId: firstId, gridPreset: '2x2' as const, cardOrder: [] };
    expect(getTCGCustomCollectionLayout(firstId, [explicit], cards)).toBe(explicit);
  });

  it('returns the dimensions for each supported grid preset', () => {
    expect(getTCGCustomCollectionGridDimensions('2x2')).toEqual({ columns: 2, rows: 2, capacity: 4 });
    expect(getTCGCustomCollectionGridDimensions('3x3')).toEqual({ columns: 3, rows: 3, capacity: 9 });
    expect(getTCGCustomCollectionGridDimensions('4x3')).toEqual({ columns: 4, rows: 3, capacity: 12 });
    expect(getTCGCustomCollectionGridDimensions('4x4')).toEqual({ columns: 4, rows: 4, capacity: 16 });
  });

  it('bounds binder pages and reports empty, full, and partial page slots', () => {
    const emptyLayout = { collectionId: firstId, gridPreset: '2x2' as const, cardOrder: [] };
    const fullAndPartialLayout = {
      collectionId: firstId,
      gridPreset: '2x2' as const,
      cardOrder: Array.from({ length: 5 }, (_, index) => ({ cardId: `set-${index + 1}`, language: 'en' as const })),
    };

    expect(getTCGCustomCollectionLayoutPage(emptyLayout, 1)).toEqual({
      page: 1,
      pageCount: 1,
      capacity: 4,
      totalCards: 0,
      cardOrder: [],
      emptySlots: 4,
    });
    expect(getTCGCustomCollectionLayoutPage(fullAndPartialLayout, 0)).toEqual({
      page: 1,
      pageCount: 2,
      capacity: 4,
      totalCards: 5,
      cardOrder: fullAndPartialLayout.cardOrder.slice(0, 4).map((card) => ({ ...card, copyIndex: 0 })),
      emptySlots: 0,
    });
    expect(getTCGCustomCollectionLayoutPage(fullAndPartialLayout, 99)).toEqual({
      page: 2,
      pageCount: 2,
      capacity: 4,
      totalCards: 5,
      cardOrder: fullAndPartialLayout.cardOrder.slice(4).map((card) => ({ ...card, copyIndex: 0 })),
      emptySlots: 3,
    });
  });

  it('migrates one-ref-per-card layouts into compact runs of physical pockets', () => {
    const cards = normalizeTCGCustomCollectionCards([
      { collectionId: firstId, cardId: 'set-1', language: 'en', cardName: 'One', addedAt: createdAt, quantity: 3 },
      { collectionId: firstId, cardId: 'set-2', language: 'fr', cardName: 'Two', addedAt: createdAt, quantity: 0 },
      { collectionId: firstId, cardId: 'set-3', language: 'ja', cardName: 'Three', addedAt: createdAt },
    ], [firstId])!;
    const [layout] = normalizeTCGCustomCollectionLayouts([{
      collectionId: firstId,
      gridPreset: '2x2',
      cardOrder: [
        { cardId: 'set-1', language: 'en' },
        { cardId: 'set-2', language: 'fr' },
      ],
    }], [firstId], cards)!;

    expect(layout.cardOrder).toEqual([
      { cardId: 'set-1', language: 'en', copyIndex: 0, copyCount: 3 },
      { cardId: 'set-2', language: 'fr', copyIndex: 0 },
      { cardId: 'set-3', language: 'ja', copyIndex: 0 },
    ]);
    expect(getTCGCustomCollectionLayoutCardCount(layout.cardOrder)).toBe(5);
    expect(getTCGCustomCollectionLayoutPage(layout, 1).cardOrder).toEqual([
      { cardId: 'set-1', language: 'en', copyIndex: 0 },
      { cardId: 'set-1', language: 'en', copyIndex: 1 },
      { cardId: 'set-1', language: 'en', copyIndex: 2 },
      { cardId: 'set-2', language: 'fr', copyIndex: 0 },
    ]);
    expect(getTCGCustomCollectionLayoutPage(layout, 2)).toMatchObject({ pageCount: 2, totalCards: 5, emptySlots: 3 });
    expect(compressTCGCustomCollectionLayoutCardRefs([
      { cardId: 'set-1', language: 'en', copyIndex: 0 },
      { cardId: 'set-1', language: 'en', copyIndex: 1 },
      { cardId: 'set-1', language: 'en', copyIndex: 2 },
    ])).toEqual([{ cardId: 'set-1', language: 'en', copyIndex: 0, copyCount: 3 }]);
  });

  it('moves a selected copy inside a compact run and preserves its stable copy index', () => {
    const order = [
      { cardId: 'set-1', language: 'en' as const, copyIndex: 0, copyCount: 3 },
      { cardId: 'set-2', language: 'fr' as const, copyIndex: 0 },
    ];
    const moved = moveTCGCustomCollectionLayoutCard(order, { cardId: 'set-1', language: 'en', copyIndex: 2 }, 0);

    expect(moved).toEqual({
      sourceIndex: 2,
      destinationIndex: 0,
      cardOrder: [
        { cardId: 'set-1', language: 'en', copyIndex: 2 },
        { cardId: 'set-1', language: 'en', copyIndex: 0, copyCount: 2 },
        { cardId: 'set-2', language: 'fr', copyIndex: 0 },
      ],
    });
    expect(getTCGCustomCollectionLayoutCardIndex(moved!.cardOrder, { cardId: 'set-1', language: 'en', copyIndex: 0 })).toBe(1);
  });

  it('keeps high quantities compact and rejects manually expanded layouts over the sync budget', () => {
    const compact = {
      collectionId: firstId,
      gridPreset: '4x4' as const,
      cardOrder: [{ cardId: 'set-1', language: 'en' as const, copyIndex: 0, copyCount: 9_999 }],
    };
    const expanded = {
      ...compact,
      cardOrder: Array.from({ length: 40_000 }, (_, index) => ({
        cardId: `set-${index}`,
        language: 'en' as const,
        copyIndex: 0,
      })),
    };

    expect(isTCGCustomCollectionLayoutWithinSyncBudget([compact])).toBe(true);
    expect(isTCGCustomCollectionLayoutWithinSyncBudget([expanded])).toBe(false);
  });
});
