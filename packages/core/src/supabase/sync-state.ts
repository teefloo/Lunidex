import { usePrimeDexStore, SYNCED_KEYS, type PersistedState, type SyncedKey } from '../store/primedex';

export const SYNC_METADATA_KEY = '__sync';
export const SYNC_METADATA_VERSION = 1;
const COLLECTION_KEYS = ['favorites', 'caughtPokemon', 'badges', 'compareList', 'tcgCompareList', 'tcgOwnedCards', 'tcgWishlistCards', 'tcgActiveSets', 'selectedTypes', 'selectedEggGroups', 'selectedColors', 'selectedShapes'] as const satisfies readonly SyncedKey[];
type CollectionKey = (typeof COLLECTION_KEYS)[number];
const LEGACY_DEVICE_ID = 'legacy';

export interface SyncStamp { clock: number; deviceId: string; }
export interface SyncEntry extends SyncStamp { present: boolean; }
export interface SyncMetadata {
  version: typeof SYNC_METADATA_VERSION;
  clock: number;
  fields: Partial<Record<SyncedKey, SyncStamp>>;
  collections: Partial<Record<CollectionKey, Record<string, SyncEntry>>>;
}
export interface SyncReconciliation { state: PersistedState; metadata: SyncMetadata; }
export interface SyncReconciliationOptions { deviceId: string; preferLocalLegacyValues?: boolean; }

const isCollectionKey = (key: SyncedKey): key is CollectionKey => COLLECTION_KEYS.includes(key as CollectionKey);
const toClock = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
const cloneEntries = (entries: Record<string, SyncEntry>) => Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, { ...entry }]));
const collectionValues = (state: PersistedState, key: CollectionKey) => Array.isArray(state[key]) ? state[key] as unknown[] : [];
const legacyEntry = (): SyncEntry => ({ clock: 0, deviceId: LEGACY_DEVICE_ID, present: true });

function parseStamp(value: unknown): SyncStamp | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as { clock?: unknown; deviceId?: unknown };
  return typeof candidate.clock === 'number' && Number.isFinite(candidate.clock) && candidate.clock >= 0 && typeof candidate.deviceId === 'string' && candidate.deviceId.length > 0
    ? { clock: Math.floor(candidate.clock), deviceId: candidate.deviceId }
    : null;
}

function parseEntry(value: unknown): SyncEntry | null {
  const stamp = parseStamp(value);
  const present = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as { present?: unknown }).present : undefined;
  return stamp && typeof present === 'boolean' ? { ...stamp, present } : null;
}

function parseMetadata(raw: unknown): SyncMetadata | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const candidate = raw as { version?: unknown; clock?: unknown; fields?: unknown; collections?: unknown };
  if (candidate.version !== SYNC_METADATA_VERSION) return null;
  const fields: Partial<Record<SyncedKey, SyncStamp>> = {};
  if (typeof candidate.fields === 'object' && candidate.fields !== null && !Array.isArray(candidate.fields)) {
    for (const key of SYNCED_KEYS) {
      const stamp = parseStamp((candidate.fields as Partial<Record<SyncedKey, unknown>>)[key]);
      if (stamp) fields[key] = stamp;
    }
  }
  const collections: Partial<Record<CollectionKey, Record<string, SyncEntry>>> = {};
  if (typeof candidate.collections === 'object' && candidate.collections !== null && !Array.isArray(candidate.collections)) {
    for (const key of COLLECTION_KEYS) {
      const rawEntries = (candidate.collections as Partial<Record<CollectionKey, unknown>>)[key];
      if (typeof rawEntries !== 'object' || rawEntries === null || Array.isArray(rawEntries)) continue;
      const entries: Record<string, SyncEntry> = {};
      for (const [id, rawEntry] of Object.entries(rawEntries)) { const entry = parseEntry(rawEntry); if (entry) entries[id] = entry; }
      if (Object.keys(entries).length) collections[key] = entries;
    }
  }
  return { version: SYNC_METADATA_VERSION, clock: toClock(candidate.clock), fields, collections };
}

export function normalizeSyncMetadata(raw: unknown, state: PersistedState): SyncMetadata {
  const parsed = parseMetadata(raw);
  const metadata: SyncMetadata = { version: SYNC_METADATA_VERSION, clock: parsed?.clock ?? 0, fields: { ...(parsed?.fields ?? {}) }, collections: Object.fromEntries(COLLECTION_KEYS.map((key) => [key, cloneEntries(parsed?.collections[key] ?? {})])) as Partial<Record<CollectionKey, Record<string, SyncEntry>>> };
  for (const key of COLLECTION_KEYS) {
    const entries = metadata.collections[key] ?? {};
    for (const value of collectionValues(state, key)) if (!entries[String(value)]) entries[String(value)] = legacyEntry();
    if (Object.keys(entries).length) metadata.collections[key] = entries;
  }
  return metadata;
}

export function extractSyncMetadata(snapshot: unknown): unknown {
  return typeof snapshot === 'object' && snapshot !== null && !Array.isArray(snapshot) ? (snapshot as { [SYNC_METADATA_KEY]?: unknown })[SYNC_METADATA_KEY] : undefined;
}

