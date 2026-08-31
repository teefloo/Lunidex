import { usePrimeDexStore, SYNCED_KEYS, type PersistedState, type SyncedKey } from '../store/primedex';
import { DEFAULT_TCG_CARD_LANGUAGE, normalizeTCGCardLanguage } from '../lib/tcg-language';
import { DEFAULT_TCG_DISPLAY_CURRENCY, normalizeTCGDisplayCurrency } from '../lib/tcg-currency';
import {
  copyTCGLegacyOwnedCards,
  decodeTCGCollectionCardKey,
  deriveTCGOwnedCardIds,
  getTCGCollectionCardIdentity,
  normalizeTCGCollectionCardKeys,
  normalizeTCGCollectionKeys,
  normalizeTCGLegacyOwnedCards,
} from '../lib/tcg-collections';

export const SYNC_METADATA_KEY = '__sync';
export const SYNC_METADATA_VERSION = 3 as const;
const REMOVED_SYNC_KEYS = new Set(['genTheme', 'autoGenTheme']);
const COLLECTION_KEYS = [
  'favorites', 'caughtPokemon', 'badges', 'compareList', 'tcgCompareList', 'tcgOwnedCards',
  'tcgWishlistCards', 'tcgActiveSets', 'tcgCollections', 'tcgCollectionCards',
  'tcgActiveCollections', 'tcgLegacyOwnedCards', 'selectedTypes', 'selectedEggGroups',
  'selectedColors', 'selectedShapes',
] as const satisfies readonly SyncedKey[];
type CollectionKey = (typeof COLLECTION_KEYS)[number];

export interface SyncStamp { clock: number; deviceId: string }
export interface SyncEntry extends SyncStamp { present: boolean }
export interface SyncMetadata {
  version: typeof SYNC_METADATA_VERSION;
  clock: number;
  fields: Partial<Record<SyncedKey, SyncStamp>>;
  collections: Partial<Record<CollectionKey, Record<string, SyncEntry>>>;
}
export interface SyncReconciliation { state: PersistedState; metadata: SyncMetadata }
export interface SyncReconciliationOptions { deviceId: string; preferLocalLegacyValues?: boolean }

const LEGACY_DEVICE_ID = 'legacy';
const isCollectionKey = (key: SyncedKey): key is CollectionKey => COLLECTION_KEYS.includes(key as CollectionKey);
const toClock = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
const sameValue = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const collectionValues = (state: Partial<PersistedState>, key: CollectionKey): unknown[] => Array.isArray(state[key]) ? state[key] as unknown[] : [];
const collectionEntryId = (key: CollectionKey, value: unknown): string => {
  if (key === 'tcgCollectionCards') {
    const decoded = decodeTCGCollectionCardKey(value);
    return decoded
      ? getTCGCollectionCardIdentity(decoded.collectionKey, decoded.cardId, decoded.variant) ?? String(value)
      : String(value);
  }
  return String(value);
};
const legacyEntry = (): SyncEntry => ({ clock: 0, deviceId: LEGACY_DEVICE_ID, present: true });

function parseStamp(value: unknown): SyncStamp | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as { clock?: unknown; deviceId?: unknown };
  return typeof candidate.clock === 'number' && Number.isFinite(candidate.clock) && candidate.clock >= 0
    && typeof candidate.deviceId === 'string' && candidate.deviceId.length > 0
    ? { clock: Math.floor(candidate.clock), deviceId: candidate.deviceId }
    : null;
}

function parseEntry(value: unknown): SyncEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const stamp = parseStamp(value);
  const present = (value as { present?: unknown }).present;
  return stamp && typeof present === 'boolean' ? { ...stamp, present } : null;
}

function compareStamps(left: SyncStamp, right: SyncStamp): number {
  if (left.clock !== right.clock) return left.clock - right.clock;
  if (left.deviceId === right.deviceId) return 0;
  return left.deviceId > right.deviceId ? 1 : -1;
}

