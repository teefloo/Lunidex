// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authClient: null as object | null,
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('./client', () => ({
  getSupabaseAuthClient: () => mocks.authClient,
  isSupabaseAuthConfigured: true,
}));

import { AuthProvider, useAuth } from './AuthProvider';

function AuthProbe() {
  const { loading, user, sessionStatus, retrySession } = useAuth();
  return createElement('div', null,
    createElement('output', {
      'data-loading': String(loading),
      'data-session-status': sessionStatus,
      'data-user': user?.id ?? '',
      'data-name': user?.user_metadata.name ?? '',
    }),
    createElement('button', { onClick: retrySession }, 'Retry session'),
  );
}

describe('Supabase AuthProvider session handling', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ allowed: true }) });
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.authClient = {
      auth: {
        getSession: mocks.getSession,
        getUser: mocks.getUser,
        onAuthStateChange: mocks.onAuthStateChange,
        signOut: mocks.signOut,
      },
    };
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

  it('loads an anonymous session once without polling', async () => {
    await renderProvider();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
    expect(container.querySelector('output')?.dataset.user).toBe('');
  });

  it('maps Supabase user metadata while keeping the technical UUID stable', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 1_800_000_000,
          refresh_token: 'test-refresh',
          user: { id: '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660', email: 'trainer@example.test', user_metadata: { full_name: 'Trainer' } },
        },
      },
      error: null,
    });
    await renderProvider();
    expect(container.querySelector('output')?.dataset.user).toBe('7d4d38a6-bc79-4fb7-b9f6-07e7f448a660');
    expect(container.querySelector('output')?.dataset.name).toBe('Trainer');
    expect(mocks.fetch).toHaveBeenCalledWith('/api/auth/access', expect.objectContaining({
      headers: { Authorization: 'Bearer test-token' },
      cache: 'no-store',
    }));
  });

  it('does not expose a signed-in session rejected by the server allowlist', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'other-token', user: { id: 'e3dc9ee8-46bd-4e1c-9be5-6802e8c0ad37', email: 'other@example.test' } } },
      error: null,
    });
    mocks.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ allowed: false }) });

    await renderProvider();

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('fails closed without signing out when the allowlist check is temporarily unavailable', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: '7d4d38a6-bc79-4fb7-b9f6-07e7f448a660', email: 'owner@example.test' } } },
      error: null,
    });
    mocks.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    await renderProvider();

    expect(container.querySelector('output')?.dataset.user).toBe('');
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('unavailable');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('allows retry after a transient Auth failure', async () => {
    mocks.getSession
      .mockResolvedValueOnce({ data: { session: null }, error: new Error('Auth temporarily unavailable') })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    await renderProvider();
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('unavailable');
    await act(async () => {
      container.querySelector('button')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('output')?.dataset.sessionStatus).toBe('resolved');
    expect(mocks.getSession).toHaveBeenCalledTimes(2);
  });
});
