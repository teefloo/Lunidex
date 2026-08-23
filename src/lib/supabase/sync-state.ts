import { usePrimeDexStore, SYNCED_KEYS, type PersistedState, type SyncedKey } from '@/store/primedex';

export const SYNC_METADATA_KEY = '__sync';
export const SYNC_METADATA_VERSION = 1;

const REMOVED_SYNC_KEYS = new Set(['genTheme', 'autoGenTheme']);

const COLLECTION_KEYS = [
  'favorites',
  'caughtPokemon',
  'badges',
  'compareList',
  'tcgCompareList',
  'tcgOwnedCards',
  'tcgWishlistCards',
  'tcgActiveSets',
  'selectedTypes',
  'selectedEggGroups',
  'selectedColors',
  'selectedShapes',
  'viewedTypes',
] as const satisfies readonly SyncedKey[];

type CollectionKey = (typeof COLLECTION_KEYS)[number];

export interface SyncStamp {
  clock: number;
  deviceId: string;
}

export interface SyncEntry extends SyncStamp {
  present: boolean;
}

export interface SyncMetadata {
  version: typeof SYNC_METADATA_VERSION;
  clock: number;
  fields: Partial<Record<SyncedKey, SyncStamp>>;
  collections: Partial<Record<CollectionKey, Record<string, SyncEntry>>>;
}

export interface SyncReconciliation {
  state: PersistedState;
  metadata: SyncMetadata;
}

export interface SyncReconciliationOptions {
  deviceId: string;
  preferLocalLegacyValues?: boolean;
}

const LEGACY_DEVICE_ID = 'legacy';

function isCollectionKey(key: SyncedKey): key is CollectionKey {
  return COLLECTION_KEYS.includes(key as CollectionKey);
}

function toClock(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function parseStamp(value: unknown): SyncStamp | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as { clock?: unknown; deviceId?: unknown };
  if (typeof candidate.clock !== 'number' || !Number.isFinite(candidate.clock) || candidate.clock < 0) return null;
  if (typeof candidate.deviceId !== 'string' || candidate.deviceId.length === 0) return null;
  return { clock: Math.floor(candidate.clock), deviceId: candidate.deviceId };
}

function parseEntry(value: unknown): SyncEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as { present?: unknown };
  const stamp = parseStamp(value);
  return stamp && typeof candidate.present === 'boolean' ? { ...stamp, present: candidate.present } : null;
}

function compareStamps(left: SyncStamp, right: SyncStamp): number {
  if (left.clock !== right.clock) return left.clock - right.clock;
  if (left.deviceId === right.deviceId) return 0;
  return left.deviceId > right.deviceId ? 1 : -1;
}

function legacyEntry(): SyncEntry {
  return { clock: 0, deviceId: LEGACY_DEVICE_ID, present: true };
}

function collectionValues(state: PersistedState, key: CollectionKey): unknown[] {
  const value = state[key];
  return Array.isArray(value) ? value : [];
}

function cloneEntries(entries: Record<string, SyncEntry>): Record<string, SyncEntry> {
  return Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, { ...entry }]));
}

function parseMetadata(raw: unknown): SyncMetadata | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const candidate = raw as {
    version?: unknown;
    clock?: unknown;
    fields?: unknown;
    collections?: unknown;
  };
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
      for (const [id, rawEntry] of Object.entries(rawEntries)) {
        const entry = parseEntry(rawEntry);
        if (entry) entries[id] = entry;
      }
      if (Object.keys(entries).length > 0) collections[key] = entries;
    }
  }

  return {
    version: SYNC_METADATA_VERSION,
    clock: toClock(candidate.clock),
    fields,
    collections,
  };
}

