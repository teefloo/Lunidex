'use client';

import type { TCGInvestment } from '@primedex/core/lib/tcg-investments';
import { usePrimeDexStore } from '@/store/primedex';
import { getSyncAccessStatus } from '@/store/sync-access';

export type TCGInvestmentSaveFailure = 'too-large' | 'unavailable' | 'conflict' | 'invalid' | 'session-changed';
export type TCGInvestmentSaveResult = { ok: true; id: string } | { ok: false; reason: TCGInvestmentSaveFailure };

interface PendingInvestmentSave {
  kind: 'investment';
  lot: TCGInvestment | null;
  finish: (result: TCGInvestmentSaveResult) => void;
}

export type SyncChangeFailure = 'unavailable' | 'conflict' | 'too-large' | 'session';
export type SyncChangeResult = { ok: true } | { ok: false; reason: SyncChangeFailure };

interface PendingSnapshotSave {
  kind: 'snapshot';
  expected: unknown;
  getCurrent: () => unknown;
  finish: (result: SyncChangeResult) => void;
}

type PendingSave = PendingInvestmentSave | PendingSnapshotSave;
const pendingSaves = new Set<PendingSave>();
const DEFAULT_SYNC_CONFIRMATION_TIMEOUT_MS = 30_000;

function serialize(snapshot: unknown): string | null {
  try {
    const value = JSON.stringify(snapshot);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function matches(first: unknown, second: unknown): boolean {
  const firstValue = serialize(first);
  return firstValue !== null && firstValue === serialize(second);
}

function sameLot(first: TCGInvestment, second: TCGInvestment): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

/** Called only after the sync bridge has accepted the response for this request. */
export function confirmTCGInvestmentSaves(requested: readonly TCGInvestment[], accepted: readonly TCGInvestment[]): void {
  for (const pending of pendingSaves) {
    if (pending.kind !== 'investment') continue;
    const lot = pending.lot;
    if (!lot || !requested.some((entry) => sameLot(entry, lot))) continue;
    pending.finish(accepted.some((entry) => sameLot(entry, lot))
      ? { ok: true, id: lot.id }
      : { ok: false, reason: 'conflict' });
  }
}

export function rejectPendingTCGInvestmentSaves(reason: TCGInvestmentSaveFailure): void {
  for (const pending of pendingSaves) {
    if (pending.kind === 'investment') pending.finish({ ok: false, reason });
  }
}

/** Generic snapshot confirmation shares the same pending-write lifecycle as investment saves. */
export function waitForSyncChange<T>(
  expected: T,
  getCurrent: () => T,
  timeoutMs = DEFAULT_SYNC_CONFIRMATION_TIMEOUT_MS,
): Promise<SyncChangeResult> {
  if (!matches(expected, getCurrent())) return Promise.resolve({ ok: false, reason: 'conflict' });

  return new Promise((resolve) => {
    const timeoutRef: { current?: ReturnType<typeof setTimeout> } = {};
    const pending: PendingSnapshotSave = {
      kind: 'snapshot',
      expected,
      getCurrent,
      finish: (result) => {
        if (!pendingSaves.delete(pending)) return;
        if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
        resolve(result);
      },
    };
    timeoutRef.current = setTimeout(() => pending.finish({ ok: false, reason: 'unavailable' }), timeoutMs);
    pendingSaves.add(pending);
  });
}

export function confirmPendingSyncChanges(accepted: unknown): void {
  for (const pending of pendingSaves) {
    if (pending.kind !== 'snapshot') continue;
    if (!matches(pending.expected, pending.getCurrent())) {
      pending.finish({ ok: false, reason: 'conflict' });
    } else if (matches(pending.expected, accepted)) {
      pending.finish({ ok: true });
    }
  }
}

export function rejectSupersededSyncChanges(): void {
  for (const pending of pendingSaves) {
    if (pending.kind === 'snapshot' && !matches(pending.expected, pending.getCurrent())) {
      pending.finish({ ok: false, reason: 'conflict' });
    }
  }
}

export function rejectPendingSyncChanges(reason: SyncChangeFailure): void {
  for (const pending of pendingSaves) {
    if (pending.kind === 'snapshot') pending.finish({ ok: false, reason });
  }
}

/** An optimistic store ID is not a saved investment until its exact lot is accepted. */
export function saveTCGInvestmentConfirmed(
  input: Omit<TCGInvestment, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string,
  creationId?: string,
): Promise<TCGInvestmentSaveResult> {
  return new Promise((resolve) => {
    const timeoutRef: { current?: ReturnType<typeof setTimeout> } = {};
    const pending: PendingInvestmentSave = {
      kind: 'investment',
      lot: null,
      finish: (result) => {
        if (!pendingSaves.delete(pending)) return;
        if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
        resolve(result);
      },
    };
    // Also bound a caller without a mounted sync bridge or an edit superseded
    // before the debounce window. Normal writes resolve from the bridge sooner.
    timeoutRef.current = setTimeout(() => {
      const current = usePrimeDexStore.getState().tcgInvestments.find((entry) => entry.id === pending.lot?.id);
      const superseded = pending.lot && current && !sameLot(current, pending.lot);
      pending.finish({ ok: false, reason: superseded ? 'conflict' : 'unavailable' });
    }, 30_000);
    pendingSaves.add(pending);
    const savedId = usePrimeDexStore.getState().saveTCGInvestment(input, id, creationId);
    const lot = savedId ? usePrimeDexStore.getState().tcgInvestments.find((entry) => entry.id === savedId) : null;
    if (!lot) {
      pending.finish({ ok: false, reason: getSyncAccessStatus() === 'ready' ? 'invalid' : 'unavailable' });
      return;
    }
    pending.lot = lot;
  });
}
