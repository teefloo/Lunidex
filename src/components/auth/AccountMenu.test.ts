// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loading: true,
  user: null as null | { id: string; email: string; user_metadata: { name?: string; display_name?: string } },
}));

vi.mock('@/lib/neon/AuthProvider', () => ({
  useAuth: () => ({ enabled: true, loading: mocks.loading, user: mocks.user }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? 'translated' }),
}));
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return { default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => createElement('a', { href, ...props }, children) };
});
vi.mock('next/dynamic', async () => {
  const { createElement } = await import('react');
  return { default: () => () => createElement('div') };
});
vi.mock('./AuthModalBoundary', async () => {
  const { createElement, Fragment } = await import('react');
  return { AuthModalBoundary: ({ children }: { children?: React.ReactNode }) => createElement(Fragment, null, children) };
});

import AccountMenu from './AccountMenu';

describe('AccountMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.loading = true;
    mocks.user = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows session restoration instead of a sign-in action while auth is checking', async () => {
    await act(async () => root.render(createElement(AccountMenu)));

    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Checking session…');
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Checking session…');
  });

  it('shows sign-in after auth confirms there is no user', async () => {
    mocks.loading = false;
    await act(async () => root.render(createElement(AccountMenu)));

    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Sign in');
    expect(button?.disabled).toBe(false);
  });
});
