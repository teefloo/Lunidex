// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ authClient: {} as object }));

vi.mock('./client', () => ({
  getNeonAuthClient: () => mocks.authClient,
  isNeonAuthConfigured: true,
  loadNeonAuthClient: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthProvider';

function AuthProbe() {
  const { loading, user, sessionStatus, retrySession } = useAuth();
  return createElement('div', null,
    createElement('output', {
      'data-loading': String(loading),
      'data-session-status': sessionStatus,
      'data-user': user?.id ?? '',
    }),
    createElement('button', { onClick: retrySession }, 'Retry session'),
  );
}

function response(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unavailable',
    json: async () => payload,
  } as Response;
}

const signedInResponse = () => response(200, {
  session: { expiresAt: '2027-01-01T00:00:00.000Z' },
  user: { id: 'test-user', email: 'trainer@example.test', name: 'Trainer' },
});

describe('AuthProvider session refresh', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fakeTimers = false;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (fakeTimers) vi.useRealTimers();
    fakeTimers = false;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function renderProvider() {
    await act(async () => {
      root.render(createElement(AuthProvider, null, createElement(AuthProbe)));
      if (fakeTimers) await vi.advanceTimersByTimeAsync(0);
      else await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it('backs off Neon quota failures and suppresses automatic refreshes until recovery is due', async () => {
    fakeTimers = true;
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('unavailable');

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(15 * 60_000 - 1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');
  });

  it('allows an explicit retry to bypass a quota cooldown', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      container.querySelector('button')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
  });

  it('keeps a short retry for transient non-quota failures', async () => {
    fakeTimers = true;
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(502, { error: 'Temporary auth service outage' }))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');
  });

  it('keeps an authenticated user when a refresh temporarily fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse())
      .mockResolvedValueOnce(response(502, { error: 'Temporary auth service outage' }));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('output')?.dataset.user).toBe('test-user');
    expect(container.querySelector('output')?.dataset.loading).toBe('false');
  });

  it('shows an unavailable session after a failed lookup and retries from an explicit action', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.loading).toBe('false');
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('unavailable');

    await act(async () => {
      container.querySelector('button')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
  });

  it('clears a session after a successful response confirms there is no user', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse())
      .mockResolvedValueOnce(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.loading).toBe('false');
  });

  it('clears a session when the auth service explicitly rejects it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse())
      .mockResolvedValueOnce(response(401, { error: 'Unauthorized' }));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.loading).toBe('false');
  });
});
