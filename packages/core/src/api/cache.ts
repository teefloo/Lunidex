import { cacheStorage } from '../platform/cache-storage';

const CACHE_PREFIX = 'poke-cache-v3-';
const CACHE_EXPIRATION = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_CACHE_ITEMS = 500;
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCacheItem<T>(value: unknown): value is CacheItem<T> {
  return isRecord(value)
    && Number.isFinite(value.timestamp)
    && Object.prototype.hasOwnProperty.call(value, 'data');
}

async function evictOldestIfNeeded(): Promise<void> {
  try {
    const allKeys = await cacheStorage.keys();
    const cacheKeys = allKeys.filter((k) =>
      typeof k === 'string' && k.startsWith(CACHE_PREFIX)
    );

    if (cacheKeys.length < MAX_CACHE_ITEMS) return;

    const itemsWithTs = await Promise.all(
      cacheKeys.map(async (k) => {
        const item = await cacheStorage.getItem(k);
        return {
          key: k,
          timestamp: isCacheItem(item) ? item.timestamp : 0,
        };
      })
    );

    // Sort oldest first and remove the oldest 20%
    itemsWithTs.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = itemsWithTs.slice(0, Math.ceil(MAX_CACHE_ITEMS * 0.2));

    await Promise.all(toDelete.map((i) => cacheStorage.removeItem(i.key)));
  } catch {
    // Silently fail eviction to not block writes
  }
}

export async function getCachedData<T>(key: string, allowExpired = false): Promise<T | null> {
  try {
    const item = await cacheStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!isCacheItem<T>(item)) return null;

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
  try {
    await evictOldestIfNeeded();
    await cacheStorage.setItem(`${CACHE_PREFIX}${key}`, {
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
