'use client';

import { useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { usePrimeDexStore } from '@/store/primedex';
import { getSupabaseClient } from './client';
import { AuthContext } from './AuthProvider';
import {
  advanceSyncMetadata,
  applySyncState,
  buildSyncPayload,
  extractSyncMetadata,
  getInitialSyncState,
  normalizeSyncMetadata,
  pickSyncState,
  reconcileSyncState,
  type SyncMetadata,
} from './sync-state';

const TABLE = 'user_state';
const DEBOUNCE_MS = 1200;
const ANONYMOUS_STORAGE_KEY = 'primedex-storage:anonymous';
const SYNC_METADATA_PREFIX = 'primedex-sync-metadata:';
const DEVICE_ID_STORAGE_KEY = 'primedex-sync-device-id';

type Snapshot = ReturnType<typeof pickSyncState>;

interface PersistedMetadataRecord {
  state?: { metadata?: unknown; deviceId?: unknown };
}

interface MetadataStorage {
  getItem: (name: string) => Promise<PersistedMetadataRecord | null>;
  setItem: (name: string, value: PersistedMetadataRecord) => Promise<void>;
}

function storageKeyForUser(userId: string | null): string {
  return userId ? `primedex-storage:user:${userId}` : ANONYMOUS_STORAGE_KEY;
}

function metadataKeyForUser(userId: string | null): string {
  return `${SYNC_METADATA_PREFIX}${userId ?? 'anonymous'}`;
}

function getMetadataStorage(): MetadataStorage | undefined {
  return usePrimeDexStore.persist.getOptions().storage as unknown as MetadataStorage | undefined;
}

async function storageHasSnapshot(name: string): Promise<boolean> {
  return (await getMetadataStorage()?.getItem(name)) !== null;
}

async function readMetadata(userId: string | null): Promise<unknown> {
  return (await getMetadataStorage()?.getItem(metadataKeyForUser(userId)))?.state?.metadata;
}

async function writeMetadata(userId: string | null, metadata: SyncMetadata): Promise<void> {
  await getMetadataStorage()?.setItem(metadataKeyForUser(userId), { state: { metadata } });
}

function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getDeviceId(): Promise<string> {
  const storage = getMetadataStorage();
  const existing = (await storage?.getItem(DEVICE_ID_STORAGE_KEY))?.state?.deviceId;
  if (typeof existing === 'string' && existing.length > 0) return existing;
  const deviceId = createDeviceId();
  await storage?.setItem(DEVICE_ID_STORAGE_KEY, { state: { deviceId } });
  return deviceId;
}

async function switchPersistenceScope(userId: string | null): Promise<boolean> {
  const name = storageKeyForUser(userId);
  const hasSnapshot = await storageHasSnapshot(name);
  usePrimeDexStore.persist.setOptions({ name });
  if (hasSnapshot) await usePrimeDexStore.persist.rehydrate();
  else applySyncState(getInitialSyncState());
  return hasSnapshot;
}

async function preserveAnonymousSnapshot(snapshot: Snapshot): Promise<void> {
  if (await storageHasSnapshot(ANONYMOUS_STORAGE_KEY)) return;
  usePrimeDexStore.persist.setOptions({ name: ANONYMOUS_STORAGE_KEY });
  applySyncState(snapshot);
}

/** Local-first sync with field stamps and collection tombstones. */
export function useSupabaseSync(): void {
  const ctx = useContext(AuthContext);
  const user = ctx?.user ?? null;
  const enabled = ctx?.enabled ?? false;
  const hasHydrated = usePrimeDexStore((s) => s._hasHydrated);
  const userId = user?.id ?? null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const previousSnapshotRef = useRef<Snapshot | null>(null);
  const metadataRef = useRef<SyncMetadata | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!hasHydrated) return;
    if (!enabled || !supabase || !userId) {
      if (activeUserIdRef.current !== null) {
        activeUserIdRef.current = null;
        metadataRef.current = null;
        previousSnapshotRef.current = null;
        void switchPersistenceScope(null);
      }
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const applyReconciliation = async (state: Snapshot, metadata: SyncMetadata): Promise<void> => {
      applyingRemoteRef.current = true;
      applySyncState(state);
      applyingRemoteRef.current = false;
      metadataRef.current = metadata;
      previousSnapshotRef.current = pickSyncState();
      await writeMetadata(userId, metadata);
    };

    const push = async (): Promise<void> => {
      const deviceId = deviceIdRef.current;
      if (!deviceId || cancelled) return;
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        const local = pickSyncState();
        const localMetadata = metadataRef.current ?? normalizeSyncMetadata(undefined, local);
        const { data: remoteRow, error: loadError } = await supabase
          .from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle();
        if (loadError) {
          console.warn('[supabase-sync] failed to load before save:', loadError.message);
          return;
        }
        const remoteSnapshot = remoteRow?.data ?? {};
        const reconciled = reconcileSyncState(local, remoteSnapshot as Partial<Snapshot>, localMetadata,
          extractSyncMetadata(remoteSnapshot), { deviceId });
        await applyReconciliation(reconciled.state, reconciled.metadata);
        const payload = buildSyncPayload(remoteSnapshot, reconciled.state, reconciled.metadata);

        if (!remoteRow) {
          const { error } = await supabase.from(TABLE).insert({ user_id: userId, data: payload });
          if (!error) return;
          // A competing first insert is resolved by re-reading and merging.
          if (attempt === 2) console.warn('[supabase-sync] failed to create:', error.message);
          continue;
        }
        const { data: updated, error } = await supabase.from(TABLE)
          .update({ data: payload }).eq('user_id', userId).eq('updated_at', remoteRow.updated_at)
          .select('updated_at').maybeSingle();
        if (!error && updated) return;
        if (error && attempt === 2) console.warn('[supabase-sync] failed to save:', error.message);
      }
    };

    const schedulePush = (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { void push(); }, DEBOUNCE_MS);
    };

    const init = async (): Promise<void> => {
      const deviceId = await getDeviceId();
      if (cancelled) return;
      deviceIdRef.current = deviceId;
      const local = pickSyncState();
      const hasPreviousAccount = activeUserIdRef.current !== null && activeUserIdRef.current !== userId;
      if (!hasPreviousAccount) await preserveAnonymousSnapshot(local);
      const hasAccountSnapshot = await switchPersistenceScope(userId);
      const localForMerge = hasAccountSnapshot ? pickSyncState()
        : hasPreviousAccount ? getInitialSyncState() : local;
      const metadataScope = hasAccountSnapshot || hasPreviousAccount ? userId : null;
      const localMetadata = await readMetadata(metadataScope);
      const { data: remoteRow, error } = await supabase.from(TABLE)
        .select('data, updated_at').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[supabase-sync] failed to load:', error.message);
        toast.error('Could not load your saved data.');
        return;
      }
      const remoteSnapshot = remoteRow?.data ?? {};
      const reconciled = reconcileSyncState(localForMerge, remoteSnapshot as Partial<Snapshot>, localMetadata,
        extractSyncMetadata(remoteSnapshot), { deviceId, preferLocalLegacyValues: !hasAccountSnapshot && !hasPreviousAccount });
      await applyReconciliation(reconciled.state, reconciled.metadata);
      activeUserIdRef.current = userId;
      unsubscribe = usePrimeDexStore.subscribe(() => {
        const next = pickSyncState();
        const previous = previousSnapshotRef.current;
        if (applyingRemoteRef.current || !previous || JSON.stringify(previous) === JSON.stringify(next)) {
          previousSnapshotRef.current = next;
          return;
        }
        const metadata = advanceSyncMetadata(metadataRef.current ?? normalizeSyncMetadata(undefined, previous), previous, next, deviceId);
        metadataRef.current = metadata;
        previousSnapshotRef.current = next;
        void writeMetadata(userId, metadata);
        schedulePush();
      });
      await push();
    };

    void init();
    const onOnline = (): void => schedulePush();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe?.();
    };
  }, [enabled, userId, hasHydrated]);
}
