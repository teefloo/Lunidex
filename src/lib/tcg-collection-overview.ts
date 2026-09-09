import type { TCGCollectionSetSummary } from '@/types/tcg';
import { encodeTCGCollectionKey } from '@/lib/tcg-collections';
import type { TCGCardLanguage } from '@/lib/tcg-language';

type CollectionReleaseEntry = {
  set: Pick<TCGCollectionSetSummary, 'id' | 'name' | 'releaseRank'>;
};

export interface TCGCollectionOverviewEntry {
  collectionKey: string;
  set: TCGCollectionSetSummary;
  language: TCGCardLanguage;
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
