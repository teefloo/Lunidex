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
  });
}

describe('web TCG collection store', () => {
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
