function getTCGSetIdFromCardId(cardId: string): string | null {
  const normalized = cardId.trim().toLowerCase();
  const separatorIndex = normalized.lastIndexOf('-');
  if (separatorIndex <= 0 || separatorIndex === normalized.length - 1) return null;
  return normalized.slice(0, separatorIndex);
}

export function getTCGSetIdsFromWishlist(cardIds: readonly string[]): string[] {
  return [...new Set(cardIds
    .map(getTCGSetIdFromCardId)
    .filter((setId): setId is string => Boolean(setId)))]
    .sort((left, right) => left.localeCompare(right));
}
