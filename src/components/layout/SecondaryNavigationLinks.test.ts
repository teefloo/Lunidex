// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ events: [] as string[] }));

vi.mock('next/navigation', () => ({ usePathname: () => '/fr/team' }));
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, onClick, onNavigate, prefetch, ...props }: {
      href: string;
      children?: React.ReactNode;
      onClick?: React.MouseEventHandler<HTMLAnchorElement>;
      onNavigate?: () => void;
      prefetch?: boolean;
    }) => {
      void prefetch;
      return createElement('a', {
        ...props,
        href,
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          mocks.events.push(`navigation-accepted:${href}`);
          onNavigate?.();
          event.preventDefault();
        },
      }, children);
    },
  };
});
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}));
vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: { toggleSettings: () => void }) => unknown) => selector({ toggleSettings: vi.fn() }),
}));

import { SecondaryNavigationLinks } from './SecondaryNavigationLinks';

describe('SecondaryNavigationLinks', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.events.length = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('closes the menu only after a same-origin destination is accepted', async () => {
    await act(async () => root.render(createElement(SecondaryNavigationLinks, {
      onNavigate: () => mocks.events.push('close-menu'),
    })));

    const quizLink = container.querySelector<HTMLAnchorElement>('a[href="/fr/quiz"]');
    expect(quizLink).not.toBeNull();
    act(() => quizLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));

    expect(mocks.events).toEqual(['navigation-accepted:/fr/quiz', 'close-menu']);
  });
});
