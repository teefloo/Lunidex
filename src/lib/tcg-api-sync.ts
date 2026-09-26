import {
  decodeTCGCollectionCardKey,
  getTCGCollectionCardIdentity,
} from '@primedex/core/lib/tcg-collections';

const SYNC_KEY = '__sync';
const COLLECTION_KEYS = [
  'tcgOwnedCards',
  'tcgLegacyOwnedCards',
  'tcgCollections',
  'tcgCollectionCards',
  'tcgActiveCollections',
] as const;

type TcgCollectionKey = (typeof COLLECTION_KEYS)[number];
interface SyncStamp { clock: number; deviceId: string; }
interface SyncEntry extends SyncStamp { present: boolean; }
interface SyncMetadata {
  version: 3;
  clock: number;
  fields: Record<string, SyncStamp>;
  collections: Record<string, Record<string, SyncEntry>>;
}
export type TcgApiState = Record<string, unknown>;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function identity(key: TcgCollectionKey, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (key !== 'tcgCollectionCards') return value;
  const decoded = decodeTCGCollectionCardKey(value);
  return decoded
    ? getTCGCollectionCardIdentity(decoded.collectionKey, decoded.cardId, decoded.variant)
    : value;
}

function values(state: TcgApiState, key: TcgCollectionKey): string[] {
  const raw = state[key];
  return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === 'string') : [];
}

function valueMap(state: TcgApiState, key: TcgCollectionKey): Map<string, string> {
  return new Map(values(state, key).flatMap((value) => {
    const id = identity(key, value);
    return id === null ? [] : [[id, value] as const];
  }));
}

function parseStamp(value: unknown): SyncStamp | null {
  const candidate = asObject(value);
  return typeof candidate.clock === 'number'
    && Number.isSafeInteger(candidate.clock)
    && candidate.clock >= 0
    && typeof candidate.deviceId === 'string'
    && candidate.deviceId.length > 0
    ? { clock: candidate.clock, deviceId: candidate.deviceId }
    : null;
}

function parseEntry(value: unknown): SyncEntry | null {
  const stamp = parseStamp(value);
  const present = asObject(value).present;
  return stamp && typeof present === 'boolean' ? { ...stamp, present } : null;
}

function parseMetadata(value: unknown): SyncMetadata {
  const raw = asObject(value);
  const fields: Record<string, SyncStamp> = {};
  const rawFields = asObject(raw.fields);
  for (const [key, item] of Object.entries(rawFields)) {
    const stamp = parseStamp(item);
    if (stamp) fields[key] = stamp;
  }
  const collections: SyncMetadata['collections'] = {};
  const rawCollections = asObject(raw.collections);
  for (const [key, rawEntries] of Object.entries(rawCollections)) {
    const entries: Record<string, SyncEntry> = {};
    for (const [id, item] of Object.entries(asObject(rawEntries))) {
      const entry = parseEntry(item);
      if (entry) entries[id] = entry;
    }
    if (Object.keys(entries).length > 0) collections[key] = entries;
  }
  const clock = typeof raw.clock === 'number' && Number.isSafeInteger(raw.clock) && raw.clock >= 0
    ? raw.clock
    : 0;
  const maximumEntryClock = Math.max(
    clock,
    ...Object.values(fields).map((stamp) => stamp.clock),
    ...Object.values(collections).flatMap((entries) => Object.values(entries).map((entry) => entry.clock)),
  );
  return { version: 3, clock: maximumEntryClock, fields, collections };
}

/** Advances the same v3 per-entry clocks used by web and mobile sync. */
export function advanceTcgApiSyncMetadata(
  rawMetadata: unknown,
  previous: TcgApiState,
  next: TcgApiState,
  deviceId: string,
): SyncMetadata {
  const metadata = parseMetadata(rawMetadata);
  for (const key of COLLECTION_KEYS) {
    const entries = metadata.collections[key] ?? {};
    const before = valueMap(previous, key);
    const after = valueMap(next, key);
    for (const id of before.keys()) {
      if (!entries[id]) entries[id] = { clock: 0, deviceId: 'legacy', present: true };
    }
    for (const id of after.keys()) {
      if (!entries[id]) entries[id] = { clock: 0, deviceId: 'legacy', present: true };
    }
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      if (before.get(id) === after.get(id)) continue;
      metadata.clock += 1;
      entries[id] = { clock: metadata.clock, deviceId, present: after.has(id) };
    }
    if (Object.keys(entries).length > 0) metadata.collections[key] = entries;
  }

  if (previous.tcgCollectionModelVersion !== next.tcgCollectionModelVersion) {
    metadata.clock += 1;
    metadata.fields.tcgCollectionModelVersion = { clock: metadata.clock, deviceId };
  }
  return metadata;
}

export function attachTcgApiSyncMetadata(
  data: TcgApiState,
  metadata: SyncMetadata,
): TcgApiState {
  const unknownState = Object.fromEntries(Object.entries(data).filter(([key]) => key !== SYNC_KEY));
  return { ...unknownState, [SYNC_KEY]: metadata };
}
