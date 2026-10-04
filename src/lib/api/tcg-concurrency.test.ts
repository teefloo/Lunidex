import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';
const mocks = vi.hoisted(() => ({ get: vi.fn(), getCachedData: vi.fn(), setCachedData: vi.fn() }));
vi.mock('axios', () => ({ default: { create: vi.fn(() => ({ get: mocks.get })) } }));
vi.mock('axios-retry', () => ({ default: Object.assign(vi.fn(), { exponentialDelay: vi.fn(), isNetworkOrIdempotentRequestError: vi.fn() }) }));
vi.mock('@/lib/sentry-observability', () => ({ attachAxiosSentryInstrumentation: vi.fn(), reportFallback: vi.fn(), reportHttpFailure: vi.fn() }));
vi.mock('./cache', () => ({ getCachedData: mocks.getCachedData, setCachedData: mocks.setCachedData }));

describe('TCG cancellation and shared requests', () => {
  beforeEach(() => {
    vi.resetModules(); vi.resetAllMocks();
    mocks.getCachedData.mockResolvedValue(null);
    mocks.setCachedData.mockResolvedValue(undefined);
  });
  it('keeps a shared request alive when an independent subscriber cancels', async () => {
    let finishShared!: (response: { data: TCGCard }) => void;
    mocks.get.mockImplementation((_path: string, options?: { signal?: AbortSignal }) => options?.signal
      ? new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(options.signal?.reason)))
      : new Promise(resolve => { finishShared = resolve; }));
    const { getTCGCard } = await import('./tcg');
    const sharedA = getTCGCard('base1-4', 'en');
    const sharedB = getTCGCard('base1-4', 'en');
    const controller = new AbortController();
    const independent = getTCGCard('base1-4', 'en', controller.signal);
    const rejection = expect(independent).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    controller.abort();
    await rejection;
    finishShared({ data: { id: 'base1-4', localId: '4', name: 'Charizard', image: 'https://assets.tcgdex.net/en/base/base1/4' } });
    expect(await sharedA).toMatchObject({ id: 'base1-4' });
    expect(await sharedB).toMatchObject({ id: 'base1-4' });
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
  it('does not start a fallback after a request was cancelled', async () => {
    const { getTCGCard } = await import('./tcg');
    const controller = new AbortController(); controller.abort();
    await expect(getTCGCard('base1-4', 'fr', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it.each([429, 503])('keeps a %i search failure retryable without persisting an empty result', async status => {
    const failure = Object.assign(new Error('Upstream unavailable'), { response: { status } });
    mocks.get.mockRejectedValueOnce(failure).mockResolvedValue({ data: [] });
    const { searchCards } = await import('./tcg');
    await expect(searchCards({}, 'en')).rejects.toBe(failure);
    expect(mocks.setCachedData).not.toHaveBeenCalled();
    await expect(searchCards({}, 'en')).resolves.toEqual({ cards: [], hasMore: false });
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
  it.each([429, 503])('uses the established stale result during a %i search failure', async status => {
    const stale = { cards: [{ id: 'base1-4', localId: '4', name: 'Charizard' }], hasMore: false };
    mocks.getCachedData.mockImplementation((_key: string, allowExpired?: boolean) => Promise.resolve(allowExpired ? stale : null));
    mocks.get.mockRejectedValue(Object.assign(new Error('Upstream unavailable'), { response: { status } }));
    const { searchCards } = await import('./tcg');
    await expect(searchCards({}, 'en')).resolves.toBe(stale);
    expect(mocks.setCachedData).not.toHaveBeenCalled();
  });
});
