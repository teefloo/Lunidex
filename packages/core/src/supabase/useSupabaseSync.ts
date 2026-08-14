import { useEffect, useRef, useState } from 'react';
import { notify } from '../platform/notify';
import { usePrimeDexStore } from '../store/primedex';
import { onSyncAccessRetry, setSyncAccessStatus } from '../store/sync-access';
import { fetchAppApi } from '../neon/client';
import { useAuth } from '../neon/AuthProvider';
import {
  advanceSyncMetadata,
  applySyncState,
  buildSyncPayload,
  extractSyncMetadata,
  getInitialSyncState,
  normalizeSyncMetadata,
  pickSyncState,
  reconcileRemoteState,
  reconcileSyncState,
  type SyncMetadata,
} from './sync-state';

// Give a card click a short coalescing window, then send one write. The
// remote version is cached between writes so the normal path is one PUT.
const SYNC_DEBOUNCE_MS = 100;

type Snapshot = ReturnType<typeof pickSyncState>;

interface RemoteState {
  data: unknown;
  updatedAt: string | null;
}

class RemoteStateError extends Error {
  constructor(public readonly status: number) {
    super(`User state unavailable (${status})`);
    this.name = 'RemoteStateError';
  }
}

interface SaveResult {
  saved: boolean;
  conflict: boolean;
  unauthenticated: boolean;
  remote: RemoteState | null;
}

let sessionDeviceId: string | null = null;

function createDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getDeviceId(): string {
  if (!sessionDeviceId) sessionDeviceId = createDeviceId();
  return sessionDeviceId;
}

async function loadRemoteState(): Promise<RemoteState> {
  const response = await fetchAppApi('/api/user-state', { cache: 'no-store' });
  if (!response.ok) throw new RemoteStateError(response.status);
  const payload = await response.json() as unknown;
  const candidate = typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? payload as { data?: unknown; updatedAt?: unknown }
    : {};
  return {
    data: candidate.data ?? {},
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
  };
}

async function saveRemoteState(data: object, expectedUpdatedAt: string | null): Promise<SaveResult> {
  const response = await fetchAppApi('/api/user-state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, expectedUpdatedAt }),
  });
  const payload = await response.json().catch(() => null) as unknown;
  const candidate = typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? payload as { data?: unknown; updatedAt?: unknown }
    : null;
  return {
    saved: response.ok,
    conflict: response.status === 409,
    unauthenticated: response.status === 401 || response.status === 403,
    remote: (response.ok || response.status === 409) && candidate
      ? {
        data: candidate.data ?? data,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : expectedUpdatedAt,
      }
      : null,
  };
}

/**
 * Online-only sync for the native app. AsyncStorage is not used as an account
 * snapshot; the remote user_state row is loaded before sync access is enabled.
 */
