'use client';

import { useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { usePrimeDexStore } from '@/store/primedex';
import { getSupabaseClient } from './client';
import { AuthContext } from './AuthProvider';
import {
  applySyncState,
  buildSyncPayload,
  getInitialSyncState,
  mergeSyncState,
  pickSyncState,
} from './sync-state';

const TABLE = 'user_state';
const DEBOUNCE_MS = 1200;
const ANONYMOUS_STORAGE_KEY = 'primedex-storage:anonymous';

function storageKeyForUser(userId: string | null): string {
  return userId ? `primedex-storage:user:${userId}` : ANONYMOUS_STORAGE_KEY;
}

async function storageHasSnapshot(name: string): Promise<boolean> {
  const storage = usePrimeDexStore.persist.getOptions().storage;
  return (await storage?.getItem(name)) !== null;
}

async function switchPersistenceScope(userId: string | null): Promise<boolean> {
  const name = storageKeyForUser(userId);
  const hasSnapshot = await storageHasSnapshot(name);
  usePrimeDexStore.persist.setOptions({ name });

  if (hasSnapshot) {
    await usePrimeDexStore.persist.rehydrate();
  } else {
    applySyncState(getInitialSyncState());
  }

  return hasSnapshot;
}

async function preserveAnonymousSnapshot(snapshot: ReturnType<typeof pickSyncState>): Promise<void> {
  if (await storageHasSnapshot(ANONYMOUS_STORAGE_KEY)) return;

  usePrimeDexStore.persist.setOptions({ name: ANONYMOUS_STORAGE_KEY });
  applySyncState(snapshot);
}

/**
 * Bridges the local Zustand store with the signed-in user's `user_state` row.
 *
 *  - On sign-in: fetches the remote snapshot, merges it with the local one
 *    (local-first union — see mergeSyncState), applies the result to the store,
 *    then writes the merged snapshot back so both sides converge.
 *  - While signed in: pushes a debounced upsert whenever the synced slice of
 *    the store changes.
 *
 * Mounted once, near the app root. No-ops entirely when Supabase is unconfigured.
 */
export function useSupabaseSync(): void {
  const ctx = useContext(AuthContext);
  const user = ctx?.user ?? null;
  const enabled = ctx?.enabled ?? false;
  const hasHydrated = usePrimeDexStore((s) => s._hasHydrated);

  const lastPushedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteSnapshotRef = useRef<unknown>({});
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!hasHydrated) return;

    if (!enabled || !supabase || !user) {
      if (activeUserIdRef.current !== null) {
        activeUserIdRef.current = null;
        void switchPersistenceScope(null);
      }
      return;
    }

    let cancelled = false;
    const userId = user.id;

    const push = async (snapshot: ReturnType<typeof pickSyncState>) => {
      const payload = buildSyncPayload(remoteSnapshotRef.current, snapshot);
      const serialized = JSON.stringify(payload);
      if (serialized === lastPushedRef.current) return;
      lastPushedRef.current = serialized;

      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId, data: payload }, { onConflict: 'user_id' });

      if (error) {
        // Allow a retry on the next change.
        lastPushedRef.current = null;
        console.warn('[supabase-sync] failed to save:', error.message);
      }
    };

    const init = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn('[supabase-sync] failed to load:', error.message);
        toast.error('Could not load your saved data.');
        return;
      }

      remoteSnapshotRef.current = data?.data ?? {};
      const remote = remoteSnapshotRef.current as Partial<ReturnType<typeof pickSyncState>>;
      const local = pickSyncState();
      const hasPreviousAccount = activeUserIdRef.current !== null && activeUserIdRef.current !== userId;

      if (!hasPreviousAccount) {
        await preserveAnonymousSnapshot(local);
      }

      const hasAccountSnapshot = await switchPersistenceScope(userId);
      const localForMerge = hasAccountSnapshot
        ? pickSyncState()
        : hasPreviousAccount
          ? getInitialSyncState()
          : local;
      const merged = mergeSyncState(localForMerge, remote);
      applySyncState(merged);
      activeUserIdRef.current = userId;

      // Persist the reconciled snapshot so the server reflects the merge.
      await push(pickSyncState());

      if (cancelled) return;

      // From now on, mirror local changes to the server (debounced).
      unsubscribe = usePrimeDexStore.subscribe(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void push(pickSyncState());
        }, DEBOUNCE_MS);
      });
    };

    let unsubscribe: (() => void) | undefined;
    void init();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe?.();
      lastPushedRef.current = null;
      remoteSnapshotRef.current = {};
    };
  }, [enabled, user, hasHydrated]);
}
