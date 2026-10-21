// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchAppApi: vi.fn(), i18n: { t: (key: string) => key } }));

vi.mock('@/lib/app-api', () => ({ fetchAppApi: mocks.fetchAppApi }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ i18n: mocks.i18n }) }));
vi.mock('@/lib/neon/AuthProvider', async () => {
  const { createContext } = await import('react');
  return { AuthContext: createContext(null) };
});
vi.mock('@/lib/product-measurement', () => ({
  getFirstPersistedTcgValue: vi.fn(),
  getPersistedTcgAddition: vi.fn(),
  setProductTrackingIdentity: vi.fn(),
  trackReturnAfterActivation: vi.fn(),
  trackTcgPersistedValue: vi.fn(),
}));
vi.mock('@/lib/tcg-persistence-measurement', () => ({
  getFirstPersistedTcgValue: vi.fn(),
  getPersistedTcgAddition: vi.fn(),
}));
vi.mock('@/lib/posthog-client', () => ({ capturePostHogEvent: vi.fn() }));
vi.mock('@/lib/sentry-observability', () => ({
  isLikelyNetworkError: (error: unknown) => error instanceof TypeError,
  reportFallback: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn() } }));

import { AuthContext } from '@/lib/neon/AuthProvider';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { usePrimeDexStore } from '@/store/primedex';
import { retrySyncAccess, setSyncAccessStatus } from '@/store/sync-access';
import { useNeonSync } from './useSupabaseSync';
import { saveTCGInvestmentConfirmed } from '@/lib/tcg-investment-save';
import { getSyncWriteStatus, resetSyncWriteStatus } from '@/store/sync-write-status';
import type { TCGInvestment } from '@primedex/core/lib/tcg-investments';

const investmentInput: Omit<TCGInvestment, 'id' | 'createdAt' | 'updatedAt'> = {
  cardId: 'base1-1', cardName: 'Alakazam', setId: 'base1', language: 'en', variant: 'normal', printing: '',
  condition: 'unknown', quantity: 1, unitCostCents: 2000, feesCents: 0, acquiredOn: null, valuation: null,
};

function response(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unavailable',
    json: async () => payload,
  } as Response;
}

function SyncProbe() {
  useNeonSync();
  return createElement('output', null, useSyncAccessStatus());
}

