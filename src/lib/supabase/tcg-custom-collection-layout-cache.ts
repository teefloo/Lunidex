import { get as idbGet, update as idbUpdate } from 'idb-keyval';
import { normalizeTCGCustomCollectionLayouts } from '@primedex/core/lib/tcg-custom-collections';
import { isTCGCardLanguage } from '@primedex/core/lib/tcg-language';
import type { CachedTCGCustomCollectionLayouts, SyncEntry } from './sync-state';

export interface TCGCustomCollectionLayoutCache extends CachedTCGCustomCollectionLayouts {
  version: 1;
}

const CACHE_KEY_PREFIX = 'primedex-tcg-custom-collection-layout-cache:v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CACHE_CARD_TIMESTAMP = '2000-01-01T00:00:00.000Z';
const LEGACY_CACHE_ENTRY: SyncEntry = { clock: 0, deviceId: 'legacy', present: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCache(value: unknown): TCGCustomCollectionLayoutCache | null {
  if (!isRecord(value) || value.version !== 1 || !Number.isSafeInteger(value.clock) || (value.clock as number) < 0
    || !Array.isArray(value.layouts) || !isRecord(value.entries)) return null;

  const layoutCollectionIds = value.layouts.flatMap((layout) =>
    isRecord(layout) && typeof layout.collectionId === 'string' ? [layout.collectionId] : []);
  const cards = value.layouts.flatMap((layout) => {
    if (!isRecord(layout) || !Array.isArray(layout.cardOrder)) return [];
    const collectionId = layout.collectionId;
    if (typeof collectionId !== 'string') return [];
    return layout.cardOrder.flatMap((cardRef) => {
      if (!isRecord(cardRef) || typeof cardRef.cardId !== 'string' || !isTCGCardLanguage(cardRef.language)) return [];
      return [{
        collectionId,
        cardId: cardRef.cardId,
        language: cardRef.language,
        cardName: 'Cached binder reference',
        addedAt: CACHE_CARD_TIMESTAMP,
      }];
    });
  });
  const layouts = normalizeTCGCustomCollectionLayouts(value.layouts, layoutCollectionIds, cards);
  if (!layouts) return null;

  const entries: Record<string, SyncEntry> = {};
  for (const [rawCollectionId, rawEntry] of Object.entries(value.entries)) {
    if (!UUID_PATTERN.test(rawCollectionId) || !isRecord(rawEntry)
      || !Number.isSafeInteger(rawEntry.clock) || (rawEntry.clock as number) < 0
      || typeof rawEntry.deviceId !== 'string' || rawEntry.deviceId.length === 0
      || typeof rawEntry.present !== 'boolean') return null;
    const collectionId = rawCollectionId.toLowerCase();
    if (entries[collectionId]) return null;
    entries[collectionId] = {
      clock: rawEntry.clock as number,
      deviceId: rawEntry.deviceId,
      present: rawEntry.present,
    };
  }

  return {
    version: 1,
    layouts,
    clock: value.clock as number,
    entries: Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right))),
  };
}

function compareEntries(left: SyncEntry, right: SyncEntry): number {
  if (left.clock !== right.clock) return left.clock - right.clock;
  if (left.deviceId === right.deviceId) return 0;
  return left.deviceId > right.deviceId ? 1 : -1;
}

/** Merge cache snapshots by binder inside one IndexedDB read/write transaction. */
function mergeCaches(currentValue: unknown, incoming: TCGCustomCollectionLayoutCache): TCGCustomCollectionLayoutCache {
  const current = normalizeCache(currentValue);
  if (!current) return incoming;

  const layoutsByCollectionId = new Map(current.layouts.map((layout) => [layout.collectionId, layout]));
  const entries = { ...current.entries };
  const incomingLayouts = new Map(incoming.layouts.map((layout) => [layout.collectionId, layout]));
  const incomingEntries = { ...incoming.entries };
  for (const collectionId of incomingLayouts.keys()) {
    if (!incomingEntries[collectionId]) incomingEntries[collectionId] = LEGACY_CACHE_ENTRY;
  }

  for (const [collectionId, incomingEntry] of Object.entries(incomingEntries)) {
    const currentEntry = entries[collectionId];
    if (currentEntry && compareEntries(incomingEntry, currentEntry) <= 0) continue;
    if (!incomingEntry.present) {
      layoutsByCollectionId.delete(collectionId);
      entries[collectionId] = incomingEntry;
      continue;
    }
    const incomingLayout = incomingLayouts.get(collectionId);
    if (!incomingLayout) continue;
    layoutsByCollectionId.set(collectionId, incomingLayout);
    entries[collectionId] = incomingEntry;
  }

  return normalizeCache({
    version: 1,
    layouts: [...layoutsByCollectionId.values()],
    clock: Math.max(current.clock, incoming.clock),
    entries,
  }) ?? incoming;
}

function cacheKey(userId: string): string | null {
  return typeof userId === 'string' && userId.trim().length > 0
    ? `${CACHE_KEY_PREFIX}${encodeURIComponent(userId)}`
    : null;
}

/** Read only this authenticated account's compact binder layout cache. */
export async function readTCGCustomCollectionLayoutCache(userId: string): Promise<TCGCustomCollectionLayoutCache | null> {
  const key = cacheKey(userId);
  if (!key) return null;
  try {
    return normalizeCache(await idbGet<unknown>(key));
  } catch {
    return null;
  }
}

/** Persist only binder layouts and their sync stamps/tombstones for one account. */
export async function writeTCGCustomCollectionLayoutCache(
  userId: string,
  cache: TCGCustomCollectionLayoutCache,
): Promise<boolean> {
  const key = cacheKey(userId);
  const normalized = normalizeCache(cache);
  if (!key || !normalized) return false;
  try {
    await idbUpdate(key, (current) => mergeCaches(current, normalized));
    return true;
  } catch {
    return false;
  }
}

/** Remove cache-only layout tombstones for binders confirmed present remotely. */
export async function pruneTCGCustomCollectionLayoutTombstones(
  userId: string,
  remoteCollectionIds: readonly string[],
): Promise<boolean> {
  const key = cacheKey(userId);
  if (!key) return false;
  const presentRemotely = new Set(remoteCollectionIds.map((collectionId) => collectionId.toLowerCase()));
  let updated = false;
  try {
    await idbUpdate(key, (currentValue) => {
      const current = normalizeCache(currentValue);
      if (!current) return currentValue;
      const entries = { ...current.entries };
      for (const collectionId of presentRemotely) {
        if (entries[collectionId]?.present === false) delete entries[collectionId];
      }
      updated = true;
      return { ...current, entries };
    });
    return updated;
  } catch {
    return false;
  }
}
