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
  const { loading, user, sessionStatus, retrySession, signInWithOAuth, signOut } = useAuth();
  return createElement('div', null,
    createElement('output', {
      'data-loading': String(loading),
      'data-session-status': sessionStatus,
      'data-user': user?.id ?? '',
    }),
    createElement('button', { onClick: retrySession }, 'Retry session'),
    createElement('button', { 'data-testid': 'sign-out', onClick: () => { void signOut(); } }, 'Sign out'),
    createElement('button', { 'data-testid': 'oauth', onClick: () => { void signInWithOAuth('google'); } }, 'Continue with Google'),
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

const signedInResponse = (expiresAt = '2027-01-01T00:00:00.000Z') => response(200, {
  session: { expiresAt },
  user: { id: 'test-user', email: 'trainer@example.test', name: 'Trainer' },
});

describe('AuthProvider session refresh', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.authClient = {};
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  async function renderProvider() {
    await act(async () => {
      root.render(createElement(AuthProvider, null, createElement(AuthProbe)));
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  async function waitForForegroundDebounce() {
    await new Promise((resolve) => setTimeout(resolve, 260));
  }

  function captureWindowTimers() {
    const timers: Array<{ id: number; delay: number; callback: () => void }> = [];
    let nextId = 1;
    vi.spyOn(window, 'setTimeout').mockImplementation(((handler: TimerHandler, timeout = 0) => {
      const id = nextId++;
      if (typeof handler === 'function') {
        timers.push({ id, delay: Number(timeout), callback: handler as () => void });
      }
      return id as unknown as ReturnType<typeof window.setTimeout>;
    }) as unknown as typeof window.setTimeout);
    vi.spyOn(window, 'clearTimeout').mockImplementation(() => {});
    return timers;
  }

  it('checks an anonymous session once without a background polling interval', async () => {
    const intervalSpy = vi.spyOn(window, 'setInterval');
    const fetchMock = vi.fn().mockResolvedValue(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
  });

  it('waits for a hidden tab to become visible before checking the session', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    const fetchMock = vi.fn().mockResolvedValue(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(fetchMock).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes after a quick hide and return even when the previous request just completed', async () => {
    let resolveInitialRequest: ((value: Response) => void) | undefined;
    const initialRequest = new Promise<Response>((resolve) => { resolveInitialRequest = resolve; });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(initialRequest)
      .mockResolvedValueOnce(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => {
      resolveInitialRequest?.(response(200, null));
      await initialRequest;
      await Promise.resolve();
      await Promise.resolve();
    });

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes once for a paired focus and visibility change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    await waitForForegroundDebounce();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('schedules one session check before expiry and reschedules when the session is extended', async () => {
    const timers = captureWindowTimers();
    const firstExpiry = new Date(Date.now() + 60 * 60_000).toISOString();
    const secondExpiry = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse(firstExpiry))
      .mockResolvedValueOnce(signedInResponse(secondExpiry));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();

    const expiryTimer = timers.find((timer) => Math.abs(timer.delay - 59 * 60_000) < 250);
    expect(expiryTimer).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(firstExpiry) - 60_000);

    await act(async () => {
      expiryTimer?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(timers.some((timer) => Math.abs(timer.delay - 60 * 60_000) < 250)).toBe(true);
  });

  it('clears the local user when the expiry check returns no session', async () => {
    const timers = captureWindowTimers();
    const expiryTime = Date.now() + 60 * 60_000;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse(new Date(expiryTime).toISOString()))
      .mockResolvedValueOnce(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    const expiryTimer = timers.find((timer) => Math.abs(timer.delay - 59 * 60_000) < 250);
    expect(expiryTimer).toBeDefined();
    vi.spyOn(Date, 'now').mockReturnValue(expiryTime);

    await act(async () => {
      expiryTimer?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('output')?.dataset.user).toBe('');
  });

  it('bounds automatic retries and requires explicit retry after the budget is exhausted', async () => {
    const timers = captureWindowTimers();
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timers.map((timer) => timer.delay)).toEqual([1_000]);

    for (const delay of [1_000, 2_000, 4_000]) {
      const timer = timers.find((candidate) => candidate.delay === delay);
      expect(timer).toBeDefined();
      await act(async () => {
        now += delay;
        timer?.callback();
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(timers).toHaveLength(3);

    now += 251;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
  });

  it('shares a three-retry budget across quota and transient failures without event polling', async () => {
    const timers = captureWindowTimers();
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(response(502, { error: 'Temporary auth service outage' }))
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timers.map((timer) => timer.delay)).toEqual([15 * 60_000]);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      now += timers[0]?.delay ?? 0;
      timers[0]?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const transientRetry = timers.find((timer) => timer.delay === 1_000);
    expect(transientRetry).toBeDefined();

    await act(async () => {
      now += transientRetry?.delay ?? 0;
      transientRetry?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const secondQuotaRetry = timers.find((timer) => timer.delay === 30 * 60_000);
    expect(secondQuotaRetry).toBeDefined();

    await act(async () => {
      now += secondQuotaRetry?.delay ?? 0;
      secondQuotaRetry?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(timers).toHaveLength(3);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
  });

  it('preserves a quota cooldown when the tab is hidden and restored', async () => {
    const timers = captureWindowTimers();
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(timers[0]?.delay).toBe(15 * 60_000);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    now += 60_000;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timers.some((timer) => timer.delay === 14 * 60_000)).toBe(true);

    const resumedCooldown = timers.find((timer) => timer.delay === 14 * 60_000);
    await act(async () => {
      now += resumedCooldown?.delay ?? 0;
      resumedCooldown?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not let a session expiry event bypass an active quota cooldown', async () => {
    const timers = captureWindowTimers();
    const expiresAt = Date.now() + 60 * 60_000;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse(new Date(expiresAt).toISOString()))
      .mockResolvedValueOnce(response(402, { code: 'GENERIC_QUOTA_EXCEEDED' }))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    const preExpiryRefresh = timers.find((timer) => Math.abs(timer.delay - 59 * 60_000) < 250);
    expect(preExpiryRefresh).toBeDefined();

    vi.spyOn(Date, 'now').mockReturnValue(expiresAt - 60_000);
    await act(async () => {
      preExpiryRefresh?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(timers.some((timer) => timer.delay === 15 * 60_000)).toBe(true);

    const expiryTimer = timers.find((timer) => timer.delay === 60_000);
    expect(expiryTimer).toBeDefined();
    vi.spyOn(Date, 'now').mockReturnValue(expiresAt);
    await act(async () => {
      expiryTimer?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes immediately after sign-out so the local session is cleared', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mocks.authClient = { signOut };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(signedInResponse())
      .mockResolvedValueOnce(response(200, null));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(container.querySelector('output')?.dataset.user).toBe('test-user');

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="sign-out"]')?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('output')?.dataset.user).toBe('');
  });

  it('preserves OAuth provider parameters and refreshes on the auth-changed event', async () => {
    const socialSignIn = vi.fn().mockResolvedValue({ error: null });
    mocks.authClient = { signIn: { social: socialSignIn } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, null))
      .mockResolvedValueOnce(signedInResponse());
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="oauth"]')?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(socialSignIn).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google',
      callbackURL: expect.any(String),
    }));
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
    await waitForForegroundDebounce();

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
    await waitForForegroundDebounce();

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
    await waitForForegroundDebounce();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.loading).toBe('false');
  });
});
