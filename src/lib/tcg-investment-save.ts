'use client';

import type { TCGInvestment } from '@primedex/core/lib/tcg-investments';
import { usePrimeDexStore } from '@/store/primedex';
import { getSyncAccessStatus } from '@/store/sync-access';

export type TCGInvestmentSaveFailure = 'too-large' | 'unavailable' | 'conflict' | 'invalid' | 'session-changed';
export type TCGInvestmentSaveResult = { ok: true; id: string } | { ok: false; reason: TCGInvestmentSaveFailure };

interface PendingSave {
  lot: TCGInvestment | null;
  finish: (result: TCGInvestmentSaveResult) => void;
}

const pendingSaves = new Set<PendingSave>();

function sameLot(first: TCGInvestment, second: TCGInvestment): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

/** Called only after the sync bridge has accepted the response for this request. */
export function confirmTCGInvestmentSaves(requested: readonly TCGInvestment[], accepted: readonly TCGInvestment[]): void {
  for (const pending of pendingSaves) {
    const lot = pending.lot;
    if (!lot || !requested.some((entry) => sameLot(entry, lot))) continue;
    pending.finish(accepted.some((entry) => sameLot(entry, lot))
      ? { ok: true, id: lot.id }
      : { ok: false, reason: 'conflict' });
  }
}

export function rejectPendingTCGInvestmentSaves(reason: TCGInvestmentSaveFailure): void {
  for (const pending of pendingSaves) pending.finish({ ok: false, reason });
}

/** An optimistic store ID is not a saved investment until its exact lot is accepted. */
export function saveTCGInvestmentConfirmed(
  input: Omit<TCGInvestment, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string,
  creationId?: string,
): Promise<TCGInvestmentSaveResult> {
  return new Promise((resolve) => {
    const pending: PendingSave = {
      lot: null,
      finish: (result) => {
        if (!pendingSaves.delete(pending)) return;
        clearTimeout(timeout);
        resolve(result);
      },
    };
    // Also bound a caller without a mounted sync bridge or an edit superseded
    // before the debounce window. Normal writes resolve from the bridge sooner.
    const timeout = setTimeout(() => {
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