function normalizeTcgSnapshot<T extends Partial<PersistedState>>(snapshot: T): T {
  const next = { ...snapshot } as T & Partial<PersistedState>;
  const isExplicitV1 = next.tcgCollectionModelVersion === 1;
  const hasV2 = !isExplicitV1 && (next.tcgCollectionModelVersion === 2 || next.tcgCollectionModelVersion === 3
    || (Array.isArray(next.tcgLegacyOwnedCards) && next.tcgLegacyOwnedCards.length > 0)
    || (Array.isArray(next.tcgCollections) && next.tcgCollections.length > 0)
    || (Array.isArray(next.tcgCollectionCards) && next.tcgCollectionCards.length > 0)
    || (Array.isArray(next.tcgActiveCollections) && next.tcgActiveCollections.length > 0));
  const collections = normalizeTCGCollectionKeys(next.tcgCollections) ?? [];
  const collectionSet = new Set(collections);
  const collectionCards = (normalizeTCGCollectionCardKeys(next.tcgCollectionCards) ?? [])
    .filter((entry) => {
      const decoded = decodeTCGCollectionCardKey(entry);
      return decoded !== null && collectionSet.has(decoded.collectionKey);
    });
  const activeCollections = (normalizeTCGCollectionKeys(next.tcgActiveCollections) ?? [])
    .filter((entry) => collectionSet.has(entry));
  const legacy = isExplicitV1 || !hasV2
    ? copyTCGLegacyOwnedCards(next.tcgOwnedCards)
    : Object.prototype.hasOwnProperty.call(next, 'tcgLegacyOwnedCards')
      ? normalizeTCGLegacyOwnedCards(next.tcgLegacyOwnedCards) ?? []
      : [];
  next.tcgCollections = collections;
  next.tcgCollectionCards = collectionCards;
  next.tcgActiveCollections = activeCollections;
  next.tcgLegacyOwnedCards = legacy;
  next.tcgBrowseLanguage = normalizeTCGCardLanguage(next.tcgBrowseLanguage) ?? DEFAULT_TCG_CARD_LANGUAGE;
  next.tcgDisplayCurrency = normalizeTCGDisplayCurrency(next.tcgDisplayCurrency, DEFAULT_TCG_DISPLAY_CURRENCY);
  next.tcgOwnedCards = deriveTCGOwnedCardIds(collectionCards, legacy);
  next.tcgCollectionModelVersion = 3;
  return next;
}

function parseMetadata(raw: unknown): SyncMetadata | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const candidate = raw as { version?: unknown; clock?: unknown; fields?: unknown; collections?: unknown };
  if (candidate.version !== 1 && candidate.version !== 2 && candidate.version !== SYNC_METADATA_VERSION) return null;
  const fields: Partial<Record<SyncedKey, SyncStamp>> = {};
  if (typeof candidate.fields === 'object' && candidate.fields !== null && !Array.isArray(candidate.fields)) {
    for (const key of SYNCED_KEYS) {
      const stamp = parseStamp((candidate.fields as Record<string, unknown>)[key]);
      if (stamp) fields[key] = stamp;
    }
  }
  const collections: Partial<Record<CollectionKey, Record<string, SyncEntry>>> = {};
  if (typeof candidate.collections === 'object' && candidate.collections !== null && !Array.isArray(candidate.collections)) {
    for (const key of COLLECTION_KEYS) {
      const rawEntries = (candidate.collections as Record<string, unknown>)[key];
      if (typeof rawEntries !== 'object' || rawEntries === null || Array.isArray(rawEntries)) continue;
      const entries: Record<string, SyncEntry> = {};
      for (const [id, rawEntry] of Object.entries(rawEntries)) {
        const entry = parseEntry(rawEntry);
        if (!entry) continue;
        const canonicalId = collectionEntryId(key, id);
        const existing = entries[canonicalId];
        if (!existing || compareStamps(entry, existing) > 0) entries[canonicalId] = entry;
      }
      if (Object.keys(entries).length > 0) collections[key] = entries;
    }
  }
  return { version: SYNC_METADATA_VERSION, clock: toClock(candidate.clock), fields, collections };
}

