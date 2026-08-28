import { del, get, keys, set } from 'idb-keyval';

export interface CacheStorage {
  getItem(key: string): Promise<unknown | null>;
  setItem(key: string, value: unknown): Promise<void>;
  removeItem(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

const isIndexedDbAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

/**
 * Browser cache adapter backed by IndexedDB. Values stay as structured data,
 * which keeps this adapter compatible with the existing web cache entries.
 */
export const cacheStorage: CacheStorage = {
  async getItem(key) {
    if (!isIndexedDbAvailable()) return null;
    return (await get<unknown>(key)) ?? null;
  },
  async setItem(key, value) {
    if (!isIndexedDbAvailable()) return;
    await set(key, value);
  },
  async removeItem(key) {
    if (!isIndexedDbAvailable()) return;
    await del(key);
  },
  async keys() {
    if (!isIndexedDbAvailable()) return [];
    return (await keys()).filter((key): key is string => typeof key === 'string');
  },
};
