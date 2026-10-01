// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enabled: true,
  loading: true,
  user: null as null | { id: string },
  status: 'checking' as 'checking' | 'loading' | 'ready' | 'unauthenticated' | 'unavailable',
  onRequired: null as null | ((request: { prompt?: boolean }) => void),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/neon/AuthProvider', () => ({
  useAuth: () => ({ enabled: mocks.enabled, loading: mocks.loading, user: mocks.user }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? 'translated' }),
}));
vi.mock('@/lib/toast', () => ({ toast: { info: mocks.toastInfo, error: mocks.toastError } }));
vi.mock('@/store/sync-access', () => ({
  getSyncAccessStatus: () => mocks.status,
  onSyncAccessRequired: (handler: (request: { prompt?: boolean }) => void) => {
    mocks.onRequired = handler;
    return () => {
      if (mocks.onRequired === handler) mocks.onRequired = null;
    };
  },
  retrySyncAccess: vi.fn(),
}));
vi.mock('next/dynamic', async () => {
  const { createElement } = await import('react');
  return {
    default: () => ({ open }: { open?: boolean }) => (
      open ? createElement('div', { role: 'dialog' }) : null
    ),
  };
});
vi.mock('./AuthModalBoundary', async () => {
  const { createElement, Fragment } = await import('react');
  return { AuthModalBoundary: ({ children }: { children?: React.ReactNode }) => createElement(Fragment, null, children) };
});

import { SyncAuthPrompt } from './SyncAuthPrompt';

describe('SyncAuthPrompt', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.enabled = true;
    mocks.loading = true;
    mocks.user = null;
    mocks.status = 'checking';
    mocks.onRequired = null;
    mocks.toastInfo.mockClear();
    mocks.toastError.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('does not show sign-in while an existing session is still being restored', async () => {
    await act(async () => root.render(createElement(SyncAuthPrompt)));
    expect(mocks.onRequired).not.toBeNull();

    await act(async () => mocks.onRequired?.({}));

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.toastInfo).toHaveBeenCalledOnce();
  });
});