export function normalizeSyncMetadata(raw: unknown, state: PersistedState): SyncMetadata {
  const parsed = parseMetadata(raw);
  const metadata: SyncMetadata = {
    version: SYNC_METADATA_VERSION,
    clock: parsed?.clock ?? 0,
    fields: { ...(parsed?.fields ?? {}) },
    collections: {},
  };
  for (const key of COLLECTION_KEYS) {
    const entries: Record<string, SyncEntry> = {};
    for (const [id, entry] of Object.entries(parsed?.collections?.[key] ?? {})) {
      const canonicalId = collectionEntryId(key, id);
      const existing = entries[canonicalId];
      if (!existing || compareStamps(entry, existing) > 0) entries[canonicalId] = { ...entry };
    }
    for (const value of collectionValues(state, key)) {
      const id = collectionEntryId(key, value);
      if (!entries[id]) entries[id] = legacyEntry();
    }
    if (Object.keys(entries).length > 0) metadata.collections[key] = entries;
  }
  return metadata;
}

export function extractSyncMetadata(snapshot: unknown): unknown {
  return typeof snapshot === 'object' && snapshot !== null && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>)[SYNC_METADATA_KEY]
    : undefined;
}

function nextStamp(metadata: SyncMetadata, deviceId: string): SyncStamp {
  metadata.clock += 1;
  return { clock: metadata.clock, deviceId };
}

export function advanceSyncMetadata(metadata: SyncMetadata, previous: PersistedState, next: PersistedState, deviceId: string): SyncMetadata {
  const updated = normalizeSyncMetadata(metadata, previous);
  for (const key of SYNCED_KEYS) {
    if (isCollectionKey(key)) {
      const entries = updated.collections[key] ?? {};
      const beforeValues = new Map(collectionValues(previous, key).map((value) => [collectionEntryId(key, value), value]));
      const nextValues = new Map(collectionValues(next, key).map((value) => [collectionEntryId(key, value), value]));
      const beforeIds = new Set(beforeValues.keys());
      const nextIds = new Set(nextValues.keys());
      for (const id of new Set([...beforeIds, ...nextIds])) {
        if (beforeIds.has(id) !== nextIds.has(id) || !sameValue(beforeValues.get(id), nextValues.get(id))) {
          entries[id] = { ...nextStamp(updated, deviceId), present: nextIds.has(id) };
        }
      }
      if (Object.keys(entries).length > 0) updated.collections[key] = entries;
    } else if (!sameValue(previous[key], next[key])) {
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
  return local.present && !remote.present ? remote : local;
}

function resolveCollection(
  key: CollectionKey,
  localValues: unknown[],
  remoteValues: unknown[],
  localEntries: Record<string, SyncEntry>,
  remoteEntries: Record<string, SyncEntry>,
  entries: Record<string, SyncEntry>,
): unknown[] {
  const localById = new Map(localValues.map((value) => [collectionEntryId(key, value), value]));
  const remoteById = new Map(remoteValues.map((value) => [collectionEntryId(key, value), value]));

  return Object.keys(entries)
    .sort()
    .flatMap((id) => {
      const selected = entries[id];
      if (!selected.present) return [];
      const localEntry = localEntries[id];
      const remoteEntry = remoteEntries[id];
      const localValue = localById.get(id);
      const remoteValue = remoteById.get(id);
      const selectedLocal = localValue !== undefined && localEntry
        && compareStamps(localEntry, selected) === 0
        && localEntry.present === selected.present;
      const selectedRemote = remoteValue !== undefined && remoteEntry
        && compareStamps(remoteEntry, selected) === 0
        && remoteEntry.present === selected.present;
      const value = selectedLocal ? localValue : selectedRemote ? remoteValue : localValue ?? remoteValue;
      return value === undefined ? [] : [value];
    });
}

export function reconcileSyncState(
  local: PersistedState,
  remote: Partial<PersistedState>,
  localMetadata: unknown,
  remoteMetadata: unknown,
  options: SyncReconciliationOptions,
): SyncReconciliation {
  const remoteHasBrowseLanguage = Object.prototype.hasOwnProperty.call(remote, 'tcgBrowseLanguage');
  const remoteHasDisplayCurrency = Object.prototype.hasOwnProperty.call(remote, 'tcgDisplayCurrency');
  const normalizedLocal = normalizeTcgSnapshot(local);
  const normalizedRemote = normalizeTcgSnapshot(remote);
  const localMeta = normalizeSyncMetadata(localMetadata, normalizedLocal as PersistedState);
  const remoteMeta = normalizeSyncMetadata(remoteMetadata, normalizedRemote as PersistedState);
  const metadata: SyncMetadata = {
    version: SYNC_METADATA_VERSION,
    clock: Math.max(localMeta.clock, remoteMeta.clock),
    fields: {},
    collections: {},
  };
  const state = { ...normalizedLocal } as PersistedState;
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
        key,
        collectionValues(normalizedLocal, key),
        collectionValues(normalizedRemote as PersistedState, key),
        localEntries,
        remoteEntries,
        entries,
      );
    } else {
      const localStamp = localMeta.fields[key] ?? { clock: 0, deviceId: LEGACY_DEVICE_ID };
      const remoteStamp = remoteMeta.fields[key] ?? { clock: 0, deviceId: LEGACY_DEVICE_ID };
      const comparison = compareStamps(localStamp, remoteStamp);
      const useLocal = comparison > 0 || (comparison === 0 && options.preferLocalLegacyValues);
      const remoteValueMissing = normalizedRemote[key] === undefined
        || (key === 'tcgBrowseLanguage' && !remoteHasBrowseLanguage)
        || (key === 'tcgDisplayCurrency' && !remoteHasDisplayCurrency);
      (state[key] as unknown) = useLocal || remoteValueMissing ? normalizedLocal[key] : normalizedRemote[key];
      metadata.fields[key] = useLocal ? localStamp : remoteStamp;
    }
  }
  const normalized = normalizeTcgSnapshot(state);
  Object.assign(state, normalized);
  return { state, metadata };
}

