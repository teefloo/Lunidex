import { describe, expect, it } from 'vitest';
import {
  addTCGCollectionCard,
  adjustTCGCollectionVariantQuantity,
  assignLegacyTCGSetToCollection,
  countPhysicalTCGCards,
  decodeTCGCollectionCardKey,
  decodeTCGCollectionKey,
  encodeTCGCollectionCardKey,
  encodeTCGCollectionKey,
  getTCGCollectionCardOwnerships,
  getTCGCollectionCardQuantity,
  getTCGCollectionCardIdentity,
  getTCGDefaultPhysicalVariant,
  isValidTCGCollectionKey,
  migrateLegacyTCGOwnedCards,
  normalizeTCGCollectionState,
  normalizeTCGCollectionCardKeys,
  normalizeTCGCollectionQuantity,
  qualifyTCGCollectionCardVariant,
  removeTCGCollectionCard,
  setTCGCollectionVariantQuantity,
  transferTCGCollectionCards,
} from './tcg-collections';
import { isTCGCardLanguage, normalizeTCGCardLanguage, TCG_CARD_LANGUAGES } from './tcg-language';
import { usePrimeDexStore } from '../store/primedex';
import { setSyncAccessStatus } from '../store/sync-access';

describe('TCG language registry', () => {
  it('contains official TCGdex codes independently from Lunidex locales', () => {
    expect(TCG_CARD_LANGUAGES).toContain('ja');
    expect(TCG_CARD_LANGUAGES).toContain('ko');
    expect(TCG_CARD_LANGUAGES).toContain('zh-cn');
    expect(TCG_CARD_LANGUAGES).toContain('zh-tw');
    expect(isTCGCardLanguage('fr')).toBe(true);
    expect(isTCGCardLanguage('zh')).toBe(false);
    expect(normalizeTCGCardLanguage('ZH-CN')).toBe('zh-cn');
  });
});

