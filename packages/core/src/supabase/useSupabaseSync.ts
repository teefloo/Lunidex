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

const DEBOUNCE_MS = 1200;

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
  const payload = await response.json() as { data?: unknown; updatedAt?: unknown };
  return {
    data: payload.data ?? {},
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
  };
}

async function saveRemoteState(data: object, expectedUpdatedAt: string | null): Promise<SaveResult> {
  const response = await fetchAppApi('/api/user-state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, expectedUpdatedAt }),
  });
  return {
    saved: response.ok,
    conflict: response.status === 409,
    unauthenticated: response.status === 401 || response.status === 403,
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
        let remoteRow: RemoteState;
        try {
          remoteRow = await loadRemoteState();
        } catch (error) {
          if (!cancelled) {
            rollbackPendingChange(error instanceof RemoteStateError && error.status === 401
              ? 'unauthenticated'
              : 'unavailable');
          }
          return;
        }

        const remoteSnapshot = remoteRow.data ?? {};
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
          result = await saveRemoteState(payload, remoteRow.updatedAt);
        } catch {
          rollbackPendingChange('unavailable');
          return;
        }

        if (result.saved) {
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
      }

      if (!cancelled) rollbackPendingChange('unavailable');
    };

    const schedulePush = (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void push();
      }, DEBOUNCE_MS);
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
      unsubscribe?.();
    };
  }, [enabled, hasHydrated, loading, retryVersion, userId]);
}

// Kept as a source-compatible alias for existing deep imports.
export { useNeonSync as useSupabaseSync };
