// @vitest-environment jsdom
import { act, createElement, useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createInstance } from 'i18next';
import { MotionConfigContext } from 'framer-motion';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ pathname: '/fr/team' }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (select: (value: object) => unknown) => select({ _hasHydrated: false, theme: 'system', isSettingsOpen: false }),
}));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en' }));
vi.mock('@/lib/client-language', () => ({ ClientLanguageProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/lib/neon/AuthProvider', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/IdleClientServices', () => ({ IdleClientServices: () => null }));
vi.mock('@/components/auth/SyncAuthPrompt', () => ({ SyncAuthPrompt: () => null }));
vi.mock('@/lib/i18n', () => ({
  createClientI18n: () => {
    const instance = createInstance();
    void instance.init({ lng: 'en', initImmediate: false, resources: { en: { translation: {} } } });
    return instance;
  },
  isLanguageBundlePartial: () => false,
  loadLanguage: vi.fn(),
  persistLanguageCookie: vi.fn(),
}));

import Providers from './providers';

describe('shared provider lifetime', () => {
  afterEach(() => vi.clearAllMocks());

  it('preserves mounted children when entering and leaving a motion route', async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function Probe() {
      const config = useContext(MotionConfigContext);
      useEffect(() => { mounted(); return () => { unmounted(); }; }, []);
      return createElement('output', { 'data-reduced-motion': config.reducedMotion });
    }
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const tree = () => createElement(Providers,
      { initialLanguage: 'en', initialTranslations: {} } as Parameters<typeof Providers>[0],
      createElement(Probe),
    );
    try {
      state.pathname = '/fr/team';
      await act(async () => { root.render(tree()); await new Promise(resolve => setTimeout(resolve, 30)); });
      expect(mounted).toHaveBeenCalledTimes(1);
      expect(container.querySelector('output')?.dataset.reducedMotion).toBe('user');
      state.pathname = '/fr/pokedex';
      await act(async () => { root.render(tree()); });
      expect(mounted).toHaveBeenCalledTimes(1);
      expect(unmounted).not.toHaveBeenCalled();
      expect(container.querySelector('output')?.dataset.reducedMotion).toBe('user');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});
