import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('filters exact ID results independently from sorting and name search', async () => {
    const { matchesTCGCardSearchFilters } = await import('./tcg');
    const card: TCGCard = { id: 'base1-4', localId: '4', name: 'Dracaufeu', category: 'Pokemon', types: ['Fire'], hp: 120, set: { id: 'base1', name: 'Set de Base' } };
    expect(matchesTCGCardSearchFilters(card, { searchTerm: 'base1-4', sortOrder: 'desc', selectedSet: 'base1' })).toBe(true);
    expect(matchesTCGCardSearchFilters(card, { selectedSet: 'base2' })).toBe(false);
    expect(matchesTCGCardSearchFilters(card, { selectedCategory: 'Trainer' })).toBe(false);
    expect(matchesTCGCardSearchFilters(card, { selectedTypes: ['Water'] })).toBe(false);
    expect(matchesTCGCardSearchFilters(card, { minHp: 121 })).toBe(false);
    expect(matchesTCGCardSearchFilters(card, { ownedState: 'owned' }, { ownedIds: new Set() })).toBe(false);
  });

  it('does not substitute an English edition while hydrating binder search results', async () => {
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/fr/cards?')) return Promise.resolve({ data: [{ id: 'base1-4', localId: '4', name: 'Dracaufeu' }] });
      if (path.startsWith('/fr/cards/')) return Promise.reject(Object.assign(new Error('Missing detail'), { response: { status: 404 } }));
      return Promise.resolve({ data: { id: 'base1-4', localId: '4', name: 'Charizard', image: 'https://assets.tcgdex.net/en/base/base1/4' } });
    });
    const { searchCards, DEFAULT_TCG_CARD_FILTERS } = await import('./tcg');
    const result = await searchCards({ ...DEFAULT_TCG_CARD_FILTERS, searchTerm: 'Dracaufeu', sortBy: 'name' }, 'fr', 1, 48, undefined, undefined, undefined, false, { allowEnglishFallback: false });
    expect(result.cards).toMatchObject([{ name: 'Dracaufeu' }]);
  });

  it('bounds the complete set catalog route and direct fallback sequence', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), milliseconds);
      return controller.signal;
    });
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const requestSignal = init?.signal;
      requestSignal?.addEventListener('abort', () => reject(requestSignal.reason), { once: true });
    })));
    mocks.get.mockImplementation((_path: string, options?: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
      const requestSignal = options?.signal;
      requestSignal?.addEventListener('abort', () => reject(requestSignal.reason), { once: true });
    }));

    const { fetchCollectionSetCatalog } = await import('./tcg');
    const pendingCatalog = fetchCollectionSetCatalog('en');
    const catalogRejection = expect(pendingCatalog).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(mocks.get).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(8_000);
    expect(mocks.get).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(4_000);
    await catalogRejection;
    expect(mocks.get).toHaveBeenCalledOnce();
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
  it('keeps English fallback data out of strict localized card lookups', async () => {
    let frenchRequests = 0;
    mocks.get.mockImplementation((path: string) => {
      if (path.startsWith('/fr/')) {
        frenchRequests += 1;
        if (frenchRequests === 1) {
          return Promise.reject(Object.assign(new Error('Missing translation'), { response: { status: 404 } }));
        }
        return Promise.resolve({ data: { id: 'base1-4', localId: '4', name: 'Dracaufeu', image: 'https://assets.tcgdex.net/fr/base/base1/4' } });
      }
      return Promise.resolve({ data: { id: 'base1-4', localId: '4', name: 'Charizard', image: 'https://assets.tcgdex.net/en/base/base1/4' } });
    });

    const { getTCGCard } = await import('./tcg');
    await expect(getTCGCard('base1-4', 'fr')).resolves.toMatchObject({ name: 'Charizard' });
    await expect(getTCGCard('base1-4', 'fr', undefined, { allowEnglishFallback: false }))
      .resolves.toMatchObject({ name: 'Dracaufeu' });
    expect(mocks.get.mock.calls.map(([path]) => path)).toEqual([
      '/fr/cards/base1-4',
      '/en/cards/base1-4',
      '/fr/cards/base1-4',
    ]);
  });
  it('keeps localized detail failures retryable instead of caching a missing card', async () => {
    const unavailable = Object.assign(new Error('Upstream unavailable'), { response: { status: 503 } });
    mocks.get.mockRejectedValue(unavailable);

    const { getTCGCard } = await import('./tcg');
    await expect(getTCGCard('base1-5', 'fr', undefined, { allowEnglishFallback: false })).rejects.toBe(unavailable);
    await expect(getTCGCard('base1-5', 'fr', undefined, { allowEnglishFallback: false })).rejects.toBe(unavailable);
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.setCachedData).not.toHaveBeenCalled();
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

  it.each(['getSetById', 'getTCGCard', 'getCardsBySet'] as const)(
    '%s never turns an upstream outage into cached missing data', async method => {
      const failure = Object.assign(new Error('Upstream unavailable'), { response: { status: 503 } });
      mocks.get.mockRejectedValue(failure);
      const api = await import('./tcg');
      const id = method === 'getTCGCard' ? 'base1-4' : 'base1';
      await expect(api[method](id, 'en')).rejects.toBe(failure);
      await expect(api[method](id, 'en')).rejects.toBe(failure);
      expect(mocks.setCachedData).not.toHaveBeenCalled();
    },
  );

  it('does not report a localized set missing when its English fallback is unavailable', async () => {
    const missing = Object.assign(new Error('Missing translation'), { response: { status: 404 } });
    const unavailable = Object.assign(new Error('English unavailable'), { response: { status: 503 } });
    mocks.get.mockImplementation((path: string) => Promise.reject(path.startsWith('/fr/') ? missing : unavailable));
    const { getSetById } = await import('./tcg');
    await expect(getSetById('base1', 'fr')).rejects.toBe(unavailable);
    await expect(getSetById('base1', 'fr')).rejects.toBe(unavailable);
  });

  it('still returns null for a confirmed missing set', async () => {
    mocks.get.mockRejectedValue(Object.assign(new Error('Missing'), { response: { status: 404 } }));
    const { getSetById } = await import('./tcg');
    await expect(getSetById('missing-set', 'en')).resolves.toBeNull();
    await expect(getSetById('missing-set', 'en')).resolves.toBeNull();
  });

  it('keeps an unavailable catalog card as a removable custom collection placeholder', async () => {
    mocks.get.mockRejectedValue(Object.assign(new Error('Missing'), { response: { status: 404 } }));
    const { getTCGCustomCollectionCardDetails } = await import('./tcg');
    const ref = {
      collectionId: '126e8648-39da-4fc9-88b2-fd194d28cc5a',
      cardId: 'base1-4',
      language: 'en' as const,
      cardName: 'Charizard',
      addedAt: '2026-10-19T10:00:00.000Z',
    };

    await expect(getTCGCustomCollectionCardDetails([ref])).resolves.toEqual([{
      ref,
      card: { id: 'base1-4', localId: '4', name: 'Charizard' },
      unavailable: true,
    }]);
    expect(mocks.get).toHaveBeenCalledOnce();
  });
});
