export function getCachedTcgCardsOrThrow<T>(cached: T[] | null | undefined, error: unknown): T[] {
  if (cached !== null && cached !== undefined) return cached;
  throw error;
}
