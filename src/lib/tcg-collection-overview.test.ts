import { describe, expect, it } from 'vitest';
import {
  buildTCGCollectionOverviewEntries,
  sortTCGCollectionEntriesByRelease,
} from './tcg-collection-overview';

describe('TCG collection overview ordering', () => {
  it('builds one collection entry for every catalog set', () => {
    const entries = buildTCGCollectionOverviewEntries([
      { id: 'sv10', name: 'Destined Rivals', totalCards: 182, releaseRank: 0, dataLanguage: 'en' },
      { id: 'base1', name: 'Base Set', totalCards: 102, releaseRank: 99, dataLanguage: 'en' },
    ], 'en');

    expect(entries.map((entry) => entry.collectionKey)).toEqual([
      'tcg2:en:sv10',
      'tcg2:en:base1',
    ]);
    expect(entries).toHaveLength(2);
  });

  it('keeps every collection and places the most recent release first', () => {
    const entries = [
      { collectionKey: 'tcg2:en:base1', set: { id: 'base1', name: 'Base Set', releaseRank: 99 }, language: 'en' },
      { collectionKey: 'tcg2:en:sv10', set: { id: 'sv10', name: 'Destined Rivals', releaseRank: 0 }, language: 'en' },
      { collectionKey: 'tcg2:en:sv9', set: { id: 'sv9', name: 'Journey Together', releaseRank: 1 }, language: 'en' },
    ];

    const sorted = sortTCGCollectionEntriesByRelease(entries);

    expect(sorted.map((entry) => entry.set.id)).toEqual(['sv10', 'sv9', 'base1']);
    expect(sorted).toHaveLength(entries.length);
  });
});