describe('account sync initialization', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetSyncWriteStatus();
    mocks.fetchAppApi.mockImplementation(() => new Promise<Response>(() => undefined));
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    usePrimeDexStore.setState({ _hasHydrated: true });
    setSyncAccessStatus('checking');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    usePrimeDexStore.setState({
      favorites: [],
      tcgWishlistCards: [],
      tcgCustomCollections: [],
      tcgCustomCollectionCards: [],
      tcgInvestments: [],
    });
    setSyncAccessStatus('checking');
    resetSyncWriteStatus();
    vi.useRealTimers();
  });

  async function renderSync() {
    await act(async () => {
      root.render(createElement(
        AuthContext.Provider,
        { value: { enabled: true, loading: false, user: { id: 'account-a' } } as never },
        createElement(SyncProbe),
      ));
      await Promise.resolve();
    });
  }

  it('moves a stalled account-state request to unavailable after bounded retries', async () => {
    await renderSync();
    expect(container.querySelector('output')?.textContent).toBe('checking');
    expect(mocks.fetchAppApi).toHaveBeenCalledOnce();

    await act(async () => vi.advanceTimersByTimeAsync(10_250));

    expect(container.querySelector('output')?.textContent).toBe('unavailable');
    expect(mocks.fetchAppApi).toHaveBeenCalledTimes(2);
  });

  it('does not mark a malformed successful response as an empty ready collection', async () => {
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { updatedAt: null }));

    await renderSync();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('output')?.textContent).toBe('unavailable');
    expect(mocks.fetchAppApi).toHaveBeenCalledOnce();
  });

  it('recovers after a user retries synchronization', async () => {
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(10_250));
    expect(container.querySelector('output')?.textContent).toBe('unavailable');

    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }));
    await act(async () => {
      retrySyncAccess();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(container.querySelector('output')?.textContent).toBe('ready');
  });

  it('keeps a custom collection locally when the cloud rejects its size and retries that saved state', async () => {
    const collection = {
      id: '126e8648-39da-4fc9-88b2-fd194d28cc5a',
      name: 'Oversized binder',
      createdAt: '2026-10-19T10:00:00.000Z',
      updatedAt: '2026-10-19T10:00:00.000Z',
    };
    mocks.fetchAppApi
      .mockResolvedValueOnce(response(200, { data: {}, updatedAt: '2026-10-19T10:00:00.000Z' }))
      .mockResolvedValueOnce(response(413, { error: 'State payload is too large' }))
      .mockResolvedValueOnce(response(200, {
        data: { tcgCustomCollections: [collection] },
        updatedAt: '2026-10-19T10:01:00.000Z',
      }));

    await renderSync();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('output')?.textContent).toBe('ready');

    await act(async () => {
      usePrimeDexStore.setState({
        tcgCustomCollections: [collection],
      });
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(usePrimeDexStore.getState().tcgCustomCollections).toEqual([collection]);
    expect(container.querySelector('output')?.textContent).toBe('ready');
    expect(getSyncWriteStatus()).toEqual({ state: 'error', reason: 'too-large' });
    const { toast } = await import('@/lib/toast');
    expect(toast.error).toHaveBeenCalledWith('tcg.custom_collections.document_too_large');

    await act(async () => {
      resetSyncWriteStatus();
      retrySyncAccess();
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.fetchAppApi).toHaveBeenCalledTimes(3);
    expect(mocks.fetchAppApi.mock.calls[2]?.[1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(String(mocks.fetchAppApi.mock.calls[2]?.[1]?.body))).toMatchObject({
      data: { tcgCustomCollections: [collection] },
    });
    expect(getSyncWriteStatus().state).toBe('saved');
  });

  it('clears investment records when the authenticated account changes or signs out', async () => {
    const lot = {
      id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', cardId: 'base1-1', cardName: 'Alakazam', setId: 'base1',
      language: 'en', variant: 'normal', printing: '', condition: 'unknown', quantity: 1, unitCostCents: 2000,
      feesCents: 0, acquiredOn: null, valuation: null, createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z',
    };
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: { tcgInvestments: [lot] }, updatedAt: null }));
    await renderSync();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
    await act(async () => {
      root.render(createElement(AuthContext.Provider, { value: { enabled: true, loading: false, user: { id: 'account-b' } } as never }, createElement(SyncProbe)));
      await Promise.resolve();
    });
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);
    await act(async () => {
      root.render(createElement(AuthContext.Provider, { value: { enabled: true, loading: false, user: null } as never }, createElement(SyncProbe)));
      await Promise.resolve();
    });
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);
    expect(container.querySelector('output')?.textContent).toBe('unauthenticated');
  });

  it('keeps an investment save pending until its PUT succeeds', async () => {
    let accept: (value: Response) => void = () => undefined;
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { accept = resolve; }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));

    let settled = false;
    const save = saveTCGInvestmentConfirmed(investmentInput);
    void save.then(() => { settled = true; });
    const lot = usePrimeDexStore.getState().tcgInvestments[0];
    expect(getSyncWriteStatus()).toEqual({ state: 'queued' });
    await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(settled).toBe(false);
    expect(getSyncWriteStatus()).toEqual({ state: 'saving' });

    await act(async () => {
      accept(response(200, { data: { tcgInvestments: [lot] }, updatedAt: '2026-10-20T10:00:00.000Z' }));
    });
    expect(settled).toBe(true);
    await expect(save).resolves.toEqual({ ok: true, id: lot.id });
    expect(getSyncWriteStatus()).toEqual({ state: 'saved' });
  });

  it('does not confirm a newer edit when an earlier batched PUT finishes', async () => {
    let acceptFirst: (value: Response) => void = () => undefined;
    let acceptSecond: (value: Response) => void = () => undefined;
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { acceptFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { acceptSecond = resolve; }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));

    await act(async () => {
      usePrimeDexStore.setState({ favorites: [1] });
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(getSyncWriteStatus()).toEqual({ state: 'saving' });

    await act(async () => {
      usePrimeDexStore.setState({ favorites: [1, 2] });
      expect(getSyncWriteStatus()).toEqual({ state: 'queued' });
      acceptFirst(response(200, { data: { favorites: [1] }, updatedAt: '2026-10-20T10:00:00.000Z' }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.fetchAppApi).toHaveBeenCalledTimes(3);
    expect(getSyncWriteStatus()).toEqual({ state: 'saving' });
    await act(async () => {
      acceptSecond(response(200, { data: { favorites: [1, 2] }, updatedAt: '2026-10-20T10:00:01.000Z' }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getSyncWriteStatus()).toEqual({ state: 'saved' });
  });

  it('reports an oversized investment write as failed and keeps the local lot for retry', async () => {
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockResolvedValueOnce(response(413, { error: 'State payload is too large' }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    await act(async () => vi.advanceTimersByTimeAsync(100));
    await expect(save).resolves.toEqual({ ok: false, reason: 'too-large' });
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
    expect(container.querySelector('output')?.textContent).toBe('ready');
  });

  it('does not acknowledge a later concurrent edit with the earlier PUT response', async () => {
    const accept: Array<(value: Response) => void> = [];
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementation(() => new Promise<Response>((resolve) => { accept.push(resolve); }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const first = saveTCGInvestmentConfirmed(investmentInput);
    const initialLot = usePrimeDexStore.getState().tcgInvestments[0];
    await act(async () => vi.advanceTimersByTimeAsync(100));
    let secondSettled = false;
    const second = saveTCGInvestmentConfirmed({ ...investmentInput, quantity: 2 }, initialLot.id);
    void second.then(() => { secondSettled = true; });
    const laterLot = usePrimeDexStore.getState().tcgInvestments[0];
    await act(async () => {
      accept[0](response(200, { data: { tcgInvestments: [initialLot] }, updatedAt: '2026-10-20T10:00:00.000Z' }));
    });
    await expect(first).resolves.toEqual({ ok: true, id: initialLot.id });
    expect(secondSettled).toBe(false);
    expect(usePrimeDexStore.getState().tcgInvestments[0].quantity).toBe(2);
    await act(async () => {
      accept[1](response(200, { data: { tcgInvestments: [laterLot] }, updatedAt: '2026-10-20T10:00:01.000Z' }));
    });
    await expect(second).resolves.toEqual({ ok: true, id: laterLot.id });
  });

  it('bounds a hung PUT, keeps the local edit, and ignores a late acceptance', async () => {
    let accept: (value: Response) => void = () => undefined;
    let signal: AbortSignal | undefined;
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementationOnce((_url, options: RequestInit) => {
        signal = options.signal ?? undefined;
        return new Promise<Response>((resolve) => { accept = resolve; });
      });
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    const lot = usePrimeDexStore.getState().tcgInvestments[0];
    await act(async () => vi.advanceTimersByTimeAsync(5100));
    await expect(save).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(signal?.aborted).toBe(true);
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
    await act(async () => {
      accept(response(200, { data: { tcgInvestments: [lot] }, updatedAt: '2026-10-20T10:00:00.000Z' }));
    });
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
  });

  it('rejects a pending save when the account changes', async () => {
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    await act(async () => {
      root.render(createElement(AuthContext.Provider, { value: { enabled: true, loading: false, user: { id: 'account-b' } } as never }, createElement(SyncProbe)));
    });
    await expect(save).resolves.toEqual({ ok: false, reason: 'session-changed' });
  });

  it('does not report success when the accepted snapshot omits the requested lot', async () => {
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockResolvedValueOnce(response(200, { data: { tcgInvestments: [] }, updatedAt: '2026-10-20T10:00:00.000Z' }))
      .mockResolvedValueOnce(response(413, { error: 'State payload is too large' }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    await act(async () => vi.advanceTimersByTimeAsync(100));
    await expect(save).resolves.toEqual({ ok: false, reason: 'conflict' });
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);

    // The later local edit stays available after rejection without restoring
    // the investment excluded from the earlier accepted server response.
    await act(async () => {
      usePrimeDexStore.setState({ tcgWishlistCards: ['base1-2'] });
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(usePrimeDexStore.getState().tcgWishlistCards).toEqual(['base1-2']);
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);
  });

  it('preserves a newer in-flight edit when its write is rejected', async () => {
    const respond: Array<(value: Response) => void> = [];
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementation(() => new Promise<Response>((resolve) => { respond.push(resolve); }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const first = saveTCGInvestmentConfirmed(investmentInput);
    const lot = usePrimeDexStore.getState().tcgInvestments[0];
    await act(async () => vi.advanceTimersByTimeAsync(100));
    const newer = saveTCGInvestmentConfirmed({ ...investmentInput, quantity: 2 }, lot.id);
    await act(async () => {
      respond[0](response(200, { data: { tcgInvestments: [] }, updatedAt: '2026-10-20T10:00:00.000Z' }));
    });
    await expect(first).resolves.toEqual({ ok: false, reason: 'conflict' });
    expect(usePrimeDexStore.getState().tcgInvestments[0].quantity).toBe(2);

    await act(async () => { respond[1](response(413, { error: 'State payload is too large' })); });
    await expect(newer).resolves.toEqual({ ok: false, reason: 'too-large' });
    expect(usePrimeDexStore.getState().tcgInvestments[0]?.quantity).toBe(2);
  });

  it('rejects an invalid successful write response instead of assuming the request was accepted', async () => {
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockResolvedValueOnce(response(200, { updatedAt: '2026-10-20T10:00:00.000Z' }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    await act(async () => vi.advanceTimersByTimeAsync(100));
    await expect(save).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
  });

  it('rejects an in-flight save when offline and ignores its later completion', async () => {
    let accept: (value: Response) => void = () => undefined;
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { accept = resolve; }));
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    const lot = usePrimeDexStore.getState().tcgInvestments[0];
    await act(async () => vi.advanceTimersByTimeAsync(100));
    await act(async () => { window.dispatchEvent(new Event('offline')); });
    await expect(save).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);
    await act(async () => {
      accept(response(200, { data: { tcgInvestments: [lot] }, updatedAt: '2026-10-20T10:00:00.000Z' }));
    });
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);
    expect(container.querySelector('output')?.textContent).toBe('unavailable');
  });

  it('retries an ambiguous timed-out creation with the same UUID after the server committed it', async () => {
    const creationId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
    let committed: { data: object; expectedUpdatedAt: string | null } | undefined;
    const acceptedWrites: Array<{ tcgInvestments: TCGInvestment[] }> = [];
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementationOnce((_url, options: RequestInit) => {
        committed = JSON.parse(options.body as string) as typeof committed;
        return new Promise<Response>(() => undefined);
      })
      .mockImplementationOnce(() => Promise.resolve(response(409, { data: committed?.data, updatedAt: '2026-10-20T10:00:00.000Z' })))
      .mockImplementationOnce((_url, options: RequestInit) => {
        const payload = JSON.parse(options.body as string) as { data: { tcgInvestments: TCGInvestment[] } };
        acceptedWrites.push(payload.data);
        return Promise.resolve(response(200, { data: payload.data, updatedAt: '2026-10-20T10:00:01.000Z' }));
      });
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const first = saveTCGInvestmentConfirmed(investmentInput, undefined, creationId);
    expect(usePrimeDexStore.getState().tcgInvestments[0].id).toBe(creationId);
    await act(async () => vi.advanceTimersByTimeAsync(5100));
    await expect(first).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
    const retry = saveTCGInvestmentConfirmed(investmentInput, undefined, creationId);
    await act(async () => vi.advanceTimersByTimeAsync(100));
    await expect(retry).resolves.toEqual({ ok: true, id: creationId });
    expect(acceptedWrites).toHaveLength(1);
    expect(acceptedWrites[0].tcgInvestments.map((lot) => lot.id)).toEqual([creationId]);
    expect(usePrimeDexStore.getState().tcgInvestments.map((lot) => lot.id)).toEqual([creationId]);
  });

  it('reports a superseded draft as a conflict instead of acknowledging a different edit', async () => {
    mocks.fetchAppApi.mockResolvedValueOnce(response(200, { data: {}, updatedAt: null }))
      .mockImplementationOnce((_url, options: RequestInit) => {
        const payload = JSON.parse(options.body as string) as { data: object };
        return Promise.resolve(response(200, { data: payload.data, updatedAt: '2026-10-20T10:00:00.000Z' }));
      });
    await renderSync();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const save = saveTCGInvestmentConfirmed(investmentInput);
    const lot = usePrimeDexStore.getState().tcgInvestments[0];
    usePrimeDexStore.getState().saveTCGInvestment({ ...investmentInput, quantity: 2 }, lot.id);
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    await expect(save).resolves.toEqual({ ok: false, reason: 'conflict' });
    expect(usePrimeDexStore.getState().tcgInvestments).toHaveLength(1);
    expect(usePrimeDexStore.getState().tcgInvestments[0].quantity).toBe(2);
  });
});
