import type { TCGCollectionSetSummary } from '@/types/tcg';
import { encodeTCGCollectionKey } from '@/lib/tcg-collections';
import { isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGOwnedVariant } from '@/lib/tcg-collection';
import { normalizeSearchText } from '@/lib/pokemon-filter-utils';

type CollectionReleaseEntry = {
  set: Pick<TCGCollectionSetSummary, 'id' | 'name' | 'releaseRank'>;
};

export interface TCGCollectionOverviewEntry {
  collectionKey: string;
  set: TCGCollectionSetSummary;
  language: TCGCardLanguage;
}

export type TCGCollectionView = 'mine' | 'all';

export const TCG_COLLECTION_SORT_MODES = [
  'progress',
  'release-newest',
  'release-oldest',
  'name-asc',
  'name-desc',
] as const;

export const TCG_COLLECTION_CATALOG_BATCH_SIZE = 24;

export type TCGCollectionSortMode = typeof TCG_COLLECTION_SORT_MODES[number];

export interface TCGCollectionUrlState {
  view: TCGCollectionView;
  query: string;
  sort: TCGCollectionSortMode;
  incompleteOnly: boolean;
}

export interface TCGCollectionOverviewEntryWithProgress extends TCGCollectionOverviewEntry {
  ownedIds: Set<string>;
  ownedVariants: readonly TCGOwnedVariant[];
  completion: {
    owned: number;
    total: number;
    percentage: number;
  };
}

const DEFAULT_COLLECTION_URL_STATE: TCGCollectionUrlState = {
  view: 'mine',
  query: '',
  sort: 'release-newest',
  incompleteOnly: false,
};

const collectionSortModes = new Set<TCGCollectionSortMode>(TCG_COLLECTION_SORT_MODES);

export function parseTCGCollectionUrlState(
  params: Pick<URLSearchParams, 'get'>,
): TCGCollectionUrlState {
  const view = params.get('view') === 'all' ? 'all' : DEFAULT_COLLECTION_URL_STATE.view;
  const sort = params.get('sort');

  return {
    view,
    query: params.get('q')?.trim() ?? '',
    sort: sort && collectionSortModes.has(sort as TCGCollectionSortMode)
      ? sort as TCGCollectionSortMode
      : DEFAULT_COLLECTION_URL_STATE.sort,
    incompleteOnly: params.get('incomplete') === '1',
  };
}

export function serializeTCGCollectionUrlState(state: TCGCollectionUrlState): string {
  const params = new URLSearchParams();
  const query = state.query.trim();

  if (state.view !== DEFAULT_COLLECTION_URL_STATE.view) params.set('view', state.view);
  if (query) params.set('q', query);
  if (state.sort !== DEFAULT_COLLECTION_URL_STATE.sort) params.set('sort', state.sort);
  if (state.incompleteOnly) params.set('incomplete', '1');

  return params.toString();
}

/** Whitelist collection filters before they are carried through an album URL. */
export function normalizeTCGCollectionReturnQuery(rawQuery: string | undefined): string {
  if (!rawQuery) return '';
  const params = new URLSearchParams(rawQuery);
  const serialized = new URLSearchParams(
    serializeTCGCollectionUrlState(parseTCGCollectionUrlState(params)),
  );
  const tcgLanguage = params.get('tcgLang');
  if (isTCGCardLanguage(tcgLanguage)) serialized.set('tcgLang', tcgLanguage);
  return serialized.toString();
}

export function buildTCGCollectionOverviewEntries(
  sets: readonly TCGCollectionSetSummary[],
  language: TCGCardLanguage,
): TCGCollectionOverviewEntry[] {
  return sets.flatMap((set) => {
    const collectionKey = encodeTCGCollectionKey(language, set.id);
    return collectionKey ? [{ collectionKey, set, language }] : [];
  });
}

/** Keep the catalog order aligned with TCGdex: releaseRank 0 is newest. */
export function sortTCGCollectionEntriesByRelease<T extends CollectionReleaseEntry>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((left, right) => (
    left.set.releaseRank - right.set.releaseRank
    || left.set.name.localeCompare(right.set.name)
    || left.set.id.localeCompare(right.set.id)
  ));
}

function compareEntriesByName(
  left: TCGCollectionOverviewEntryWithProgress,
  right: TCGCollectionOverviewEntryWithProgress,
  direction: 1 | -1,
): number {
  return direction * left.set.name.localeCompare(right.set.name)
    || left.set.releaseRank - right.set.releaseRank
    || left.set.id.localeCompare(right.set.id)
    || left.language.localeCompare(right.language);
}

/**
 * Select and order the complete collection result before callers apply a
 * presentation limit. This keeps catalog search independent of pagination.
 */
export function filterTCGCollectionOverviewEntries(
  entries: readonly TCGCollectionOverviewEntryWithProgress[],
  state: TCGCollectionUrlState,
): TCGCollectionOverviewEntryWithProgress[] {
  const normalizedQuery = normalizeSearchText(state.query);
  const selected = entries.filter((entry) => {
    const started = entry.ownedVariants.length > 0;
    const incomplete = entry.completion.total > 0 && entry.completion.owned < entry.completion.total;

    if (state.view === 'mine' && !started) return false;
    if (state.incompleteOnly && (!started || !incomplete)) return false;
    return !normalizedQuery || normalizeSearchText(entry.set.name).includes(normalizedQuery);
  });

  switch (state.sort) {
    case 'release-newest':
      return sortTCGCollectionEntriesByRelease(selected);
    case 'release-oldest':
      return [...selected].sort((left, right) => (
        right.set.releaseRank - left.set.releaseRank
        || left.set.name.localeCompare(right.set.name)
        || left.set.id.localeCompare(right.set.id)
        || left.language.localeCompare(right.language)
      ));
    case 'name-asc':
      return [...selected].sort((left, right) => compareEntriesByName(left, right, 1));
    case 'name-desc':
      return [...selected].sort((left, right) => compareEntriesByName(left, right, -1));
    case 'progress':
      return [...selected].sort((left, right) => (
        right.completion.percentage - left.completion.percentage
        || left.set.releaseRank - right.set.releaseRank
        || left.set.name.localeCompare(right.set.name)
        || left.set.id.localeCompare(right.set.id)
        || left.language.localeCompare(right.language)
      ));
  }
}

export function getTCGCollectionCatalogDisplay<T>(
  entries: readonly T[],
  visibleCount: number,
): { entries: T[]; total: number; hasMore: boolean } {
  const safeVisibleCount = Math.max(0, Math.trunc(visibleCount));
  const visibleEntries = entries.slice(0, safeVisibleCount);

  return {
    entries: visibleEntries,
    total: entries.length,
    hasMore: visibleEntries.length < entries.length,
  };
}
