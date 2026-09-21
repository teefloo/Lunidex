import { describe, expect, it } from 'vitest';
import {
  buildTCGCollectionOverviewEntries,
  filterTCGCollectionOverviewEntries,
  getTCGCollectionCatalogDisplay,
  normalizeTCGCollectionReturnQuery,
  parseTCGCollectionUrlState,
  serializeTCGCollectionUrlState,
  sortTCGCollectionEntriesByRelease,
  type TCGCollectionOverviewEntryWithProgress,
} from './tcg-collection-overview';

function entry(
  id: string,
  name: string,
  releaseRank: number,
  owned: number,
  total = 10,
): TCGCollectionOverviewEntryWithProgress {
  return {
    collectionKey: `tcg2:en:${id}`,
    language: 'en',
    set: { id, name, totalCards: total, releaseRank, dataLanguage: 'en' },
    ownedIds: new Set(owned > 0 ? [`${id}-1`] : []),
    ownedVariants: owned > 0 ? [{ cardId: `${id}-1`, variant: 'normal', quantity: owned }] : [],
    completion: {
      owned: Math.min(owned, total),
      total,
      percentage: total > 0 ? Math.round((Math.min(owned, total) / total) * 100) : 0,
    },
  };
}

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

describe('TCG collection overview URL state', () => {
  it('uses the personal recent-release view for missing or invalid values', () => {
    expect(parseTCGCollectionUrlState(new URLSearchParams())).toEqual({
      view: 'mine',
      query: '',
      sort: 'release-newest',
      incompleteOnly: false,
    });
    expect(parseTCGCollectionUrlState(new URLSearchParams('view=other&sort=price&incomplete=yes&q=%20%20Darkrai%20'))).toEqual({
      view: 'mine',
      query: 'Darkrai',
      sort: 'release-newest',
      incompleteOnly: false,
    });
  });

  it('serializes only non-default collection state', () => {
    expect(serializeTCGCollectionUrlState({
      view: 'all',
      query: 'Darkrai',
      sort: 'name-asc',
      incompleteOnly: true,
    })).toBe('view=all&q=Darkrai&sort=name-asc&incomplete=1');
    expect(serializeTCGCollectionUrlState({
      view: 'mine',
      query: '',
      sort: 'release-newest',
      incompleteOnly: false,
    })).toBe('');
  });

  it('keeps only validated collection state in an album return query', () => {
    expect(normalizeTCGCollectionReturnQuery('view=all&q=Darkrai&sort=name-asc&incomplete=1&tcgLang=ja&next=https%3A%2F%2Fevil.example')).toBe(
      'view=all&q=Darkrai&sort=name-asc&incomplete=1&tcgLang=ja',
    );
    expect(normalizeTCGCollectionReturnQuery(undefined)).toBe('');
  });
});

describe('TCG collection overview selection', () => {
  const entries = [
    entry('complete', 'Complete Set', 3, 10),
    entry('progress', 'Progress Set', 2, 4),
    entry('missing', 'Missing Set', 1, 0),
  ];

  it('keeps completed personal sets until the incomplete filter is enabled', () => {
    const personal = filterTCGCollectionOverviewEntries(entries, {
      view: 'mine', query: '', sort: 'release-newest', incompleteOnly: false,
    });
    const incomplete = filterTCGCollectionOverviewEntries(entries, {
      view: 'mine', query: '', sort: 'release-newest', incompleteOnly: true,
    });

    expect(personal.map((candidate) => candidate.set.id)).toEqual(['progress', 'complete']);
    expect(incomplete.map((candidate) => candidate.set.id)).toEqual(['progress']);
  });

  it('searches the complete catalog before the caller applies a display cap', () => {
    const catalog = [
      ...Array.from({ length: 24 }, (_, index) => entry(`old-${index}`, `Old Set ${index}`, index + 1, 0)),
      entry('target', 'Darkrai Discovery', 30, 0),
    ];

    const result = filterTCGCollectionOverviewEntries(catalog, {
      view: 'all', query: 'darkrai', sort: 'release-newest', incompleteOnly: false,
    });

    expect(result.map((candidate) => candidate.set.id)).toEqual(['target']);
    expect(result.slice(0, 24)).toHaveLength(1);
  });

  it('uses deterministic name ordering when names and release ranks tie', () => {
    const result = filterTCGCollectionOverviewEntries([
      entry('b', 'Alpha', 1, 0),
      entry('a', 'Alpha', 1, 0),
      entry('z', 'Zeta', 1, 0),
    ], {
      view: 'all', query: '', sort: 'name-asc', incompleteOnly: false,
    });

    expect(result.map((candidate) => candidate.set.id)).toEqual(['a', 'b', 'z']);
  });

  it('limits catalog rendering only after filtering and reports more results', () => {
    const catalog = Array.from({ length: 25 }, (_, index) => entry(
      `set-${index}`,
      `Set ${index}`,
      index,
      0,
    ));

    expect(getTCGCollectionCatalogDisplay(catalog, 24)).toMatchObject({
      total: 25,
      hasMore: true,
    });
    expect(getTCGCollectionCatalogDisplay(catalog, 24).entries).toHaveLength(24);
    expect(getTCGCollectionCatalogDisplay(catalog, 48)).toMatchObject({
      total: 25,
      hasMore: false,
      entries: catalog,
    });
  });
});
