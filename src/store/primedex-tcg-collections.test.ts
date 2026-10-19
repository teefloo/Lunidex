import { describe, expect, it } from 'vitest';
import {
  encodeTCGCollectionKey,
  getTCGCollectionCardOwnerships,
  getTCGCollectionCardQuantity,
} from '@/lib/tcg-collections';
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
