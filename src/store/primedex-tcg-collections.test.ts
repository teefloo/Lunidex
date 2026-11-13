import { describe, expect, it } from 'vitest';
import {
  encodeTCGCollectionKey,
  getTCGCollectionCardOwnerships,
  getTCGCollectionCardQuantity,
} from '@/lib/tcg-collections';
import { getTCGCustomCollectionLayout, moveTCGCustomCollectionLayoutCard } from '@primedex/core/lib/tcg-custom-collections';
import { setSyncAccessStatus } from './sync-access';
import { usePrimeDexStore } from './primedex';

function resetCollectionState(legacyCards: string[] = []): void {
  usePrimeDexStore.setState({
    tcgCollections: [],
    tcgCollectionCards: [],
    tcgActiveCollections: [],
    tcgLegacyOwnedCards: legacyCards,
    tcgOwnedCards: legacyCards,
    tcgCollectionModelVersion: 3,
    tcgCustomCollections: [],
    tcgCustomCollectionCards: [],
    tcgCustomCollectionLayouts: [],
  });
}

describe('web TCG collection store', () => {
  it('creates, edits, and removes binders without changing global card ownership', () => {
    setSyncAccessStatus('ready');
    resetCollectionState(['base1-001']);
    const store = usePrimeDexStore.getState();
    const firstId = store.createTCGCustomCollection('1025', 'Every first-generation Pokémon');
    const secondId = usePrimeDexStore.getState().createTCGCustomCollection('Artwork', '');
    const card = { cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam' };
    usePrimeDexStore.getState().addTCGCustomCollectionCard(firstId, card);
    usePrimeDexStore.getState().addTCGCustomCollectionCard(secondId, card);

    const ownedBefore = usePrimeDexStore.getState().tcgOwnedCards;
    const physicalCountBefore = usePrimeDexStore.getState().getTCGPhysicalCardCount();
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards).toHaveLength(2);
    expect(usePrimeDexStore.getState().editTCGCustomCollection(firstId, '  My 1025  ', '  Binder goal  ')).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollections.find((entry) => entry.id === firstId)).toMatchObject({ name: 'My 1025', description: 'Binder goal' });

    usePrimeDexStore.getState().removeTCGCustomCollectionCard(firstId, card.cardId, card.language);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards).toHaveLength(1);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards[0].collectionId).toBe(secondId);
    usePrimeDexStore.getState().deleteTCGCustomCollection(firstId);
    expect(usePrimeDexStore.getState().tcgCustomCollections.map((entry) => entry.id)).toEqual([secondId]);
    expect(usePrimeDexStore.getState().tcgOwnedCards).toEqual(ownedBefore);
    expect(usePrimeDexStore.getState().getTCGPhysicalCardCount()).toBe(physicalCountBefore);
    setSyncAccessStatus('checking');
  });

  it('keeps binder quantities independent from series, other binders and language editions', () => {
    setSyncAccessStatus('ready');
    resetCollectionState();
    const store = usePrimeDexStore.getState();
    const series = encodeTCGCollectionKey('fr', 'base1')!;
    store.setTCGCollectionVariantQuantity(series, 'base1-4', 'holo', 3);
    const binder = store.createTCGCustomCollection('Mixed');
    const other = store.createTCGCustomCollection('Other');
    const card = { cardId: 'base1-4', language: 'fr' as const, cardName: 'Dracaufeu' };
    expect(store.addTCGCustomCollectionCard(binder, card)).toBe(true);
    store.addTCGCustomCollectionCard(binder, { ...card, language: 'ja', cardName: 'リザードン' });
    store.addTCGCustomCollectionCard(other, card);
    expect(store.setTCGCustomCollectionCardQuantity(binder, 'base1-4', 'fr', 5)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards.map((entry) => entry.quantity).sort()).toEqual([1, 1, 5]);
    expect(store.getTCGPhysicalCardCount()).toBe(3);
    store.setTCGCollectionVariantQuantity(series, 'base1-4', 'holo', 0);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards.map((entry) => entry.quantity).sort()).toEqual([1, 1, 5]);
    expect(usePrimeDexStore.getState().tcgOwnedCards).toEqual([]);
    store.setTCGCollectionVariantQuantity(series, 'base1-4', 'normal', 2);
    expect(store.setTCGCustomCollectionCardQuantity(binder, 'base1-4', 'fr', 0)).toBe(true);
    expect(store.setTCGCustomCollectionCardQuantity(binder, 'base1-4', 'ja', -1)).toBe(false);
    store.removeTCGCustomCollectionCard(binder, 'base1-4', 'fr');
    expect(store.getTCGPhysicalCardCount()).toBe(2);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards).toHaveLength(2);
    setSyncAccessStatus('checking');
  });

  it('adds a selection once, ignores duplicate printings, and publishes one store update', () => {
    setSyncAccessStatus('ready');
    resetCollectionState();
    const collectionId = usePrimeDexStore.getState().createTCGCustomCollection('Favorites');
    const store = usePrimeDexStore.getState();
    const card = { cardId: 'base1-4', language: 'en' as const, cardName: 'Charizard' };
    let updates = 0;
    const unsubscribe = usePrimeDexStore.subscribe(() => { updates += 1; });

    const added = store.addTCGCustomCollectionCards(collectionId, [
      { ...card, quantity: 3 },
      { cardId: 'base1-1', language: 'en', cardName: 'Alakazam' },
      card,
    ]);

    unsubscribe();
    expect(added).toBe(2);
    expect(updates).toBe(1);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards.map(({ cardId }) => cardId)).toEqual(['base1-1', 'base1-4']);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards.find(({ cardId }) => cardId === 'base1-4')?.quantity).toBe(3);
    setSyncAccessStatus('checking');
  });

  it('keeps legacy layouts lazy and updates explicit order with binder membership edits', () => {
    setSyncAccessStatus('ready');
    resetCollectionState();
    const store = usePrimeDexStore.getState();
    const collectionId = store.createTCGCustomCollection('Binder');
    const first = { cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam' };
    const second = { cardId: 'base1-002', language: 'fr' as const, cardName: 'Dracaufeu' };
    const third = { cardId: 'base1-003', language: 'ja' as const, cardName: 'フシギダネ' };

    expect(store.addTCGCustomCollectionCard(collectionId, first)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts).toEqual([]);
    expect(usePrimeDexStore.getState().setTCGCustomCollectionGridPreset(collectionId, '2x2')).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]).toEqual({
      collectionId,
      gridPreset: '2x2',
      cardOrder: [{ cardId: first.cardId, language: first.language, copyIndex: 0 }],
    });

    expect(usePrimeDexStore.getState().addTCGCustomCollectionCard(collectionId.toUpperCase(), second)).toBe(true);
    expect(usePrimeDexStore.getState().addTCGCustomCollectionCards(collectionId, [third, first])).toBe(1);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0].cardOrder).toEqual([
      { cardId: first.cardId, language: first.language, copyIndex: 0 },
      { cardId: second.cardId, language: second.language, copyIndex: 0 },
      { cardId: third.cardId, language: third.language, copyIndex: 0 },
    ]);

    expect(usePrimeDexStore.getState().removeTCGCustomCollectionCard(collectionId, second.cardId, second.language)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0].cardOrder).toEqual([
      { cardId: first.cardId, language: first.language, copyIndex: 0 },
      { cardId: third.cardId, language: third.language, copyIndex: 0 },
    ]);
    expect(usePrimeDexStore.getState().deleteTCGCustomCollection(collectionId)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts).toEqual([]);
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards).toEqual([]);
    setSyncAccessStatus('checking');
  });

  it('validates preset and whole-binder reorder without changing card ownership data', () => {
    setSyncAccessStatus('ready');
    resetCollectionState();
    const store = usePrimeDexStore.getState();
    const collectionId = store.createTCGCustomCollection('Mixed language binder');
    const first = { cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam' };
    const second = { cardId: 'base1-001', language: 'fr' as const, cardName: 'Alakazam' };
    const third = { cardId: 'base1-002', language: 'ja' as const, cardName: 'フシギダネ' };
    store.addTCGCustomCollectionCards(collectionId, [first, second, { ...third, quantity: 4 }]);
    store.setTCGCustomCollectionCardQuantity(collectionId, third.cardId, third.language, 7);
    usePrimeDexStore.setState({ tcgOwnedCards: ['base1-099'] });
    const cardsBefore = usePrimeDexStore.getState().tcgCustomCollectionCards.map((card) => ({ ...card }));
    const ownedBefore = [...usePrimeDexStore.getState().tcgOwnedCards];
    const order = [
      { cardId: third.cardId, language: third.language, copyIndex: 0, copyCount: 7 },
      { cardId: second.cardId, language: second.language, copyIndex: 0 },
      { cardId: first.cardId, language: first.language, copyIndex: 0 },
    ];

    expect(store.setTCGCustomCollectionGridPreset(collectionId, '4x4')).toBe(true);
    expect(usePrimeDexStore.getState().reorderTCGCustomCollectionCards(collectionId, order)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]).toEqual({ collectionId, gridPreset: '4x4', cardOrder: order });
    expect(usePrimeDexStore.getState().tcgCustomCollectionCards).toEqual(cardsBefore);
    expect(usePrimeDexStore.getState().tcgOwnedCards).toEqual(ownedBefore);

    const invalidPreset = '5x5' as Parameters<typeof store.setTCGCustomCollectionGridPreset>[1];
    expect(store.setTCGCustomCollectionGridPreset(collectionId, invalidPreset)).toBe(false);
    expect(store.setTCGCustomCollectionGridPreset('36e431a6-c3c1-46d4-804d-f5fa08f1af9d', '3x3')).toBe(false);
    expect(store.reorderTCGCustomCollectionCards(collectionId, order.slice(1))).toBe(false);
    expect(store.reorderTCGCustomCollectionCards(collectionId, [order[0], order[0], order[2]])).toBe(false);
    expect(store.reorderTCGCustomCollectionCards(collectionId, [order[0], order[1], { cardId: 'base1-999', language: 'en' }])).toBe(false);

    setSyncAccessStatus('checking');
    expect(usePrimeDexStore.getState().setTCGCustomCollectionGridPreset(collectionId, '3x3')).toBe(false);
    expect(usePrimeDexStore.getState().reorderTCGCustomCollectionCards(collectionId, order)).toBe(false);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]).toEqual({ collectionId, gridPreset: '4x4', cardOrder: order });
    setSyncAccessStatus('checking');
  });

  it('reconciles physical pocket runs when quantity changes and preserves a moved copy', () => {
    setSyncAccessStatus('ready');
    resetCollectionState();
    const store = usePrimeDexStore.getState();
    const collectionId = store.createTCGCustomCollection('Physical binder');
    const repeated = { cardId: 'base1-004', language: 'en' as const, cardName: 'Card Four' };
    const wanted = { cardId: 'base1-005', language: 'fr' as const, cardName: 'Card Five' };
    store.addTCGCustomCollectionCards(collectionId, [
      { ...repeated, quantity: 3 },
      { ...wanted, quantity: 0 },
    ]);
    expect(store.setTCGCustomCollectionGridPreset(collectionId, '2x2')).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]?.cardOrder).toEqual([
      { cardId: repeated.cardId, language: repeated.language, copyIndex: 0, copyCount: 3 },
      { cardId: wanted.cardId, language: wanted.language, copyIndex: 0 },
    ]);

    const layoutOrder = usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]!.cardOrder;
    const moved = moveTCGCustomCollectionLayoutCard(layoutOrder, { ...repeated, copyIndex: 2 }, 0)!;
    expect(store.reorderTCGCustomCollectionCards(collectionId, moved.cardOrder)).toBe(true);
    expect(store.setTCGCustomCollectionCardQuantity(collectionId, repeated.cardId, repeated.language, 4)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]?.cardOrder).toEqual([
      { cardId: repeated.cardId, language: repeated.language, copyIndex: 2 },
      { cardId: repeated.cardId, language: repeated.language, copyIndex: 0, copyCount: 2 },
      { cardId: repeated.cardId, language: repeated.language, copyIndex: 3 },
      { cardId: wanted.cardId, language: wanted.language, copyIndex: 0 },
    ]);
    expect(store.setTCGCustomCollectionCardQuantity(collectionId, repeated.cardId, repeated.language, 0)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]?.cardOrder).toEqual([
      { cardId: repeated.cardId, language: repeated.language, copyIndex: 0 },
      { cardId: wanted.cardId, language: wanted.language, copyIndex: 0 },
    ]);
    expect(store.removeTCGCustomCollectionCard(collectionId, repeated.cardId, repeated.language)).toBe(true);
    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts[0]?.cardOrder).toEqual([
      { cardId: wanted.cardId, language: wanted.language, copyIndex: 0 },
    ]);
    setSyncAccessStatus('checking');
  });

  it('derives a lazy default order from card membership without persisting a layout', () => {
    setSyncAccessStatus('ready');
    resetCollectionState();
    const collectionId = usePrimeDexStore.getState().createTCGCustomCollection('Legacy');
    usePrimeDexStore.getState().addTCGCustomCollectionCards(collectionId, [
      { cardId: 'base1-002', language: 'en', cardName: 'Dracaufeu' },
      { cardId: 'base1-001', language: 'en', cardName: 'Alakazam' },
    ]);

    expect(usePrimeDexStore.getState().tcgCustomCollectionLayouts).toEqual([]);
    expect(getTCGCustomCollectionLayout(collectionId, [], usePrimeDexStore.getState().tcgCustomCollectionCards)).toEqual({
      collectionId,
      gridPreset: '3x3',
      cardOrder: usePrimeDexStore.getState().tcgCustomCollectionCards.map(({ cardId, language }) => ({ cardId, language, copyIndex: 0 })),
    });
    setSyncAccessStatus('checking');
  });

  it('starts a collection only after its first card is added', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('en', 'sv10')!;
    resetCollectionState();

    usePrimeDexStore.getState().createTCGCollection('sv10', 'en');
    expect(usePrimeDexStore.getState().tcgActiveCollections).not.toContain(collection);

    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'sv10-001', 'normal', 1);
    expect(usePrimeDexStore.getState().tcgActiveCollections).toContain(collection);
    setSyncAccessStatus('checking');
  });

  it('stops a collection when its last card is removed', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('en', 'sv10')!;
    resetCollectionState();

    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'sv10-001', 'normal', 1);
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'sv10-001', 'normal', 0);
    expect(usePrimeDexStore.getState().tcgActiveCollections).not.toContain(collection);
    setSyncAccessStatus('checking');
  });

  it('updates collection quantities atomically and keeps physical/progress projections distinct', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    resetCollectionState();
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'normal', 2);
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'reverse', 3);

    expect(usePrimeDexStore.getState().tcgOwnedCards).toEqual(['base1-001']);
    expect(usePrimeDexStore.getState().getTCGPhysicalCardCount()).toBe(5);

    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'normal', 0);
    expect(usePrimeDexStore.getState().getTCGPhysicalCardCount()).toBe(3);
    expect(usePrimeDexStore.getState().tcgCollectionCards).toHaveLength(1);
    setSyncAccessStatus('checking');
  });

  it('enforces the physical cap across historical and language-aware ownership', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const legacyCards = Array.from({ length: 10_000 }, (_, index) => `legacy-${index}`);
    resetCollectionState(legacyCards);

    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'normal', 1);
    expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual([]);
    usePrimeDexStore.getState().toggleTCGOwned('base1-001');
    expect(usePrimeDexStore.getState().tcgLegacyOwnedCards).toEqual(legacyCards);
    expect(usePrimeDexStore.getState().getTCGPhysicalCardCount()).toBe(10_000);
    setSyncAccessStatus('checking');
  });

  it('applies quantity adjustments from the latest store snapshot', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('fr', 'me05')!;
    resetCollectionState();

    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', 2);
    usePrimeDexStore.getState().adjustTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', -1);
    expect(getTCGCollectionCardQuantity(collection, 'me05-100', 'holo', usePrimeDexStore.getState().tcgCollectionCards)).toBe(1);
    usePrimeDexStore.getState().adjustTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', 1);
    expect(getTCGCollectionCardQuantity(collection, 'me05-100', 'holo', usePrimeDexStore.getState().tcgCollectionCards)).toBe(2);
    setSyncAccessStatus('checking');
  });

  it('moves a legacy copy into the selected finish instead of duplicating it', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('fr', 'me05')!;
    resetCollectionState(['me05-100']);

    usePrimeDexStore.getState().adjustTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', 1);
    const state = usePrimeDexStore.getState();
    expect(getTCGCollectionCardQuantity(collection, 'me05-100', 'holo', state.tcgCollectionCards)).toBe(1);
    expect(state.tcgLegacyOwnedCards).toEqual([]);
    expect(state.getTCGPhysicalCardCount()).toBe(1);
    setSyncAccessStatus('checking');
  });

  it('promotes an unspecified entry to a selected finish in one store update', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('fr', 'base1')!;
    resetCollectionState();

    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'unspecified', 2);
    usePrimeDexStore.getState().qualifyTCGCollectionCardVariant(collection, 'base1-001', 'holo');
    expect(getTCGCollectionCardOwnerships(collection, usePrimeDexStore.getState().tcgCollectionCards)).toMatchObject([
      { variant: 'holo', quantity: 2 },
    ]);
    setSyncAccessStatus('checking');
  });
});
