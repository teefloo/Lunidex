export const TCG_COLLECTION_HISTORY_TARGET_KEY = 'lunidex:tcg-collection-return-target';

export function shouldUseTCGCollectionHistoryBack(
  storedTarget: string | null,
  currentPath: string,
  hasCollectionReturn: boolean,
): boolean {
  return hasCollectionReturn && storedTarget !== null && storedTarget === currentPath;
}
