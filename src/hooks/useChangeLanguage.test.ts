import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({
  pathname: '/en/blog',
  router: {
    replace: vi.fn(),
    refresh: vi.fn(),
  },
}));

const store = vi.hoisted(() => ({
  language: 'en',
  systemLanguage: 'en',
  setLanguage: vi.fn(),
}));

const i18n = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => navigation.router,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: typeof store) => unknown) => selector(store),
}));

vi.mock('@/lib/i18n', () => ({
  default: i18n,
  loadLanguage: vi.fn(() => Promise.resolve()),
  persistLanguageCookie: vi.fn(),
}));

import { useChangeLanguage } from './useChangeLanguage';

describe('useChangeLanguage', () => {
  beforeEach(() => {
    navigation.pathname = '/en/blog';
    navigation.router.replace.mockReset();
    navigation.router.refresh.mockReset();
    store.setLanguage.mockReset();
    window.history.replaceState({}, '', '/en/blog?section=guides#sources');
  });

  it('navigates to the new locale, preserves the URL state, and refreshes server content', () => {
    const { result } = renderHook(() => useChangeLanguage());

    act(() => {
      result.current('fr');
    });

    expect(store.setLanguage).toHaveBeenCalledWith('fr');
    expect(navigation.router.replace).toHaveBeenCalledWith('/fr/blog?section=guides#sources', { scroll: false });
    expect(navigation.router.refresh).toHaveBeenCalledOnce();
  });
});
