import { get, getMany, setMany, keys, delMany } from 'idb-keyval';
import { featureFromCacheKey, reportFallback } from '@/lib/sentry-observability';

const CACHE_PREFIX = 'poke-cache-v3-';
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_CACHE_ITEMS = 500;
const CACHE_OPERATION_TIMEOUT_MS = 1_500;
let indexedDbUnavailable = false;
const isIndexedDbAvailable = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface PendingCacheWrite {
  key: string;
  item: CacheItem<unknown>;
  resolve: () => void;
}

const pendingWrites: PendingCacheWrite[] = [];
let flushingWrites = false;

function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isCacheItem<T>(value: unknown): value is CacheItem<T> {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CacheItem<T>>;
  return typeof item.timestamp === 'number' && Number.isFinite(item.timestamp) && 'data' in item;
}

function readCacheItem<T>(value: unknown, key: string, allowExpired: boolean): T | null {
  if (!isCacheItem<T>(value)) return null;

  const isExpired = Date.now() - value.timestamp > CACHE_EXPIRATION;
  if (isExpired && !allowExpired) return null;

  if (isExpired && allowExpired) {
    reportFallback('stale-cache', {
      feature: featureFromCacheKey(key),
      operation: 'cache-read',
    });
  }

  return value.data;
}

function readLocalCache<T>(key: string, allowExpired: boolean): T | null {
  try {
    const raw = getLocalStorage()?.getItem(getCacheKey(key));
    if (!raw) return null;
    return readCacheItem<T>(JSON.parse(raw), key, allowExpired);
  } catch {
    return null;
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs = CACHE_OPERATION_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Cache operation timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function runIndexedDbOperation<T>(operation: () => Promise<T>): Promise<T> {
  if (indexedDbUnavailable || !isIndexedDbAvailable()) {
    throw new Error('IndexedDB unavailable');
  }

  try {
    return await withTimeout(Promise.resolve().then(operation));
  } catch (error) {
    indexedDbUnavailable = true;
    throw error;
  }
}

async function writeCacheBatch(batch: PendingCacheWrite[]): Promise<void> {
  const allKeys = await runIndexedDbOperation(() => keys());
  const cacheKeys = allKeys.filter((k) =>
    typeof k === 'string' && k.startsWith(CACHE_PREFIX)
  ) as string[];

  const existingKeys = new Set(cacheKeys);
  const incomingKeys = new Set(batch.map(({ key }) => key));
  const newCount = [...incomingKeys].filter((key) => !existingKeys.has(key)).length;
  const overflow = cacheKeys.length + newCount - MAX_CACHE_ITEMS;

  if (overflow > 0) {
    const items = await runIndexedDbOperation(() => getMany<CacheItem<unknown>>(cacheKeys));
    const oldest = cacheKeys
      .map((key, index) => ({ key, timestamp: items[index]?.timestamp ?? 0 }))
      .filter(({ key }) => !incomingKeys.has(key))
      .sort((left, right) => left.timestamp - right.timestamp);
    const evictionCount = Math.max(overflow, Math.ceil(MAX_CACHE_ITEMS * 0.2));
    await runIndexedDbOperation(() => delMany(oldest.slice(0, evictionCount).map(({ key }) => key)));
  }

  await runIndexedDbOperation(() => setMany(batch.map(({ key, item }) => [key, item])));
}

async function flushCacheWrites(): Promise<void> {
  // Serialize eviction and writes. Parallel responses share transactions,
  // and each batch rechecks the database so writes in other tabs are visible.
  while (pendingWrites.length > 0) {
    const batch = pendingWrites.splice(0, 100);
    try {
      if (!indexedDbUnavailable) await writeCacheBatch(batch);
    } catch {
      // The bounded operation disables IndexedDB; callers still mirror locally.
    } finally {
      for (const write of batch) write.resolve();
    }
  }
  flushingWrites = false;
}

function enqueueCacheWrite(key: string, item: CacheItem<unknown>): Promise<void> {
  return new Promise((resolve) => {
    pendingWrites.push({ key, item, resolve });
    if (!flushingWrites) {
      flushingWrites = true;
      // Coalesce writes from the same response burst without adding a timer.
      queueMicrotask(() => { void flushCacheWrites(); });
    }
  });
}

export async function getCachedData<T>(key: string, allowExpired = false): Promise<T | null> {
  if (!indexedDbUnavailable && isIndexedDbAvailable()) {
    try {
      const item = await runIndexedDbOperation(() => get<CacheItem<T>>(getCacheKey(key)));
      const cached = readCacheItem<T>(item, key, allowExpired);
      if (cached !== null) return cached;
    } catch {
      // A blocked, rejected, or stalled IndexedDB must not hold API requests.
    }
  }

  return readLocalCache<T>(key, allowExpired);
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const item: CacheItem<T> = { data, timestamp: Date.now() };

  if (!indexedDbUnavailable && isIndexedDbAvailable()) {
    await enqueueCacheWrite(getCacheKey(key), item);
  }

  try {
    getLocalStorage()?.setItem(getCacheKey(key), JSON.stringify(item));
  } catch {
    // LocalStorage can be unavailable or over quota; the in-memory response
    // remains usable and the IndexedDB copy, when available, is still valid.
  }
}
