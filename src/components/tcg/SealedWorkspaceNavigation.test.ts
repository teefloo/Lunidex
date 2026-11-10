// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pathname: '/fr/tcg/sealed/products/611877' }));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
      createElement('a', { ...props, href }, children),
  };
});
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}));
vi.mock('@/components/layout/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('./TCGPageTabs', () => ({ TCGPageTabs: () => null }));

import { SealedWorkspaceNavigation } from './SealedWorkspaceNavigation';

describe('SealedWorkspaceNavigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('marks the sealed collection parent as a location on a portfolio product detail', async () => {
    await act(async () => root.render(createElement(SealedWorkspaceNavigation, {
      view: 'portfolio-product',
    })));

    expect(container.querySelector('a[href="/fr/tcg/sealed/collection"]')?.getAttribute('aria-current')).toBe('location');
  });
});
