export type SyncWriteErrorReason = 'unavailable' | 'conflict' | 'too-large' | 'session';

export type SyncWriteStatus =
  | { state: 'idle' }
  | { state: 'queued' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'error'; reason: SyncWriteErrorReason };

const SAVED_STATUS_DURATION_MS = 3_000;

let version = 0;
let status: SyncWriteStatus = { state: 'idle' };
let savedStatusTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(nextStatus: SyncWriteStatus): void {
  status = nextStatus;
  listeners.forEach((listener) => listener());
}

function clearSavedStatusTimer(): void {
  if (savedStatusTimer === undefined) return;
  clearTimeout(savedStatusTimer);
  savedStatusTimer = undefined;
}

export function getSyncWriteStatus(): SyncWriteStatus {
  return status;
}

export function subscribeToSyncWriteStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Starts a new write generation so stale network responses cannot confirm it. */
export function queueSyncWrite(): number {
  version += 1;
  clearSavedStatusTimer();
  publish({ state: 'queued' });
  return version;
}

export function reportSyncWriteSaving(writeVersion: number): void {
  if (writeVersion !== version) return;
  clearSavedStatusTimer();
  publish({ state: 'saving' });
}

export function reportSyncWriteSaved(writeVersion: number): void {
  if (writeVersion !== version) return;
  clearSavedStatusTimer();
  publish({ state: 'saved' });
  savedStatusTimer = setTimeout(() => {
    savedStatusTimer = undefined;
    if (writeVersion === version) publish({ state: 'idle' });
  }, SAVED_STATUS_DURATION_MS);
}

/** Reports a failed/rolled-back write; it remains visible until retry or reset. */
export function reportSyncWriteError(reason: SyncWriteErrorReason): void {
  clearSavedStatusTimer();
  publish({ state: 'error', reason });
}

export function resetSyncWriteStatus(): void {
  version += 1;
  clearSavedStatusTimer();
  if (status.state !== 'idle') publish({ state: 'idle' });
}
