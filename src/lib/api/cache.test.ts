import * as idbKeyval from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let cache: typeof import('./cache');

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
  getMany: vi.fn(),
  setMany: vi.fn(),
  delMany: vi.fn(),
}));

describe('API cache resilience', () => {
  let localStorage: Storage;

  beforeEach(async () => {
    vi.resetModules();
    cache = await import('./cache');
    vi.useFakeTimers();
    vi.resetAllMocks();
    localStorage = createMemoryStorage();
    vi.stubGlobal('window', { indexedDB: {}, localStorage });
    vi.mocked(idbKeyval.get).mockResolvedValue(undefined);
    vi.mocked(idbKeyval.keys).mockResolvedValue([]);
    vi.mocked(idbKeyval.set).mockResolvedValue(undefined);
    vi.mocked(idbKeyval.del).mockResolvedValue(undefined);
    vi.mocked(idbKeyval.getMany).mockResolvedValue([]);
    vi.mocked(idbKeyval.setMany).mockResolvedValue(undefined);
    vi.mocked(idbKeyval.delMany).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('falls back to localStorage when an IndexedDB read never settles', async () => {
    localStorage.setItem(`${CACHE_PREFIX}card-1`, localCacheItem({ id: 'card-1' }));
    vi.mocked(idbKeyval.get).mockImplementation(() => new Promise<unknown>(() => undefined));

    const resultPromise = cache.getCachedData<{ id: string }>('card-1');
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(resultPromise).resolves.toEqual({ id: 'card-1' });
  });

  it('uses localStorage when IndexedDB returns a corrupt cache entry', async () => {
    localStorage.setItem(`${CACHE_PREFIX}card-2`, localCacheItem({ id: 'card-2' }));
    vi.mocked(idbKeyval.get).mockResolvedValue('{not-json');

    await expect(cache.getCachedData<{ id: string }>('card-2')).resolves.toEqual({ id: 'card-2' });
  });

  it('resolves writes and mirrors them locally when IndexedDB is blocked', async () => {
    vi.mocked(idbKeyval.keys).mockImplementation(() => new Promise<IDBValidKey[]>(() => undefined));

    const resultPromise = cache.setCachedData('card-3', { id: 'card-3' });
    await vi.advanceTimersByTimeAsync(2_000);

    await resultPromise;
    expect(JSON.parse(localStorage.getItem(`${CACHE_PREFIX}card-3`) ?? '{}')).toMatchObject({ data: { id: 'card-3' } });
  });

  it('batches a burst of 100 writes into one scan and one write transaction', async () => {
    await Promise.all(Array.from({ length: 100 }, (_, index) => cache.setCachedData(`card-${index}`, { id: index })));
    expect(idbKeyval.keys).toHaveBeenCalledTimes(1);
    expect(idbKeyval.setMany).toHaveBeenCalledTimes(1);
    expect(vi.mocked(idbKeyval.setMany).mock.calls[0][0]).toHaveLength(100);
    expect(localStorage.length).toBe(100);
  });

  it('evicts the oldest cache entries in batches without touching user data', async () => {
    const existing = Array.from({ length: 500 }, (_, index) => `${CACHE_PREFIX}existing-${index}`);
    vi.mocked(idbKeyval.keys).mockResolvedValue(['primedex-preferences', ...existing]);
    vi.mocked(idbKeyval.getMany).mockResolvedValue(existing.map((_, index) => ({ timestamp: index, data: index })));
    await Promise.all(Array.from({ length: 100 }, (_, index) => cache.setCachedData(`new-${index}`, index)));
    expect(idbKeyval.getMany).toHaveBeenCalledWith(existing);
    expect(idbKeyval.delMany).toHaveBeenCalledWith(existing.slice(0, 100));
    expect(idbKeyval.keys).toHaveBeenCalledTimes(1);
    expect(idbKeyval.setMany).toHaveBeenCalledTimes(1);
  });

  it('does not evict entries when updating a full cache', async () => {
    const existing = Array.from({ length: 500 }, (_, index) => `${CACHE_PREFIX}existing-${index}`);
    vi.mocked(idbKeyval.keys).mockResolvedValue(existing);
    await cache.setCachedData('existing-0', 'updated');
    expect(idbKeyval.delMany).not.toHaveBeenCalled();
    expect(idbKeyval.getMany).not.toHaveBeenCalled();
  });

  it('serializes successive batches and keeps the capacity under a larger burst', async () => {
    const values = new Map<IDBValidKey, unknown>([['primedex-preferences', 'keep']]);
    vi.mocked(idbKeyval.keys).mockImplementation(async () => [...values.keys()]);
    vi.mocked(idbKeyval.getMany).mockImplementation(async (keys) => keys.map((key) => values.get(key)));
    vi.mocked(idbKeyval.setMany).mockImplementation(async (entries) => {
      for (const [key, value] of entries) values.set(key, value);
    });
    vi.mocked(idbKeyval.delMany).mockImplementation(async (keys) => {
      for (const key of keys) values.delete(key);
    });
    await Promise.all(Array.from({ length: 650 }, (_, index) => cache.setCachedData(`new-${index}`, index)));
    expect(values.size).toBeLessThanOrEqual(501);
    expect(values.get('primedex-preferences')).toBe('keep');
    expect(values.get(`${CACHE_PREFIX}new-649`)).toMatchObject({ data: 649 });
    expect(idbKeyval.keys).toHaveBeenCalledTimes(7);
    expect(localStorage.length).toBe(650);
  });

  it('settles every queued writer if a storage transaction rejects', async () => {
    vi.mocked(idbKeyval.setMany).mockRejectedValue(new DOMException('Quota', 'QuotaExceededError'));
    await Promise.all(Array.from({ length: 250 }, (_, index) => cache.setCachedData(`new-${index}`, index)));
    expect(idbKeyval.setMany).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(250);
    expect(await cache.getCachedData('new-249')).toBe(249);
  });

  it('preserves TTL and the explicit stale fallback', async () => {
    vi.mocked(idbKeyval.get).mockResolvedValue({ timestamp: Date.now() - 8 * 86400000, data: 'old' });
    expect(await cache.getCachedData('old')).toBeNull();
    expect(await cache.getCachedData('old', true)).toBe('old');
  });
});
