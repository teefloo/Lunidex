import type { StateStorage } from 'zustand/middleware';

interface IndexedDbOperations {
  get: (name: string) => Promise<unknown>;
  set: (name: string, value: string) => Promise<unknown>;
  del: (name: string) => Promise<unknown>;
}

export interface ResilientStorageOptions {
  getLocalStorage: () => Storage | null;
  idb: IndexedDbOperations;
  idbAvailable: () => boolean;
  timeoutMs?: number;
}

const DEFAULT_STORAGE_TIMEOUT_MS = 1_500;

function isUsablePersistedValue(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false;

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Persistent storage timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function createResilientStorage({
  getLocalStorage,
  idb,
  idbAvailable,
  timeoutMs = DEFAULT_STORAGE_TIMEOUT_MS,
}: ResilientStorageOptions): StateStorage {
  const canUseIndexedDb = (): boolean => {
    try {
      return idbAvailable();
    } catch {
      return false;
    }
  };

  const getFallbackValue = (name: string): string | null => {
    try {
      const value = getLocalStorage()?.getItem(name) ?? null;
      return isUsablePersistedValue(value) ? value : null;
    } catch {
      return null;
    }
  };

  return {
    getItem: async (name) => {
      if (canUseIndexedDb()) {
        try {
          const value = await withTimeout(idb.get(name), timeoutMs);
          if (isUsablePersistedValue(value)) return value;
        } catch {
          // A blocked, unavailable, or corrupt IndexedDB must not block hydration.
        }
      }

      return getFallbackValue(name);
    },
    setItem: async (name, value) => {
      if (canUseIndexedDb()) {
        try {
          await withTimeout(idb.set(name, value), timeoutMs);
        } catch {
          // Keep the synchronous fallback below as the durable best effort.
        }
      }

      try {
        getLocalStorage()?.setItem(name, value);
      } catch {
        // Persistence is best effort; the in-memory Zustand state remains usable.
      }
    },
    removeItem: async (name) => {
      if (canUseIndexedDb()) {
        try {
          await withTimeout(idb.del(name), timeoutMs);
        } catch {
          // Continue and remove the fallback copy as well.
        }
      }

      try {
        getLocalStorage()?.removeItem(name);
      } catch {
        // Persistence is best effort.
      }
    },
  };
}