export function useNeonSync(): void {
  const { user, enabled, loading } = useAuth();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const userId = user?.id ?? null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSnapshotRef = useRef<Snapshot | null>(null);
  const acceptedSnapshotRef = useRef<Snapshot | null>(null);
  const acceptedMetadataRef = useRef<SyncMetadata | null>(null);
  const metadataRef = useRef<SyncMetadata | null>(null);
  const remoteSnapshotRef = useRef<unknown>({});
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const pushInFlightRef = useRef<Promise<void> | null>(null);
  const pushRequestedRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const initialState = getInitialSyncState();

    const applyAcceptedState = (state: Snapshot, metadata: SyncMetadata): void => {
      applyingRemoteRef.current = true;
      applySyncState(state);
      applyingRemoteRef.current = false;
      metadataRef.current = metadata;
      acceptedSnapshotRef.current = state;
      acceptedMetadataRef.current = metadata;
      previousSnapshotRef.current = pickSyncState();
    };

    const resetSession = (status: 'checking' | 'unauthenticated' | 'unavailable'): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
      applyingRemoteRef.current = true;
      applySyncState(initialState);
      applyingRemoteRef.current = false;
      previousSnapshotRef.current = pickSyncState();
      acceptedSnapshotRef.current = initialState;
      acceptedMetadataRef.current = normalizeSyncMetadata(undefined, initialState);
      metadataRef.current = acceptedMetadataRef.current;
      remoteSnapshotRef.current = initialState;
      remoteUpdatedAtRef.current = null;
      pushRequestedRef.current = false;
      setSyncAccessStatus(status);
    };

    const rollbackPendingChange = (status: 'unauthenticated' | 'unavailable'): void => {
      const acceptedState = acceptedSnapshotRef.current ?? initialState;
      const acceptedMetadata = acceptedMetadataRef.current
        ?? normalizeSyncMetadata(undefined, acceptedState);
      applyAcceptedState(acceptedState, acceptedMetadata);
      setSyncAccessStatus(status);
    };

    if (loading) {
      resetSession('checking');
      return () => {
        cancelled = true;
      };
    }

    if (!enabled || !userId) {
      resetSession('unauthenticated');
      return () => {
        cancelled = true;
      };
    }

    resetSession('checking');
    const deviceId = getDeviceId();
    const unregisterRetry = onSyncAccessRetry(() => {
      setRetryVersion((version) => version + 1);
    });

    const push = async (): Promise<void> => {
      if (cancelled) return;

      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        const local = pickSyncState();
        const localMetadata = metadataRef.current ?? normalizeSyncMetadata(undefined, local);
        const remoteSnapshot = remoteSnapshotRef.current ?? {};
        const reconciled = reconcileSyncState(
          local,
          remoteSnapshot as Partial<Snapshot>,
          localMetadata,
          extractSyncMetadata(remoteSnapshot),
          { deviceId },
        );
        const payload = buildSyncPayload(remoteSnapshot, reconciled.state, reconciled.metadata);
        let result: SaveResult;
        try {
          result = await saveRemoteState(payload, remoteUpdatedAtRef.current);
        } catch {
          rollbackPendingChange('unavailable');
          return;
        }

        if (result.saved) {
          const savedRemote = result.remote ?? {
            data: payload,
            updatedAt: remoteUpdatedAtRef.current,
          };
          remoteSnapshotRef.current = savedRemote.data;
          remoteUpdatedAtRef.current = savedRemote.updatedAt;
          const current = pickSyncState();
          if (JSON.stringify(current) === JSON.stringify(local)) {
            applyAcceptedState(reconciled.state, reconciled.metadata);
          } else {
            acceptedSnapshotRef.current = reconciled.state;
            acceptedMetadataRef.current = reconciled.metadata;
          }
          return;
        }

        if (result.unauthenticated) {
          rollbackPendingChange('unauthenticated');
          return;
        }

        if (!result.conflict) {
          rollbackPendingChange('unavailable');
          return;
        }

        if (result.remote) {
          remoteSnapshotRef.current = result.remote.data;
          remoteUpdatedAtRef.current = result.remote.updatedAt;
          continue;
        }

        try {
          const remoteRow = await loadRemoteState();
          remoteSnapshotRef.current = remoteRow.data;
          remoteUpdatedAtRef.current = remoteRow.updatedAt;
        } catch {
          rollbackPendingChange('unavailable');
          return;
        }
      }

      if (!cancelled) rollbackPendingChange('unavailable');
    };

    const startPush = (): void => {
      if (cancelled || pushInFlightRef.current) return;
      pushRequestedRef.current = false;
      const promise = push();
      pushInFlightRef.current = promise;
      const finish = (): void => {
        if (pushInFlightRef.current !== promise) return;
        pushInFlightRef.current = null;
        if (pushRequestedRef.current && !cancelled) startPush();
      };
      void promise.then(finish, finish);
    };

    const schedulePush = (): void => {
      pushRequestedRef.current = true;
      if (pushInFlightRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        startPush();
      }, SYNC_DEBOUNCE_MS);
    };

    const init = async (): Promise<void> => {
      let remoteRow: RemoteState;
      try {
        remoteRow = await loadRemoteState();
      } catch (error) {
        if (cancelled) return;
        const unavailable = !(error instanceof RemoteStateError && error.status === 401);
        resetSession(unavailable ? 'unavailable' : 'unauthenticated');
        if (unavailable) notify.error('Could not load your saved data.');
        return;
      }
      if (cancelled) return;

      const remoteSnapshot = remoteRow.data ?? {};
      remoteSnapshotRef.current = remoteSnapshot;
      remoteUpdatedAtRef.current = remoteRow.updatedAt;
      const reconciled = reconcileRemoteState(
        remoteSnapshot as Partial<Snapshot>,
        extractSyncMetadata(remoteSnapshot),
        deviceId,
      );
      applyAcceptedState(reconciled.state, reconciled.metadata);
      setSyncAccessStatus('ready');

      unsubscribe = usePrimeDexStore.subscribe(() => {
        const next = pickSyncState();
        const previous = previousSnapshotRef.current;
        if (applyingRemoteRef.current || !previous || JSON.stringify(previous) === JSON.stringify(next)) {
          previousSnapshotRef.current = next;
          return;
        }

        const metadata = advanceSyncMetadata(
          metadataRef.current ?? normalizeSyncMetadata(undefined, previous),
          previous,
          next,
          deviceId,
        );
        metadataRef.current = metadata;
        previousSnapshotRef.current = next;
        schedulePush();
      });
    };

    void init();
    return () => {
      cancelled = true;
      unregisterRetry();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pushInFlightRef.current = null;
      pushRequestedRef.current = false;
      unsubscribe?.();
    };
  }, [enabled, hasHydrated, loading, retryVersion, userId]);
}

// Kept as a source-compatible alias for existing deep imports.
export { useNeonSync as useSupabaseSync };
