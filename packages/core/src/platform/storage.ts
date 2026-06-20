import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const isIndexedDbAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

/**
 * Web persistence adapter backed by IndexedDB (via idb-keyval).
 *
 * The mobile build resolves the sibling `storage.native.ts` instead (Metro
 * platform resolution), so this file keeps the original browser behaviour and
 * stays free of any React Native dependency.
 */
export const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isIndexedDbAvailable()) return null;
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isIndexedDbAvailable()) return;
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isIndexedDbAvailable()) return;
    await del(name);
  },
};
