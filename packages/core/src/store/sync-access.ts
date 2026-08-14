export type SyncAccessStatus =
  | 'checking'
  | 'loading'
  | 'ready'
  | 'unauthenticated'
  | 'unavailable';

type SyncAccessRequiredHandler = () => void;

let status: SyncAccessStatus = 'checking';
const handlers = new Set<SyncAccessRequiredHandler>();

export function setSyncAccessStatus(nextStatus: SyncAccessStatus): void {
  status = nextStatus;
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

export function requestSyncAccess(): void {
  for (const handler of handlers) handler();
}
