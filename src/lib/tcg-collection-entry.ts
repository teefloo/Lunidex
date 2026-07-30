export interface CollectionEntry {
  mode: 'start' | 'resume';
  path: '/tcg/start?source=home_cta' | '/tcg/collection';
}

interface ResolveCollectionEntryInput {
  hasHydrated: boolean;
  ownedCount: number;
}

export function resolveCollectionEntry({ hasHydrated, ownedCount }: ResolveCollectionEntryInput): CollectionEntry {
  if (!hasHydrated || ownedCount <= 0) {
    return { mode: 'start', path: '/tcg/start?source=home_cta' };
  }

  return { mode: 'resume', path: '/tcg/collection' };
}