const compareStamps = (left: SyncStamp, right: SyncStamp) => left.clock === right.clock ? (left.deviceId === right.deviceId ? 0 : left.deviceId > right.deviceId ? 1 : -1) : left.clock - right.clock;
const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const nextStamp = (metadata: SyncMetadata, deviceId: string): SyncStamp => ({ clock: ++metadata.clock, deviceId });

export function advanceSyncMetadata(metadata: SyncMetadata, previous: PersistedState, next: PersistedState, deviceId: string): SyncMetadata {
  const updated = normalizeSyncMetadata(metadata, previous);
  for (const key of SYNCED_KEYS) {
    if (isCollectionKey(key)) {
      const entries = updated.collections[key] ?? {};
      const beforeIds = new Set(collectionValues(previous, key).map(String));
      const nextIds = new Set(collectionValues(next, key).map(String));
      for (const id of new Set([...beforeIds, ...nextIds])) if (beforeIds.has(id) !== nextIds.has(id)) entries[id] = { ...nextStamp(updated, deviceId), present: nextIds.has(id) };
      if (Object.keys(entries).length) updated.collections[key] = entries;
    } else if (!sameValue(previous[key], next[key])) updated.fields[key] = nextStamp(updated, deviceId);
  }
  return updated;
}

function chooseEntry(local: SyncEntry | undefined, remote: SyncEntry | undefined): SyncEntry | undefined {
  if (!local) return remote; if (!remote) return local;
  const comparison = compareStamps(local, remote);
  return comparison > 0 ? local : comparison < 0 ? remote : local.present && !remote.present ? remote : local;
}

function resolveCollection(localValues: unknown[], remoteValues: unknown[], entries: Record<string, SyncEntry>): unknown[] {
  const values = new Map<string, unknown>();
  for (const value of [...localValues, ...remoteValues]) values.set(String(value), value);
  return Object.keys(entries).sort().filter((id) => entries[id].present).map((id) => values.get(id)).filter((value): value is unknown => value !== undefined);
}

export function reconcileSyncState(local: PersistedState, remote: Partial<PersistedState>, localMetadata: unknown, remoteMetadata: unknown, options: SyncReconciliationOptions): SyncReconciliation {
  const localMeta = normalizeSyncMetadata(localMetadata, local);
  const remoteMeta = normalizeSyncMetadata(remoteMetadata, remote as PersistedState);
  const metadata: SyncMetadata = { version: SYNC_METADATA_VERSION, clock: Math.max(localMeta.clock, remoteMeta.clock), fields: {}, collections: {} };
  const state = { ...local } as PersistedState;
  for (const key of SYNCED_KEYS) {
    if (isCollectionKey(key)) {
      const localEntries = localMeta.collections[key] ?? {}, remoteEntries = remoteMeta.collections[key] ?? {}, entries: Record<string, SyncEntry> = {};
      for (const id of new Set([...Object.keys(localEntries), ...Object.keys(remoteEntries)])) { const entry = chooseEntry(localEntries[id], remoteEntries[id]); if (entry) entries[id] = entry; }
      metadata.collections[key] = entries;
      (state[key] as unknown) = resolveCollection(collectionValues(local, key), collectionValues(remote as PersistedState, key), entries);
    } else {
      const localStamp = localMeta.fields[key] ?? { clock: 0, deviceId: LEGACY_DEVICE_ID }, remoteStamp = remoteMeta.fields[key] ?? { clock: 0, deviceId: LEGACY_DEVICE_ID };
      const useLocal = compareStamps(localStamp, remoteStamp) > 0 || (compareStamps(localStamp, remoteStamp) === 0 && options.preferLocalLegacyValues);
      (state[key] as unknown) = useLocal || remote[key] === undefined ? local[key] : remote[key];
      metadata.fields[key] = useLocal ? localStamp : remoteStamp;
    }
  }
  return { state, metadata };
}

/** @deprecated Call reconcileSyncState with persisted metadata instead. */
export function mergeSyncState(local: PersistedState, remote: Partial<PersistedState>, options: { preserveLocalAdditions?: boolean } = {}): PersistedState {
  return reconcileSyncState(local, remote, undefined, extractSyncMetadata(remote), { deviceId: LEGACY_DEVICE_ID, preferLocalLegacyValues: options.preserveLocalAdditions }).state;
}

export const pickSyncState = (): PersistedState => Object.fromEntries(SYNCED_KEYS.map((key) => [key, usePrimeDexStore.getState()[key]])) as PersistedState;
export const getInitialSyncState = (): PersistedState => Object.fromEntries(SYNCED_KEYS.map((key) => [key, usePrimeDexStore.getInitialState()[key]])) as PersistedState;
export const applySyncState = (snapshot: Partial<PersistedState>): void => {
  usePrimeDexStore.setState(snapshot);
};
export function buildSyncPayload(remote: unknown, snapshot: PersistedState, metadata = normalizeSyncMetadata(extractSyncMetadata(remote), snapshot)): object {
  if (typeof remote !== 'object' || remote === null || Array.isArray(remote)) return { ...snapshot, [SYNC_METADATA_KEY]: metadata };
  const knownKeys = new Set<string>([...SYNCED_KEYS, SYNC_METADATA_KEY]);
  return { ...Object.fromEntries(Object.entries(remote).filter(([key]) => !knownKeys.has(key))), ...snapshot, [SYNC_METADATA_KEY]: metadata };
}
