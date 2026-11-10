// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ search: 'tcgLang=ja' }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/tcg/sealed/market',
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
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
vi.mock('@/components/tcg/TCGLanguageSelector', () => ({ TCGLanguageSelector: () => null }));
vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: { tcgBrowseLanguage: string; _hasHydrated: boolean }) => unknown) =>
    selector({ tcgBrowseLanguage: 'en', _hasHydrated: true }),
}));

import { TCGPageTabs } from './TCGPageTabs';

describe('TCGPageTabs', () => {
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

  it('preserves an explicit card-language query when the selector is hidden', async () => {
    await act(async () => root.render(createElement(TCGPageTabs, {
      context: 'catalog',
      showLanguageSelector: false,
    })));

    const links = [...container.querySelectorAll<HTMLAnchorElement>('a')];
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => new URL(link.href).searchParams.get('tcgLang') === 'ja')).toBe(true);
    expect(container.querySelector('select')).toBeNull();
  });
});
