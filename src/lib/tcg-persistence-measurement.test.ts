import { describe, expect, it } from 'vitest';
import { encodeTCGCollectionCardKey, encodeTCGCollectionKey } from './tcg-collections';
import { getFirstPersistedTcgValue, getPersistedTcgAddition } from './tcg-persistence-measurement';
const collection = encodeTCGCollectionKey('fr', 'sv01')!;
const one = encodeTCGCollectionCardKey(collection, 'sv01-1', 'normal', 1)!;
const two = encodeTCGCollectionCardKey(collection, 'sv01-1', 'normal', 2)!;

describe('confirmed TCG persistence', () => {
  it('recognizes the first accepted collection card without exposing it', () => {
    expect(getPersistedTcgAddition([], [one], [one])).toEqual({ set_id: 'sv01', tcg_language: 'fr' });
  });
  it('ignores failed writes, removals, no-ops and corrupt records', () => {
    expect(getPersistedTcgAddition([], [], [one])).toBeUndefined();
    expect(getPersistedTcgAddition([one], [], [])).toBeUndefined();
    expect(getPersistedTcgAddition([one], [one], [one])).toBeUndefined();
    expect(getPersistedTcgAddition([], ['bad'], ['bad'])).toBeUndefined();
  });
  it('ignores remote-only additions introduced during conflict reconciliation', () => {
    expect(getPersistedTcgAddition([], [one], [])).toBeUndefined();
  });
  it('recognizes a confirmed quantity increase', () => {
    expect(getPersistedTcgAddition([one], [two], [two])).toEqual({ set_id: 'sv01', tcg_language: 'fr' });
  });
  it('does not reactivate existing collections, including historical models', () => {
    expect(getFirstPersistedTcgValue({ tcgCollectionCards: [], tcgOwnedCards: ['old-1'] }, [one], [one])).toBeUndefined();
    expect(getFirstPersistedTcgValue({ tcgCollectionCards: [], tcgLegacyOwnedCards: ['old-1'] }, [one], [one])).toBeUndefined();
    expect(getFirstPersistedTcgValue({ tcgCollectionCards: [one] }, [two], [two])).toBeUndefined();
    expect(getFirstPersistedTcgValue({ tcgCollectionCards: [] }, [one], [one])).toEqual({ set_id: 'sv01', tcg_language: 'fr' });
  });

});