describe('TCG collection codecs', () => {
  it('updates the shared store atomically and keeps physical/progress projections distinct', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    usePrimeDexStore.setState({
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
      tcgLegacyOwnedCards: [],
      tcgOwnedCards: [],
      tcgCollectionModelVersion: 3,
    });
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
    usePrimeDexStore.setState({
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
      tcgLegacyOwnedCards: legacyCards,
      tcgOwnedCards: legacyCards,
      tcgCollectionModelVersion: 3,
    });
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'normal', 1);
    expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual([]);
    usePrimeDexStore.getState().toggleTCGOwned('base1-001');
    expect(usePrimeDexStore.getState().tcgLegacyOwnedCards).toEqual(legacyCards);
    expect(usePrimeDexStore.getState().getTCGPhysicalCardCount()).toBe(10_000);
    setSyncAccessStatus('checking');
  });

  it('round-trips a language/set collection and card key', () => {
    const collectionKey = encodeTCGCollectionKey('fr', 'sv-03.5');
    expect(collectionKey).toBe('tcg2:fr:sv-03.5');
    expect(isValidTCGCollectionKey(collectionKey)).toBe(true);
    expect(decodeTCGCollectionKey(collectionKey)).toMatchObject({ key: collectionKey, language: 'fr', setId: 'sv-03.5', modelVersion: 3 });
    const cardKey = encodeTCGCollectionCardKey(collectionKey!, 'sv-03.5-001');
    expect(cardKey).toBe('tcg2:fr:sv-03.5|sv-03.5-001|unspecified|1');
    expect(decodeTCGCollectionCardKey(cardKey)).toMatchObject({ collectionKey, cardId: 'sv-03.5-001', language: 'fr', setId: 'sv-03.5', variant: 'unspecified', quantity: 1, modelVersion: 3 });
  });

  it('decodes the compact v2 token', () => {
    const collection = encodeTCGCollectionKey('fr', 'base1')!;
    const decoded = decodeTCGCollectionCardKey(`${collection}|base1-001`);
    expect(decoded).toMatchObject({ cardId: 'base1-001', variant: 'unspecified', quantity: 1, modelVersion: 3 });
    expect(decoded?.key).toBe(`${collection}|base1-001|unspecified|1`);
  });

  it('stores several finishes and quantities under independent identities', () => {
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const normal = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 2)!;
    const reverse = encodeTCGCollectionCardKey(collection, 'base1-001', 'reverse', 3)!;
    const holo = encodeTCGCollectionCardKey(collection, 'base1-001', 'holo', 1)!;
    const cards = [normal, reverse, holo];
    expect(getTCGCollectionCardOwnerships(collection, cards).map(({ variant, quantity }) => ({ variant, quantity }))).toEqual([
      { variant: 'normal', quantity: 2 },
      { variant: 'reverse', quantity: 3 },
      { variant: 'holo', quantity: 1 },
    ]);
    expect(getTCGCollectionCardQuantity(collection, 'base1-001', 'reverse', cards)).toBe(3);
    expect(new Set(cards.map((entry) => getTCGCollectionCardIdentity(collection, 'base1-001', decodeTCGCollectionCardKey(entry)!.variant)))).toHaveLength(3);
    expect(countPhysicalTCGCards(cards, [])).toBe(6);
  });

  it('adjusts one copy at a time without collapsing a finish to zero', () => {
    const collection = encodeTCGCollectionKey('fr', 'me05')!;
    const twoHolo = encodeTCGCollectionCardKey(collection, 'me05-100', 'holo', 2)!;

    const oneHolo = adjustTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', -1, [twoHolo]);
    expect(getTCGCollectionCardQuantity(collection, 'me05-100', 'holo', oneHolo)).toBe(1);

    const noHolo = adjustTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', -1, oneHolo);
    expect(getTCGCollectionCardQuantity(collection, 'me05-100', 'holo', noHolo)).toBe(0);
  });

  it('applies +/- changes from the latest shared-store snapshot', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('fr', 'me05')!;
    usePrimeDexStore.setState({
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
      tcgLegacyOwnedCards: [],
      tcgOwnedCards: [],
      tcgCollectionModelVersion: 3,
    });
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
    usePrimeDexStore.setState({
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
      tcgLegacyOwnedCards: ['me05-100'],
      tcgOwnedCards: ['me05-100'],
      tcgCollectionModelVersion: 3,
    });
    usePrimeDexStore.getState().adjustTCGCollectionVariantQuantity(collection, 'me05-100', 'holo', 1);
    const state = usePrimeDexStore.getState();
    expect(getTCGCollectionCardQuantity(collection, 'me05-100', 'holo', state.tcgCollectionCards)).toBe(1);
    expect(state.tcgLegacyOwnedCards).toEqual([]);
    expect(state.getTCGPhysicalCardCount()).toBe(1);
    setSyncAccessStatus('checking');
  });

  it('chooses the least ambiguous available finish and promotes historical ownership', () => {
    expect(getTCGDefaultPhysicalVariant({ normal: true, reverse: true, holo: false })).toBe('normal');
    expect(getTCGDefaultPhysicalVariant({ holo: true, reverse: true })).toBe('holo');
    expect(getTCGDefaultPhysicalVariant({ normal: false, reverse: false, holo: false })).toBeNull();

    const collection = encodeTCGCollectionKey('fr', 'base1')!;
    const unspecified = encodeTCGCollectionCardKey(collection, 'base1-001', 'unspecified', 2)!;
    const existingHolo = encodeTCGCollectionCardKey(collection, 'base1-001', 'holo', 1)!;
    expect(qualifyTCGCollectionCardVariant(collection, 'base1-001', 'holo', [unspecified, existingHolo])).toEqual([
      encodeTCGCollectionCardKey(collection, 'base1-001', 'holo', 3),
    ]);
  });

  it('promotes an unspecified store entry in one collection update', () => {
    setSyncAccessStatus('ready');
    const collection = encodeTCGCollectionKey('fr', 'base1')!;
    usePrimeDexStore.setState({
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
      tcgLegacyOwnedCards: [],
      tcgOwnedCards: [],
      tcgCollectionModelVersion: 3,
    });
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collection, 'base1-001', 'unspecified', 2);
    usePrimeDexStore.getState().qualifyTCGCollectionCardVariant(collection, 'base1-001', 'holo');
    expect(getTCGCollectionCardOwnerships(collection, usePrimeDexStore.getState().tcgCollectionCards)).toMatchObject([
      { variant: 'holo', quantity: 2 },
    ]);
    setSyncAccessStatus('checking');
  });

  it('normalizes duplicate identities by summing quantities and removes at zero', () => {
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const first = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 2)!;
    const second = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 3)!;
    const normalized = normalizeTCGCollectionCardKeys([first, second]);
    expect(normalized).toEqual([encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 5)]);
    expect(setTCGCollectionVariantQuantity(collection, 'base1-001', 'normal', 0, normalized!)).toEqual([]);
  });

  it('rejects invalid quantities and the global physical limit', () => {
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    expect(normalizeTCGCollectionQuantity(0)).toBe(0);
    expect(normalizeTCGCollectionQuantity(10_000)).toBe(10_000);
    expect(normalizeTCGCollectionQuantity(1.5)).toBeNull();
    expect(normalizeTCGCollectionQuantity(-1)).toBeNull();
    expect(encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 0)).toBeNull();
    expect(encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 10_001)).toBeNull();
    const existing = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 10_000)!;
    expect(setTCGCollectionVariantQuantity(collection, 'base1-002', 'normal', 1, [existing])).toEqual([existing]);
    expect(setTCGCollectionVariantQuantity(collection, 'base1-002', 'normal', -1, [])).toEqual([]);
    expect(decodeTCGCollectionCardKey(`${collection}|base1-001|normal|1.5`)).toBeNull();
  });

  it('counts and removes language variants independently', () => {
    const french = encodeTCGCollectionKey('fr', 'base1')!;
    const japanese = encodeTCGCollectionKey('ja', 'base1')!;
    const frenchCard = encodeTCGCollectionCardKey(french, 'base1-001')!;
    const japaneseCard = encodeTCGCollectionCardKey(japanese, 'base1-001')!;
    expect(countPhysicalTCGCards([frenchCard, japaneseCard], [])).toBe(2);
    const remaining = removeTCGCollectionCard(french, 'base1-001', [frenchCard, japaneseCard]);
    expect(remaining).toEqual([japaneseCard]);
    expect(countPhysicalTCGCards(remaining, [])).toBe(1);
  });

  it('transfers one collection to another language while preserving physical variants and quantities', () => {
    const english = encodeTCGCollectionKey('en', 'base1')!;
    const french = encodeTCGCollectionKey('fr', 'base1')!;
    const sourceNormal = encodeTCGCollectionCardKey(english, 'base1-001', 'normal', 2)!;
    const sourceReverse = encodeTCGCollectionCardKey(english, 'base1-001', 'reverse', 1)!;
    const targetNormal = encodeTCGCollectionCardKey(french, 'base1-001', 'normal', 3)!;
    const before = countPhysicalTCGCards([sourceNormal, sourceReverse, targetNormal], []);

    const transferred = transferTCGCollectionCards(english, french, [sourceNormal, sourceReverse, targetNormal]);

    expect(transferred).not.toBeNull();
    expect(getTCGCollectionCardOwnerships(english, transferred ?? [])).toEqual([]);
    expect(getTCGCollectionCardOwnerships(french, transferred ?? []).map(({ variant, quantity }) => ({ variant, quantity }))).toEqual([
      { variant: 'normal', quantity: 5 },
      { variant: 'reverse', quantity: 1 },
    ]);
    expect(countPhysicalTCGCards(transferred ?? [], [])).toBe(before);
  });

  it('deduplicates additions without collapsing language variants', () => {
    const french = encodeTCGCollectionKey('fr', 'base1')!;
    const japanese = encodeTCGCollectionKey('ja', 'base1')!;
    let cards = addTCGCollectionCard(french, 'base1-001');
    cards = addTCGCollectionCard(french, 'base1-001', cards);
    cards = addTCGCollectionCard(japanese, 'base1-001', cards);
    expect(cards).toHaveLength(2);
  });

  it('copies v1 ownership without assigning a language or rewriting identifiers', () => {
    expect(migrateLegacyTCGOwnedCards({ tcgOwnedCards: ['BASE1-001', 'base1-002'] }).tcgLegacyOwnedCards).toEqual(['BASE1-001', 'base1-002']);
    expect(migrateLegacyTCGOwnedCards({ tcgOwnedCards: ['base1-001'], tcgLegacyOwnedCards: [] }).tcgLegacyOwnedCards).toEqual(['base1-001']);
  });

  it('normalizes a v1 state directly into the language-less legacy list', () => {
    const normalized = normalizeTCGCollectionState({ tcgOwnedCards: ['BASE1-001'] });
    expect(normalized.tcgLegacyOwnedCards).toEqual(['BASE1-001']);
    expect(normalized.tcgOwnedCards).toEqual(['base1-001']);
    expect(normalized.tcgCollections).toEqual([]);
  });

  it('honours an explicit v1 model marker when normalizing shared state', () => {
    const normalized = normalizeTCGCollectionState({
      tcgCollectionModelVersion: 1,
      tcgOwnedCards: ['base1-001'],
      tcgLegacyOwnedCards: [],
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
    });
    expect(normalized.tcgLegacyOwnedCards).toEqual(['base1-001']);
  });

  it('treats an empty legacy field plus empty v2 arrays as a v1 snapshot', () => {
    const normalized = normalizeTCGCollectionState({
      tcgOwnedCards: ['base1-001'],
      tcgLegacyOwnedCards: [],
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
    });
    expect(normalized.tcgLegacyOwnedCards).toEqual(['base1-001']);
  });

  it('upgrades a v2 language-aware snapshot to unspecified x1 tokens', () => {
    const collection = encodeTCGCollectionKey('fr', 'base1')!;
    const normalized = normalizeTCGCollectionState({
      tcgCollectionModelVersion: 2,
      tcgCollections: [collection],
      tcgCollectionCards: [`${collection}|base1-001`],
      tcgActiveCollections: [collection],
      tcgLegacyOwnedCards: [],
      tcgOwnedCards: ['base1-001'],
    });
    expect(normalized.tcgCollectionModelVersion).toBe(3);
    expect(normalized.tcgCollectionCards).toEqual([`${collection}|base1-001|unspecified|1`]);
    expect(normalized.tcgOwnedCards).toEqual(['base1-001']);
    expect(countPhysicalTCGCards(normalized.tcgCollectionCards, normalized.tcgLegacyOwnedCards)).toBe(1);
  });

  it('does not drop an atypical historical id during explicit attribution', () => {
    const result = assignLegacyTCGSetToCollection('base1', 'fr', ['base1-001', 'base1-']);
    expect(result.tcgLegacyOwnedCards).toEqual(['base1-']);
    expect(result.tcgCollectionCards).toEqual(['tcg2:fr:base1|base1-001|unspecified|1']);
  });

  it('preserves duplicate physical copies and historical cards when attribution hits the cap', () => {
    const collection = encodeTCGCollectionKey('fr', 'base1')!;
    const existing = encodeTCGCollectionCardKey(collection, 'base1-001', 'unspecified', 2)!;
    const duplicate = assignLegacyTCGSetToCollection('base1', 'fr', ['base1-001'], [existing]);
    expect(duplicate.tcgLegacyOwnedCards).toEqual([]);
    expect(decodeTCGCollectionCardKey(duplicate.tcgCollectionCards[0])?.quantity).toBe(3);

    const full = encodeTCGCollectionCardKey(collection, 'base1-002', 'normal', 10_000)!;
    const blocked = assignLegacyTCGSetToCollection('base1', 'fr', ['base1-001'], [full]);
    expect(blocked.tcgLegacyOwnedCards).toEqual(['base1-001']);
    expect(blocked.tcgCollectionCards).toEqual([full]);
  });

});
