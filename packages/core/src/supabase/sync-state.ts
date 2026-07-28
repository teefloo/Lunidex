import { usePrimeDexStore, SYNCED_KEYS, type PersistedState } from '../store/primedex';
import type { TCGSavedSearch, TCGUserCardEntry } from '../types/tcg';
import type { QuizSession, ActivityAction } from '../types/dashboard';

/**
 * Extracts the syncable snapshot from the live store. Mirrors the IndexedDB
 * `partialize`, so the same shape is written locally and remotely.
 */
export function pickSyncState(): PersistedState {
  const state = usePrimeDexStore.getState();
  return Object.fromEntries(SYNCED_KEYS.map((key) => [key, state[key]])) as PersistedState;
}

/**
 * Builds the JSONB payload written to the server without discarding keys that
 * this client does not understand yet. Web and mobile clients can be upgraded
 * independently, so an older client must preserve newer remote fields.
 */
export function buildSyncPayload(remote: unknown, snapshot: PersistedState): object {
  if (typeof remote !== 'object' || remote === null || Array.isArray(remote)) {
    return snapshot;
  }

  const knownKeys = new Set<string>(SYNCED_KEYS);
  const unknownEntries = Object.entries(remote).filter(([key]) => !knownKeys.has(key));
  return { ...Object.fromEntries(unknownEntries), ...snapshot };
}

/** Applies a (possibly partial) server snapshot onto the live store. */
export function applySyncState(snapshot: Partial<PersistedState>): void {
  usePrimeDexStore.setState(snapshot);
}

/* -------------------------------------------------------------------------- */
/* Merge strategy                                                             */
/* -------------------------------------------------------------------------- */

// Primitive arrays merged as a set union (order-insensitive collections).
const UNION_ARRAY_KEYS = new Set<keyof PersistedState>([
  'favorites',
  'caughtPokemon',
  'team',
  'badges',
  'compareList',
  'tcgCompareList',
  'tcgOwnedCards',
  'tcgWishlistCards',
  'tcgActiveSets',
  'selectedTypes',
  'selectedEggGroups',
  'selectedColors',
  'selectedShapes',
]);

// Numeric progress/score fields where the higher value wins (no data loss).
const MAX_NUMBER_KEYS = new Set<keyof PersistedState>([
  'bestStreak',
  'totalQuizCorrect',
  'visitCount',
]);

function unionArray<T>(local: T[], remote: T[]): T[] {
  return Array.from(new Set([...(remote ?? []), ...(local ?? [])]));
}

function mergeByKey<T>(local: T[], remote: T[], keyOf: (item: T) => string, cap?: number): T[] {
  const map = new Map<string, T>();
  // Remote first, then local overrides — local is the device the user just used.
  for (const item of remote ?? []) map.set(keyOf(item), item);
  for (const item of local ?? []) map.set(keyOf(item), item);
  const merged = Array.from(map.values());
  return cap ? merged.slice(0, cap) : merged;
}

function maxByKey(
  local: Record<string, number> = {},
  remote: Record<string, number> = {},
): Record<string, number> {
  const out: Record<string, number> = { ...remote };
  for (const [k, v] of Object.entries(local)) {
    out[k] = Math.max(out[k] ?? 0, v);
  }
  return out;
}

/**
 * Reconciles a freshly fetched server snapshot with the current local state at
 * sign-in time. Collections are unioned, scores keep their max, and scalar
 * preferences fall back to local when the server has no value yet. This is the
 * "local-first + merge on first login" behaviour: nothing the user did while
 * signed out is lost.
 */
export function mergeSyncState(
  local: PersistedState,
  remote: Partial<PersistedState>,
): PersistedState {
  const merged = { ...local } as PersistedState;

  for (const key of SYNCED_KEYS) {
    const remoteValue = remote[key];

    if (UNION_ARRAY_KEYS.has(key)) {
      (merged[key] as unknown) = unionArray(
        local[key] as unknown[],
        (remoteValue as unknown[]) ?? [],
      );
      continue;
    }

    if (MAX_NUMBER_KEYS.has(key)) {
      (merged[key] as unknown) = Math.max(
        (local[key] as number) ?? 0,
        (remoteValue as number) ?? 0,
      );
      continue;
    }

    switch (key) {
      case 'tcgSavedSearches':
        merged.tcgSavedSearches = mergeByKey(
          local.tcgSavedSearches,
          (remoteValue as TCGSavedSearch[]) ?? [],
          (s) => s.id,
          20,
        );
        break;
      case 'tcgCardNotes':
        merged.tcgCardNotes = mergeByKey(
          local.tcgCardNotes,
          (remoteValue as TCGUserCardEntry[]) ?? [],
          (n) => n.cardId,
        );
        break;
      case 'history':
        merged.history = mergeByKey(
          local.history,
          (remoteValue as PersistedState['history']) ?? [],
          (h) => String(h.id),
          10,
        );
        break;
      case 'quizHistory':
        merged.quizHistory = mergeByKey(
          local.quizHistory,
          (remoteValue as QuizSession[]) ?? [],
          (q) => q.id,
          100,
        );
        break;
      case 'recentActions':
        merged.recentActions = mergeByKey(
          local.recentActions,
          (remoteValue as ActivityAction[]) ?? [],
          (a) => a.id,
          50,
        );
        break;
      case 'quizHighScores':
        merged.quizHighScores = {
          classic: Math.max(local.quizHighScores.classic, remote.quizHighScores?.classic ?? 0),
          silhouette: Math.max(local.quizHighScores.silhouette, remote.quizHighScores?.silhouette ?? 0),
          stats: Math.max(local.quizHighScores.stats, remote.quizHighScores?.stats ?? 0),
          timeAttack: Math.max(local.quizHighScores.timeAttack, remote.quizHighScores?.timeAttack ?? 0),
        };
        break;
      case 'viewCount':
        merged.viewCount = maxByKey(local.viewCount, (remoteValue as Record<number, number>) ?? {});
        break;
      default:
        // Scalar preferences/filters: prefer the server value when it exists,
        // otherwise keep what the user has locally.
        if (remoteValue !== undefined && remoteValue !== null) {
          (merged[key] as unknown) = remoteValue;
        }
    }
  }

  return merged;
}
