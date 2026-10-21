import { describe, expect, it, vi } from 'vitest';

import { createResilientStorage } from './persistence';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));

  return {
    clear: () => values.clear(),
    getItem: (name) => values.get(name) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (name) => values.delete(name),
    setItem: (name, value) => values.set(name, value),
  } as Storage;
}

const persistedState = JSON.stringify({
  state: { tcgBrowseLanguage: 'fr' },
  version: 3,
});

describe('createResilientStorage', () => {
  it('treats empty IndexedDB and localStorage as a completed empty hydration', async () => {
    const storage = createResilientStorage({
      getLocalStorage: () => createMemoryStorage(),
      idbAvailable: () => true,
      idb: {
        get: async () => undefined,
        set: async () => undefined,
        del: async () => undefined,
      },
    });

    await expect(storage.getItem('session')).resolves.toBeNull();
  });

  it('falls back to localStorage when IndexedDB never settles', async () => {
    const localStorage = createMemoryStorage({ session: persistedState });
    const storage = createResilientStorage({
      getLocalStorage: () => localStorage,
      idbAvailable: () => true,
      idb: {
        get: () => new Promise<unknown>(() => undefined),
        set: async () => undefined,
        del: async () => undefined,
      },
      timeoutMs: 5,
    });

    await expect(storage.getItem('session')).resolves.toBe(persistedState);
  });

  it('falls back when IndexedDB rejects or returns corrupted data', async () => {
    const rejectedLocalStorage = createMemoryStorage({ session: persistedState });
    const rejectedStorage = createResilientStorage({
      getLocalStorage: () => rejectedLocalStorage,
      idbAvailable: () => true,
      idb: {
        get: async () => {
          throw new Error('IndexedDB blocked');
        },
        set: async () => undefined,
        del: async () => undefined,
      },
      timeoutMs: 5,
    });

    await expect(rejectedStorage.getItem('session')).resolves.toBe(persistedState);

    const corruptedLocalStorage = createMemoryStorage({ session: persistedState });
    const corruptedStorage = createResilientStorage({
      getLocalStorage: () => corruptedLocalStorage,
      idbAvailable: () => true,
      idb: {
        get: async () => '{not-json',
        set: async () => undefined,
        del: async () => undefined,
      },
      timeoutMs: 5,
    });

    await expect(corruptedStorage.getItem('session')).resolves.toBe(persistedState);
  });

  it('mirrors writes locally and resolves after a blocked IndexedDB write', async () => {
    const localStorage = createMemoryStorage();
    const storage = createResilientStorage({
      getLocalStorage: () => localStorage,
      idbAvailable: () => true,
      idb: {
        get: async () => undefined,
        set: () => new Promise<void>(() => undefined),
        del: () => new Promise<void>(() => undefined),
      },
      timeoutMs: 5,
    });

    await storage.setItem('session', persistedState);
    expect(localStorage.getItem('session')).toBe(persistedState);

    await storage.removeItem('session');
    expect(localStorage.getItem('session')).toBeNull();
  });

  it('reports persistence failure once until a later write succeeds', async () => {
    let fail = true;
    const onPersistenceError = vi.fn();
    const localStorage = {
      setItem: () => {
        if (fail) throw new Error('Storage is full');
      },
      getItem: () => null,
      removeItem: () => undefined,
    } as unknown as Storage;
    const storage = createResilientStorage({
      getLocalStorage: () => localStorage,
      idbAvailable: () => true,
      idb: {
        get: async () => undefined,
        set: async () => {
          if (fail) throw new Error('IndexedDB is unavailable');
        },
        del: async () => undefined,
      },
      onPersistenceError,
    });

    await storage.setItem('session', persistedState);
    await storage.setItem('session', persistedState);
    expect(onPersistenceError).toHaveBeenCalledOnce();

    fail = false;
    await storage.setItem('session', persistedState);
    fail = true;
    await storage.setItem('session', persistedState);
    expect(onPersistenceError).toHaveBeenCalledTimes(2);
  });
});
