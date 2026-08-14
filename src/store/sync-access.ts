export type SyncAccessStatus =
  | 'checking'
  | 'loading'
  | 'ready'
  | 'unauthenticated'
  | 'unavailable';

type SyncAccessRequiredHandler = () => void;
type SyncAccessRetryHandler = () => void;
type SyncAccessStatusHandler = (nextStatus: SyncAccessStatus) => void;

let status: SyncAccessStatus = 'checking';
const handlers = new Set<SyncAccessRequiredHandler>();
const retryHandlers = new Set<SyncAccessRetryHandler>();
const statusHandlers = new Set<SyncAccessStatusHandler>();

export function setSyncAccessStatus(nextStatus: SyncAccessStatus): void {
  if (status === nextStatus) return;
  status = nextStatus;
  for (const handler of statusHandlers) handler(nextStatus);
}

export function getSyncAccessStatus(): SyncAccessStatus {
  return status;
}

export function hasSyncAccess(): boolean {
  return status === 'ready';
}

/**
 * Registers the UI callback used when an explicit syncable action needs an
 * account. Store code stays independent of the web or native auth UI.
 */
export function onSyncAccessRequired(handler: SyncAccessRequiredHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Registers the sync bridge's retry callback for a temporarily unavailable session. */
export function onSyncAccessRetry(handler: SyncAccessRetryHandler): () => void {
  retryHandlers.add(handler);
  return () => retryHandlers.delete(handler);
}

export function onSyncAccessStatusChange(handler: SyncAccessStatusHandler): () => void {
  statusHandlers.add(handler);
  return () => statusHandlers.delete(handler);
}

export function retrySyncAccess(): void {
  for (const handler of retryHandlers) handler();
}

export function requestSyncAccess(): void {
  for (const handler of handlers) handler();
}
