'use client';

import { useEffect, useRef } from 'react';
import { notify } from '../platform/notify';
import { usePrimeDexStore } from '../store/primedex';
import { getSupabaseClient } from './client';
import { useAuth } from './AuthProvider';
import { applySyncState, buildSyncPayload, mergeSyncState, pickSyncState } from './sync-state';

const TABLE = 'user_state';
const DEBOUNCE_MS = 1200;

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
  const { user, enabled } = useAuth();
  const hasHydrated = usePrimeDexStore((s) => s._hasHydrated);

  const lastPushedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteSnapshotRef = useRef<unknown>({});

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!enabled || !supabase || !user || !hasHydrated) return;

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
        notify.error('Could not load your saved data.');
        return;
      }

      remoteSnapshotRef.current = data?.data ?? {};
      const remote = remoteSnapshotRef.current as Partial<ReturnType<typeof pickSyncState>>;
      const merged = mergeSyncState(pickSyncState(), remote);
      applySyncState(merged);

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
