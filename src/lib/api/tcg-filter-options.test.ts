import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), getCachedData: vi.fn(), setCachedData: vi.fn() }));
vi.mock('axios', () => ({ default: { create: vi.fn(() => ({ get: mocks.get })) } }));
vi.mock('axios-retry', () => ({ default: Object.assign(vi.fn(), { exponentialDelay: vi.fn(), isNetworkOrIdempotentRequestError: vi.fn() }) }));
vi.mock('@/lib/sentry-observability', () => ({ attachAxiosSentryInstrumentation: vi.fn(), reportFallback: vi.fn(), reportHttpFailure: vi.fn() }));
vi.mock('./cache', () => ({ getCachedData: mocks.getCachedData, setCachedData: mocks.setCachedData }));

describe('cold TCG filter catalog', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getCachedData.mockResolvedValue(null);
    mocks.setCachedData.mockResolvedValue(undefined);
  });

  it('uses one ordered manifest request and keeps the latest set first', async () => {
    mocks.get.mockResolvedValue({ data: [
      { id: 'me04', name: 'Latest', cardCount: { total: 200, official: 200 } },
      { id: 'base1', name: 'Base Set', cardCount: { total: 102, official: 102 } },
    ] });
    const { getFilterOptions } = await import('./tcg');
    const { sortTCGSetsNewestFirst } = await import('../tcg-research');
    const options = await getFilterOptions('en');
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.get.mock.calls[0][0]).toBe('/en/sets?sort:field=releaseDate&sort:order=DESC');
    expect(sortTCGSetsNewestFirst(options.sets ?? []).map((set) => set.id)).toEqual(['me04', 'base1']);
    expect(options.categories).toContain('Pokemon');
  });
});
