import { describe, expect, it } from 'vitest';
import { encodeTCGCollectionCardKey, encodeTCGCollectionKey } from '@primedex/core/lib/tcg-collections';
import { normalizeUserStateData } from './tcg-owned-cards';

describe('user state TCG v1/v2/v3 normalization', () => {
  it('migrates an old payload to legacy ownership without inferring a language', () => {
    const normalized = normalizeUserStateData({ tcgOwnedCards: ['base1-001', 'base1-002'] });
    expect(normalized).toMatchObject({ tcgOwnedCards: ['base1-001', 'base1-002'], tcgLegacyOwnedCards: ['base1-001', 'base1-002'], tcgCollections: [], tcgCollectionCards: [], tcgActiveCollections: [], tcgBrowseLanguage: 'en', tcgDisplayCurrency: 'EUR', tcgCollectionModelVersion: 3 });
  });
  it('keeps historical card identifiers intact while copying the v1 list', () => {
    const normalized = normalizeUserStateData({ tcgOwnedCards: ['BASE1-001', 'sv-03.5-002'] });
    expect(normalized?.tcgLegacyOwnedCards).toEqual(['BASE1-001', 'sv-03.5-002']);
    expect(normalized?.tcgOwnedCards).toEqual(['base1-001', 'sv-03.5-002']);
  });
  it('does not discard a historical identifier outside the current card-token shape', () => {
    const normalized = normalizeUserStateData({ tcgOwnedCards: ['legacy/card/001'] });
    expect(normalized?.tcgLegacyOwnedCards).toEqual(['legacy/card/001']);
    expect(normalized?.tcgOwnedCards).toEqual(['legacy/card/001']);
  });
  it('accepts two language collections and rebuilds the compatibility index', () => {
    const fr = encodeTCGCollectionKey('fr', 'base1')!; const ja = encodeTCGCollectionKey('ja', 'base1')!;
    const cards = [encodeTCGCollectionCardKey(fr, 'base1-001')!, encodeTCGCollectionCardKey(ja, 'base1-001')!];
    const normalized = normalizeUserStateData({ tcgCollections: [fr, ja], tcgCollectionCards: cards, tcgActiveCollections: [fr, ja], tcgLegacyOwnedCards: [], tcgBrowseLanguage: 'fr' });
    expect(normalized?.tcgOwnedCards).toEqual(['base1-001']);
    expect(normalized?.tcgCollectionCards).toEqual(cards);
  });

  it('normalizes v3 quantities and rejects a physical total above 10,000', () => {
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const normalized = normalizeUserStateData({
      tcgCollectionModelVersion: 3,
      tcgCollections: [collection],
      tcgCollectionCards: [
        encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 2),
        encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 3),
      ],
      tcgActiveCollections: [collection],
      tcgLegacyOwnedCards: [],
      tcgOwnedCards: [],
    });
    expect(normalized?.tcgCollectionCards).toEqual([encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 5)]);
    expect(normalizeUserStateData({
      tcgCollectionModelVersion: 3,
      tcgCollections: [collection],
      tcgCollectionCards: [encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 10_000)],
      tcgActiveCollections: [collection],
      tcgLegacyOwnedCards: ['base1-002'],
      tcgOwnedCards: [],
    })).toBeNull();
  });
  it('does not reinterpret a partial v2 compatibility index as historical cards', () => {
    const collection = encodeTCGCollectionKey('fr', 'base1')!; const card = encodeTCGCollectionCardKey(collection, 'base1-001')!;
    const normalized = normalizeUserStateData({ tcgCollectionModelVersion: 2, tcgOwnedCards: ['base1-001'], tcgCollections: [collection], tcgCollectionCards: [card], tcgActiveCollections: [collection] });
    expect(normalized?.tcgLegacyOwnedCards).toEqual([]); expect(normalized?.tcgOwnedCards).toEqual(['base1-001']);
  });

  it('keeps v1 cards when an importer has appended empty v2 arrays', () => {
    const normalized = normalizeUserStateData({
      tcgOwnedCards: ['base1-001'],
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
    });
    expect(normalized?.tcgLegacyOwnedCards).toEqual(['base1-001']);
  });
  it('keeps v1 cards when an importer has appended an empty legacy field', () => {
    const normalized = normalizeUserStateData({
      tcgOwnedCards: ['base1-001'],
      tcgLegacyOwnedCards: [],
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
    });
    expect(normalized?.tcgLegacyOwnedCards).toEqual(['base1-001']);
  });
  it('honours an explicit v1 marker even when empty v2 fields are present', () => {
    const normalized = normalizeUserStateData({
      tcgCollectionModelVersion: 1,
      tcgOwnedCards: ['base1-001'],
      tcgLegacyOwnedCards: [],
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
    });
    expect(normalized?.tcgLegacyOwnedCards).toEqual(['base1-001']);
  });
  it('rejects invalid languages and dangling collection references', () => {
    expect(normalizeUserStateData({ tcgBrowseLanguage: 'zh' })).toBeNull();
    expect(normalizeUserStateData({ tcgDisplayCurrency: 'GBP' })).toBeNull();
    const collection = encodeTCGCollectionKey('fr', 'base1')!; const card = encodeTCGCollectionCardKey(collection, 'base1-001')!;
    expect(normalizeUserStateData({ tcgCollectionCards: [card], tcgCollections: [] })).toBeNull();
    expect(normalizeUserStateData({ tcgCollectionModelVersion: 99 })).toBeNull();
    expect(normalizeUserStateData({ tcgOwnedCards: ['base1-001'], tcgLegacyOwnedCards: {} })).toBeNull();
  });
});
