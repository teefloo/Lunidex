import { get, set, keys, del } from 'idb-keyval';

const CACHE_PREFIX = 'poke-cache-v3-';
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_CACHE_ITEMS = 500;
const isIndexedDbAvailable = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

async function evictOldestIfNeeded(): Promise<void> {
  try {
    const allKeys = await keys();
    const cacheKeys = allKeys.filter((k) =>
      typeof k === 'string' && k.startsWith(CACHE_PREFIX)
    ) as string[];

    if (cacheKeys.length < MAX_CACHE_ITEMS) return;

    const itemsWithTs = await Promise.all(
      cacheKeys.map(async (k) => {
        const item = await get<CacheItem<unknown>>(k);
        return { key: k, timestamp: item?.timestamp ?? 0 };
      })
    );

    // Sort oldest first and remove the oldest 20%
    itemsWithTs.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = itemsWithTs.slice(0, Math.ceil(MAX_CACHE_ITEMS * 0.2));

    await Promise.all(toDelete.map((i) => del(i.key)));
  } catch {
    // Silently fail eviction to not block writes
  }
}

export async function getCachedData<T>(key: string, allowExpired = false): Promise<T | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const item = await get<CacheItem<T>>(`${CACHE_PREFIX}${key}`);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > CACHE_EXPIRATION;
    if (isExpired && !allowExpired) {
      return null;
    }

    return item.data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    await evictOldestIfNeeded();
    await set(`${CACHE_PREFIX}${key}`, {
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
