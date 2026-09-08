export interface MemoryCacheOptions {
  maxEntries: number;
  ttlMs: number;
}

export interface MemoryCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Small process-local LRU cache for data that is already persisted elsewhere.
 * It is intentionally bounded and short-lived: it only removes duplicate
 * storage/network work during a single browsing session.
 */
export function createMemoryCache<T>({ maxEntries, ttlMs }: MemoryCacheOptions): MemoryCache<T> {
  const entries = new Map<string, MemoryCacheEntry<T>>();
  const capacity = Math.max(1, Math.floor(maxEntries));
  const lifetime = Math.max(0, Math.floor(ttlMs));

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }

      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      while (entries.size >= capacity) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
      entries.set(key, { value, expiresAt: Date.now() + lifetime });
    },
    clear() {
      entries.clear();
    },
  };
}
