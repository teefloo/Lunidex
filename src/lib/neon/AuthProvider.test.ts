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
  const { loading, user } = useAuth();
  return createElement('output', {
    'data-loading': String(loading),
    'data-user': user?.id ?? '',
  });
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
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function renderProvider() {
    await act(async () => {
      root.render(createElement(AuthProvider, null, createElement(AuthProbe)));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

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

  it('keeps session state pending when the first lookup is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await renderProvider();

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.loading).toBe('true');
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
