export interface CollectionEntry {
  mode: 'unavailable' | 'start' | 'resume';
  path: '#collection-access' | '/tcg/start?source=home_cta' | '/tcg/collection';
}

interface ResolveCollectionEntryInput {
  allowDemo?: boolean;
  serviceAvailable: boolean;
  isSignedIn: boolean;
  hasHydrated: boolean;
  ownedCount: number;
}

export function resolveCollectionEntry({ allowDemo = false, serviceAvailable, isSignedIn, hasHydrated, ownedCount }: ResolveCollectionEntryInput): CollectionEntry {
  if (!serviceAvailable && !(allowDemo && !isSignedIn)) {
    return { mode: 'unavailable', path: '#collection-access' };
  }

  if (isSignedIn && hasHydrated && ownedCount > 0) {
    return { mode: 'resume', path: '/tcg/collection' };
  }

  return { mode: 'start', path: '/tcg/start?source=home_cta' };
}
