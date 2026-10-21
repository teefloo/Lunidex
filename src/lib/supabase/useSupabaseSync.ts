'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { onSyncAccessRetry, setSyncAccessStatus } from '@/store/sync-access';
import { fetchAppApi } from '@/lib/app-api';
import { isLikelyNetworkError, reportFallback } from '@/lib/sentry-observability';
import { getFirstPersistedTcgValue, getPersistedTcgAddition } from '@/lib/tcg-persistence-measurement';
import { setProductTrackingIdentity, trackTcgPersistedValue, trackReturnAfterActivation } from '@/lib/product-measurement';
import { capturePostHogEvent } from '@/lib/posthog-client';
import { retryAsync } from '@/lib/retry';
import { AuthContext } from '@/lib/neon/AuthProvider';
import { confirmTCGInvestmentSaves, rejectPendingTCGInvestmentSaves, type TCGInvestmentSaveFailure } from '@/lib/tcg-investment-save';
import {
  confirmPendingSyncChanges,
  rejectPendingSyncChanges,
  rejectSupersededSyncChanges,
} from '@/lib/sync-confirmation';
import {
  getSyncWriteStatus,
  queueSyncWrite,
  reportSyncWriteError,
  reportSyncWriteSaved,
  reportSyncWriteSaving,
  resetSyncWriteStatus,
} from '@/store/sync-write-status';
import {
  advanceSyncMetadata,
  applySyncState,
  buildSyncPayload,
  extractSyncMetadata,
  getInitialSyncState,
  hasRemovedSyncKeys,
  normalizeSyncMetadata,
  pickSyncState,
  preserveLocalPreferences,
  reconcileRemoteState,
  reconcileSyncState,
  type SyncMetadata,
} from './sync-state';

// Give a card click a short coalescing window, then send one write. The
// remote version is cached between writes so the normal path is one PUT.
const SYNC_DEBOUNCE_MS = 100;
const REMOTE_STATE_REQUEST_TIMEOUT_MS = 5_000;

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

class InvalidRemoteStateError extends Error {
  constructor() {
    super('The saved account state response was invalid.');
    this.name = 'InvalidRemoteStateError';
  }
}

interface SaveResult {
  saved: boolean;
  conflict: boolean;
  unauthenticated: boolean;
  tooLarge: boolean;
  remote: RemoteState | null;
}

let sessionDeviceId: string | null = null;

function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getDeviceId(): string {
  if (!sessionDeviceId) sessionDeviceId = createDeviceId();
  return sessionDeviceId;
}

