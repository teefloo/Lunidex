import * as idbKeyval from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCachedData, setCachedData } from './cache';

const CACHE_PREFIX = 'poke-cache-v3-';

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

function localCacheItem(data: unknown, timestamp = Date.now()): string {
  return JSON.stringify({ data, timestamp });
}

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
}));

describe('API cache resilience', () => {
  let localStorage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage = createMemoryStorage();
    vi.stubGlobal('window', { indexedDB: {}, localStorage });
    vi.mocked(idbKeyval.keys).mockResolvedValue([]);
    vi.mocked(idbKeyval.set).mockResolvedValue(undefined);
    vi.mocked(idbKeyval.del).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('falls back to localStorage when an IndexedDB read never settles', async () => {
    localStorage.setItem(`${CACHE_PREFIX}card-1`, localCacheItem({ id: 'card-1' }));
    vi.mocked(idbKeyval.get).mockImplementation(() => new Promise<unknown>(() => undefined));

    const resultPromise = getCachedData<{ id: string }>('card-1');
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(resultPromise).resolves.toEqual({ id: 'card-1' });
  });

  it('uses localStorage when IndexedDB returns a corrupt cache entry', async () => {
    localStorage.setItem(`${CACHE_PREFIX}card-2`, localCacheItem({ id: 'card-2' }));
    vi.mocked(idbKeyval.get).mockResolvedValue('{not-json');

    await expect(getCachedData<{ id: string }>('card-2')).resolves.toEqual({ id: 'card-2' });
  });

  it('resolves writes and mirrors them locally when IndexedDB is blocked', async () => {
    vi.mocked(idbKeyval.keys).mockImplementation(() => new Promise<IDBValidKey[]>(() => undefined));

    const resultPromise = setCachedData('card-3', { id: 'card-3' });
    await vi.advanceTimersByTimeAsync(2_000);

    await resultPromise;
    expect(JSON.parse(localStorage.getItem(`${CACHE_PREFIX}card-3`) ?? '{}')).toMatchObject({ data: { id: 'card-3' } });
  });
});