/** Creates a compatible metadata document for a legacy snapshot. */
export function normalizeSyncMetadata(raw: unknown, state: PersistedState): SyncMetadata {
  const parsed = parseMetadata(raw);
  const metadata: SyncMetadata = {
    version: SYNC_METADATA_VERSION,
    clock: parsed?.clock ?? 0,
    fields: { ...(parsed?.fields ?? {}) },
    collections: Object.fromEntries(
      COLLECTION_KEYS.map((key) => [key, cloneEntries(parsed?.collections[key] ?? {})]),
    ) as Partial<Record<CollectionKey, Record<string, SyncEntry>>>,
  };

  for (const key of COLLECTION_KEYS) {
    const entries = metadata.collections[key] ?? {};
    for (const value of collectionValues(state, key)) {
      const id = String(value);
      if (!entries[id]) entries[id] = legacyEntry();
    }
    if (Object.keys(entries).length > 0) metadata.collections[key] = entries;
  }

  return metadata;
}

export function extractSyncMetadata(snapshot: unknown): unknown {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return undefined;
  return (snapshot as { [SYNC_METADATA_KEY]?: unknown })[SYNC_METADATA_KEY];
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function nextStamp(metadata: SyncMetadata, deviceId: string): SyncStamp {
  metadata.clock += 1;
  return { clock: metadata.clock, deviceId };
}

/** Records local changes before they are sent, including removals as tombstones. */
export function advanceSyncMetadata(
  metadata: SyncMetadata,
  previous: PersistedState,
  next: PersistedState,
  deviceId: string,
): SyncMetadata {
  const updated = normalizeSyncMetadata(metadata, previous);

  for (const key of SYNCED_KEYS) {
    if (isCollectionKey(key)) {
      const entries = updated.collections[key] ?? {};
      const beforeIds = new Set(collectionValues(previous, key).map(String));
      const nextIds = new Set(collectionValues(next, key).map(String));
      for (const id of new Set([...beforeIds, ...nextIds])) {
        const wasPresent = beforeIds.has(id);
        const isPresent = nextIds.has(id);
        if (wasPresent === isPresent) continue;
        entries[id] = { ...nextStamp(updated, deviceId), present: isPresent };
      }
      if (Object.keys(entries).length > 0) updated.collections[key] = entries;
      continue;
    }

    if (!sameValue(previous[key], next[key])) {
      updated.fields[key] = nextStamp(updated, deviceId);
    }
  }

  return updated;
}

function chooseEntry(local: SyncEntry | undefined, remote: SyncEntry | undefined): SyncEntry | undefined {
  if (!local) return remote;
  if (!remote) return local;
  const comparison = compareStamps(local, remote);
  if (comparison > 0) return local;
  if (comparison < 0) return remote;
  // A deletion wins an impossible equal-stamp conflict to avoid resurrection.
  return local.present && !remote.present ? remote : local;
}

function resolveCollection(
  localValues: unknown[],
  remoteValues: unknown[],
  entries: Record<string, SyncEntry>,
): unknown[] {
  const values = new Map<string, unknown>();
  for (const value of [...localValues, ...remoteValues]) values.set(String(value), value);
  return Object.keys(entries)
    .sort()
    .filter((id) => entries[id].present)
    .map((id) => values.get(id))
    .filter((value): value is unknown => value !== undefined);
}

/**
 * Reconciles two snapshots deterministically. Legacy arrays are imported as
 * version-zero additions; all subsequent removals are durable tombstones.
 */
export function reconcileSyncState(
  local: PersistedState,
  remote: Partial<PersistedState>,
  localMetadata: unknown,
  remoteMetadata: unknown,
  options: SyncReconciliationOptions,
): SyncReconciliation {
  const localMeta = normalizeSyncMetadata(localMetadata, local);
  const remoteMeta = normalizeSyncMetadata(remoteMetadata, remote as PersistedState);
  const metadata: SyncMetadata = {
    version: SYNC_METADATA_VERSION,
    clock: Math.max(localMeta.clock, remoteMeta.clock),
    fields: {},
    collections: {},
  };
  const state = { ...local } as PersistedState;

  for (const key of SYNCED_KEYS) {
    if (isCollectionKey(key)) {
      const localEntries = localMeta.collections[key] ?? {};
      const remoteEntries = remoteMeta.collections[key] ?? {};
      const entries: Record<string, SyncEntry> = {};
      for (const id of new Set([...Object.keys(localEntries), ...Object.keys(remoteEntries)])) {
        const entry = chooseEntry(localEntries[id], remoteEntries[id]);
        if (entry) entries[id] = entry;
      }
      metadata.collections[key] = entries;
      (state[key] as unknown) = resolveCollection(
        collectionValues(local, key),
        collectionValues(remote as PersistedState, key),
        entries,
      );
      continue;
    }

    const localStamp = localMeta.fields[key] ?? { clock: 0, deviceId: LEGACY_DEVICE_ID };
    const remoteStamp = remoteMeta.fields[key] ?? { clock: 0, deviceId: LEGACY_DEVICE_ID };
    const comparison = compareStamps(localStamp, remoteStamp);
    const useLocal = comparison > 0 || (comparison === 0 && options.preferLocalLegacyValues);
    (state[key] as unknown) = useLocal || remote[key] === undefined ? local[key] : remote[key];
    metadata.fields[key] = useLocal ? localStamp : remoteStamp;
  }

  return { state, metadata };
}

/**
 * Starts an authenticated session from the remote snapshot only. Deliberately
 * does not inspect the browser's legacy or anonymous snapshot.
 */
export function reconcileRemoteState(
  remote: Partial<PersistedState>,
  remoteMetadata: unknown,
  deviceId: string,
): SyncReconciliation {
  const initialState = getInitialSyncState();
  return reconcileSyncState(initialState, remote, undefined, remoteMetadata, { deviceId });
}

/** @deprecated Call reconcileSyncState with persisted metadata instead. */
export function mergeSyncState(
  local: PersistedState,
  remote: Partial<PersistedState>,
  options: { preserveLocalAdditions?: boolean } = {},
): PersistedState {
  return reconcileSyncState(local, remote, undefined, extractSyncMetadata(remote), {
    deviceId: LEGACY_DEVICE_ID,
    preferLocalLegacyValues: options.preserveLocalAdditions,
  }).state;
}

export function pickSyncState(): PersistedState {
  const state = usePrimeDexStore.getState();
  return Object.fromEntries(SYNCED_KEYS.map((key) => [key, state[key]])) as PersistedState;
}

export function getInitialSyncState(): PersistedState {
  // Keep the local display preference when the unauthenticated sync bridge
  // resets remote-owned state. An authenticated snapshot may still replace it
  // when it contains an explicit theme value.
  const state = {
    ...usePrimeDexStore.getInitialState(),
    theme: usePrimeDexStore.getState().theme,
  };
  return Object.fromEntries(SYNCED_KEYS.map((key) => [key, state[key]])) as PersistedState;
}

export function applySyncState(snapshot: Partial<PersistedState>): void {
  usePrimeDexStore.setState(snapshot);
}

export function hasRemovedSyncKeys(snapshot: unknown): boolean {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return false;
  return Object.keys(snapshot).some((key) => REMOVED_SYNC_KEYS.has(key));
}

/** Preserves unknown client fields while writing the current metadata version. */
export function buildSyncPayload(remote: unknown, snapshot: PersistedState, metadata = normalizeSyncMetadata(extractSyncMetadata(remote), snapshot)): object {
  if (typeof remote !== 'object' || remote === null || Array.isArray(remote)) {
    return { ...snapshot, [SYNC_METADATA_KEY]: metadata };
  }
  const knownKeys = new Set<string>([...SYNCED_KEYS, SYNC_METADATA_KEY]);
  const unknownEntries = Object.entries(remote).filter(
    ([key]) => !knownKeys.has(key) && !REMOVED_SYNC_KEYS.has(key),
  );
  return { ...Object.fromEntries(unknownEntries), ...snapshot, [SYNC_METADATA_KEY]: metadata };
}
