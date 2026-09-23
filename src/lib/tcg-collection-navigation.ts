export const TCG_COLLECTION_HISTORY_TARGET_KEY = 'lunidex:tcg-collection-return-target';
export const TCG_COLLECTION_SCROLL_POSITION_KEY = 'lunidex:tcg-collection-scroll-position';
export const TCG_COLLECTION_SCROLL_RESTORE_KEY = 'lunidex:tcg-collection-scroll-restore';

export interface TCGCollectionScrollPosition {
  collectionPath: string;
  scrollY: number;
}

export function parseTCGCollectionScrollPosition(
  serialized: string | null,
): TCGCollectionScrollPosition | null {
  if (!serialized) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidate = parsed as Partial<TCGCollectionScrollPosition>;
    if (
      typeof candidate.collectionPath !== 'string'
      || !/^\/[a-z]{2}\/tcg\/collection(?:\?|$)/i.test(candidate.collectionPath)
      || typeof candidate.scrollY !== 'number'
      || !Number.isFinite(candidate.scrollY)
      || candidate.scrollY < 0
    ) {
      return null;
    }

    return {
      collectionPath: candidate.collectionPath,
      scrollY: candidate.scrollY,
    };
  } catch {
    return null;
  }
}

export function shouldUseTCGCollectionHistoryBack(
  storedTarget: string | null,
  currentPath: string,
  hasCollectionReturn: boolean,
): boolean {
  return hasCollectionReturn && storedTarget !== null && storedTarget === currentPath;
}