async function loadRemoteState(): Promise<RemoteState> {
  return retryAsync(async () => {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const request = async (): Promise<RemoteState> => {
      const response = await fetchAppApi('/api/user-state', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new RemoteStateError(response.status);
      const payload = (await response.json()) as unknown;
      if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        throw new InvalidRemoteStateError();
      }
      const candidate = payload as { data?: unknown; updatedAt?: unknown };
      if (
        typeof candidate.data !== 'object'
        || candidate.data === null
        || Array.isArray(candidate.data)
        || !(candidate.updatedAt === null || typeof candidate.updatedAt === 'string')
      ) {
        throw new InvalidRemoteStateError();
      }
      return { data: candidate.data, updatedAt: candidate.updatedAt };
    };

    try {
      return await Promise.race([
        request(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            const error = new Error('Saved account state request timed out.');
            error.name = 'TimeoutError';
            reject(error);
          }, REMOTE_STATE_REQUEST_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }, {
    attempts: 2,
    delayMs: (attempt) => (attempt + 1) * 250,
    shouldRetry: (error) => {
      if (error instanceof InvalidRemoteStateError) return false;
      if (error instanceof RemoteStateError) return error.status >= 500;
      return error instanceof Error && error.name === 'TimeoutError'
        ? true
        : isLikelyNetworkError(error);
    },
  });
}

async function saveRemoteState(
  data: object,
  expectedUpdatedAt: string | null,
): Promise<SaveResult> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const request = async (): Promise<SaveResult> => {
    const response = await fetchAppApi('/api/user-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, expectedUpdatedAt }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as unknown;
    const candidate = typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? payload as { data?: unknown; updatedAt?: unknown }
      : null;
    if (response.ok && (
      !candidate
      || typeof candidate.data !== 'object'
      || candidate.data === null
      || Array.isArray(candidate.data)
      || !(candidate.updatedAt === null || typeof candidate.updatedAt === 'string')
    )) {
      throw new InvalidRemoteStateError();
    }
    return {
      saved: response.ok,
      conflict: response.status === 409,
      unauthenticated: response.status === 401 || response.status === 403,
      tooLarge: response.status === 413,
      remote: (response.ok || response.status === 409) && candidate
        ? {
          data: candidate.data ?? data,
          updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : expectedUpdatedAt,
        }
        : null,
    };
  };
  try {
    return await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          const error = new Error('Saved account state write timed out.');
          error.name = 'TimeoutError';
          reject(error);
        }, REMOTE_STATE_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * Online-only sync for the web app. The remote user_state row is the source of
 * truth; browser storage is deliberately not used as an anonymous or account
 * snapshot. Failed writes keep the local edit pending so the user can retry it;
 * the remote state remains authoritative after a confirmed save.
 */
export function useNeonSync(): void {
  const { i18n } = useTranslation();
  const ctx = useContext(AuthContext);
  const user = ctx?.user ?? null;
  const enabled = ctx?.enabled ?? false;
  const loading = ctx?.loading ?? false;
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const userId = user?.id ?? null;
  const [onlineVersion, setOnlineVersion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSnapshotRef = useRef<Snapshot | null>(null);
  const acceptedSnapshotRef = useRef<Snapshot | null>(null);
  const acceptedMetadataRef = useRef<SyncMetadata | null>(null);
  const metadataRef = useRef<SyncMetadata | null>(null);
  const remoteSnapshotRef = useRef<unknown>({});
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const pushInFlightRef = useRef<Promise<void> | null>(null);
  const pushRequestedRef = useRef(false);
  const hasPendingLocalChangesRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const syncWriteVersionRef = useRef(0);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!loading) setProductTrackingIdentity(userId);
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
      resetSyncWriteStatus();
      rejectPendingSyncChanges(status === 'unauthenticated' ? 'session' : 'unavailable');
      rejectPendingTCGInvestmentSaves(status === 'unavailable' ? 'unavailable' : 'session-changed');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
      const resetState = preserveLocalPreferences(initialState, pickSyncState());
      applyingRemoteRef.current = true;
      applySyncState(resetState);
      applyingRemoteRef.current = false;
      previousSnapshotRef.current = pickSyncState();
      acceptedSnapshotRef.current = resetState;
      acceptedMetadataRef.current = normalizeSyncMetadata(undefined, resetState);
      metadataRef.current = acceptedMetadataRef.current;
      remoteSnapshotRef.current = resetState;
      remoteUpdatedAtRef.current = null;
      pushRequestedRef.current = false;
      hasPendingLocalChangesRef.current = false;
      setSyncAccessStatus(status);
      if (status === 'unavailable') {
        reportFallback('sync-unavailable', { feature: 'sync', operation: 'session-reset' });
      }
    };

    const rollbackPendingChange = (
      status: 'unauthenticated' | 'unavailable',
      preserveCollectionPage = false,
      failureMessage?: string,
      reason: TCGInvestmentSaveFailure = status === 'unauthenticated' ? 'session-changed' : 'unavailable',
    ): void => {
      rejectPendingSyncChanges(reason === 'too-large'
        ? 'too-large'
        : reason === 'conflict'
          ? 'conflict'
          : status === 'unauthenticated'
            ? 'session'
            : 'unavailable');
      rejectPendingTCGInvestmentSaves(reason);
      const writeStatus = getSyncWriteStatus().state;
      if (writeStatus === 'queued' || writeStatus === 'saving') {
        reportSyncWriteError(reason === 'too-large'
          ? 'too-large'
          : reason === 'conflict'
            ? 'conflict'
            : status === 'unauthenticated'
              ? 'session'
              : 'unavailable');
      }
      if (status === 'unavailable' && preserveCollectionPage && window.navigator.onLine) {
        previousSnapshotRef.current = pickSyncState();
        hasPendingLocalChangesRef.current = true;
        reportFallback('sync-unavailable', { feature: 'sync', operation: 'write-deferred' });
        toast.error(failureMessage ?? i18n.t('auth.sync_unavailable', {
          defaultValue: 'Your saved data is temporarily unavailable. Please try again in a moment.',
        }));
        setSyncAccessStatus('ready');
        return;
      }
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
    const push = async (): Promise<void> => {
      if (cancelled) return;

      const writeVersion = syncWriteVersionRef.current;
      reportSyncWriteSaving(writeVersion);

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
        } catch (error) {
          if (!cancelled) rollbackPendingChange('unavailable', true, undefined, error instanceof InvalidRemoteStateError ? 'invalid' : 'unavailable');
          return;
        }
        if (cancelled) return;

        if (result.saved) {
          const savedRemote = result.remote ?? {
            data: payload,
            updatedAt: remoteUpdatedAtRef.current,
          };
          const accepted = reconcileRemoteState(savedRemote.data as Partial<Snapshot>, extractSyncMetadata(savedRemote.data), deviceId);
          const confirmed = accepted.state;
          try {
            const previousAccepted = acceptedSnapshotRef.current;
            const removed = getPersistedTcgAddition(confirmed.tcgCollectionCards, previousAccepted?.tcgCollectionCards ?? []);
            if (removed && getPersistedTcgAddition(local.tcgCollectionCards, previousAccepted?.tcgCollectionCards ?? [])) {
              capturePostHogEvent('tcg_card_ownership_toggled', { ...removed, state: 'removed', persistence: 'neon', authenticated: true });
              void trackReturnAfterActivation('owned_remove');
            }
            for (const state of ['added', 'removed'] as const) {
              const before = new Set(previousAccepted?.tcgWishlistCards ?? []);
              const after = new Set(confirmed.tcgWishlistCards);
              const requested = new Set(local.tcgWishlistCards);
              const changed = state === 'added'
                ? [...after].some((id) => !before.has(id) && requested.has(id))
                : [...before].some((id) => !after.has(id) && !requested.has(id));
              if (changed) capturePostHogEvent('tcg_wishlist_toggled', { state, persistence: 'neon', authenticated: true });
            }
            const addition = getPersistedTcgAddition(acceptedSnapshotRef.current?.tcgCollectionCards ?? [], confirmed.tcgCollectionCards, local.tcgCollectionCards);
            if (addition) {
              capturePostHogEvent('tcg_card_ownership_toggled', { ...addition, state: 'added', persistence: 'neon', authenticated: true });
              const firstValue = previousAccepted && getFirstPersistedTcgValue(previousAccepted, confirmed.tcgCollectionCards, local.tcgCollectionCards);
              if (firstValue) void trackTcgPersistedValue(firstValue, userId);
              trackReturnAfterActivation('owned_add');
            }
          } catch {
            // Optional telemetry must never interrupt applying the accepted save.
          }
          remoteSnapshotRef.current = savedRemote.data;
          remoteUpdatedAtRef.current = savedRemote.updatedAt;
          // Keep a newer in-memory edit made while the request was in flight;
          // it will be sent by the next scheduled push.
          const current = pickSyncState();
          confirmPendingSyncChanges(confirmed);
          if (JSON.stringify(current) === JSON.stringify(local)) {
            applyAcceptedState(confirmed, accepted.metadata);
            reportSyncWriteSaved(writeVersion);
            hasPendingLocalChangesRef.current = false;
          } else {
            acceptedSnapshotRef.current = confirmed;
            acceptedMetadataRef.current = accepted.metadata;
            hasPendingLocalChangesRef.current = true;
          }
          confirmTCGInvestmentSaves(local.tcgInvestments, confirmed.tcgInvestments);
          return;
        }

        if (result.unauthenticated) {
          rollbackPendingChange('unauthenticated');
          return;
        }

        if (!result.conflict) {
          rollbackPendingChange(
            'unavailable',
            true,
            result.tooLarge
              ? i18n.t('tcg.custom_collections.document_too_large')
              : undefined,
            result.tooLarge ? 'too-large' : 'unavailable',
          );
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
          rollbackPendingChange('unavailable', true);
          return;
        }
      }

      if (!cancelled) rollbackPendingChange('unavailable', true, undefined, 'conflict');
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
      rejectSupersededSyncChanges();
      hasPendingLocalChangesRef.current = true;
      syncWriteVersionRef.current = queueSyncWrite();
      pushRequestedRef.current = true;
      if (pushInFlightRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        startPush();
      }, SYNC_DEBOUNCE_MS);
    };

    const unregisterRetry = onSyncAccessRetry(() => {
      if (hasPendingLocalChangesRef.current) schedulePush();
      else setOnlineVersion((version) => version + 1);
    });

    const init = async (): Promise<void> => {
      try {
        const remoteRow = await loadRemoteState();
        if (cancelled) return;

        const remoteSnapshot = remoteRow.data;
        remoteSnapshotRef.current = remoteSnapshot;
        remoteUpdatedAtRef.current = remoteRow.updatedAt;
        const reconciled = reconcileRemoteState(
          remoteSnapshot as Partial<Snapshot>,
          extractSyncMetadata(remoteSnapshot),
          deviceId,
        );
        applyAcceptedState(reconciled.state, reconciled.metadata);
        hasPendingLocalChangesRef.current = false;
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

        // Remove preferences from the retired generation-theme feature without
        // touching any collection or account data. A conflict simply defers the
        // cleanup to the next normal sync write.
        if (hasRemovedSyncKeys(remoteSnapshot)) {
          const cleanupPayload = buildSyncPayload(remoteSnapshot, reconciled.state, reconciled.metadata);
          void saveRemoteState(cleanupPayload, remoteRow.updatedAt).then((result) => {
            if (!result.saved || !result.remote || cancelled) return;
            remoteSnapshotRef.current = result.remote.data;
            remoteUpdatedAtRef.current = result.remote.updatedAt;
          }).catch(() => {
            // The authenticated session remains usable; cleanup is best effort.
          });
        }
      } catch (error) {
        if (cancelled) return;
        const status = error instanceof RemoteStateError && (error.status === 401 || error.status === 403)
          ? 'unauthenticated'
          : 'unavailable';
        resetSession(status);
        if (status === 'unavailable') {
          toast.error(i18n.t('auth.sync_unavailable', {
            defaultValue: 'Your saved data is temporarily unavailable. Please try again in a moment.',
          }));
        }
        return;
      }
    };

    if (window.navigator.onLine) void init();
    else resetSession('unavailable');
    const onOnline = (): void => setOnlineVersion((version) => version + 1);
    const onOffline = (): void => {
      cancelled = true;
      reportFallback('sync-unavailable', { feature: 'sync', operation: 'offline' });
      rollbackPendingChange('unavailable');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      cancelled = true;
      rejectPendingTCGInvestmentSaves('session-changed');
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pushInFlightRef.current = null;
      pushRequestedRef.current = false;
      unregisterRetry();
      unsubscribe?.();
    };
  }, [enabled, hasHydrated, i18n, loading, onlineVersion, userId]);
}

// Kept as a source-compatible alias for existing deep imports.
export { useNeonSync as useSupabaseSync };