export function reconcileRemoteState(remote: Partial<PersistedState>, remoteMetadata: unknown, deviceId: string): SyncReconciliation {
  return reconcileSyncState(getInitialSyncState(), remote, undefined, remoteMetadata, { deviceId });
}

export function mergeSyncState(local: PersistedState, remote: Partial<PersistedState>, options: { preserveLocalAdditions?: boolean } = {}): PersistedState {
  return reconcileSyncState(
    local,
    remote,
    undefined,
    extractSyncMetadata(remote),
    { deviceId: LEGACY_DEVICE_ID, preferLocalLegacyValues: options.preserveLocalAdditions },
  ).state;
}

export const pickSyncState = (): PersistedState => Object.fromEntries(
  SYNCED_KEYS.map((key) => [key, usePrimeDexStore.getState()[key]]),
) as PersistedState;

export function getInitialSyncState(): PersistedState {
  const current = usePrimeDexStore.getState();
  const state = {
    ...usePrimeDexStore.getInitialState(),
    theme: current.theme,
    tcgBrowseLanguage: current.tcgBrowseLanguage,
    tcgDisplayCurrency: current.tcgDisplayCurrency,
  };
  return Object.fromEntries(SYNCED_KEYS.map((key) => [key, state[key]])) as PersistedState;
}

export const applySyncState = (snapshot: Partial<PersistedState>): void => { usePrimeDexStore.setState(snapshot); };
export function hasRemovedSyncKeys(snapshot: unknown): boolean {
  return typeof snapshot === 'object' && snapshot !== null && !Array.isArray(snapshot)
    && Object.keys(snapshot).some((key) => REMOVED_SYNC_KEYS.has(key));
}
export function buildSyncPayload(
  remote: unknown,
  snapshot: PersistedState,
  metadata = normalizeSyncMetadata(extractSyncMetadata(remote), snapshot),
): object {
  if (typeof remote !== 'object' || remote === null || Array.isArray(remote)) {
    return { ...snapshot, [SYNC_METADATA_KEY]: metadata };
  }
  const knownKeys = new Set<string>([...SYNCED_KEYS, SYNC_METADATA_KEY]);
  return {
    ...Object.fromEntries(Object.entries(remote).filter(([key]) => !knownKeys.has(key) && !REMOVED_SYNC_KEYS.has(key))),
    ...snapshot,
    [SYNC_METADATA_KEY]: metadata,
  };
}
