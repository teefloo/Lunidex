import type { TCGSavedSearch, TCGUserCardEntry } from '@/types/tcg';

export interface TCGUserState {
  owned: TCGUserCardEntry[];
  wishlist: string[];
  watchlist: string[];
  savedSearches: TCGSavedSearch[];
  compare: string[];
}

export const DEFAULT_TCG_USER_STATE: TCGUserState = {
  owned: [],
  wishlist: [],
  watchlist: [],
  savedSearches: [],
  compare: [],
};

export const TCG_USER_STATE_COOKIE = 'primedex-tcg-user-state';

export function decodeTCGUserState(value?: string | null): TCGUserState {
  if (!value) return structuredClone(DEFAULT_TCG_USER_STATE);

  try {
    const parsed = JSON.parse(value) as Partial<TCGUserState>;
    return {
      owned: Array.isArray(parsed.owned) ? parsed.owned : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
      savedSearches: Array.isArray(parsed.savedSearches) ? parsed.savedSearches : [],
      compare: Array.isArray(parsed.compare) ? parsed.compare : [],
    };
  } catch {
    return structuredClone(DEFAULT_TCG_USER_STATE);
  }
}

export function encodeTCGUserState(state: TCGUserState): string {
  return JSON.stringify(state);
}
