// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchAppApi: vi.fn(), i18n: { t: () => '' } }));

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
    setSyncAccessStatus('checking');
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
});
