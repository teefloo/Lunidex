'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useLayoutEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { usePrimeDexStore } from '@/store/primedex';
import { I18nextProvider } from 'react-i18next';
import type { ResourceLanguage } from 'i18next';
import type { i18n as I18nInstance } from 'i18next';
import { createClientI18n, loadLanguage, persistLanguageCookie } from '@/lib/i18n';
import type { SupportedLanguage } from '@/lib/languages';
import { AuthProvider } from '@/lib/neon/AuthProvider';
import { useNeonSync } from '@/lib/neon/useNeonSync';
import dynamic from 'next/dynamic';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { VercelInsights } from '@/components/analytics/VercelInsights';
import { SyncAuthPrompt } from '@/components/auth/SyncAuthPrompt';
import { ClientLanguageProvider } from '@/lib/client-language';

const SettingsModal = dynamic(() => import('@/components/layout/SettingsModal'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/command/CommandPalette').then(m => ({ default: m.CommandPalette })), { ssr: false });

function NeonSyncBridge() {
  useNeonSync();
  return null;
}

type MotionConfigProps = {
  children: ReactNode;
  reducedMotion?: 'always' | 'never' | 'user';
};

function routeNeedsMotionConfig(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/, '') || '/';
  return /^\/(?:abilities|compare|favorites|items|moves|pokemon|quiz|team|types)(?:\/|$)/.test(pathWithoutLocale)
    || pathWithoutLocale.startsWith('/u/')
    || pathWithoutLocale.startsWith('/tcg/wishlist');
}

function MotionConfigBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldLoad = routeNeedsMotionConfig(pathname);
  const [MotionConfig, setMotionConfig] = useState<ComponentType<MotionConfigProps> | null>(null);

  useEffect(() => {
    if (!shouldLoad || MotionConfig) return;

    let active = true;
    void import('framer-motion').then((module) => {
      if (!active) return;
      setMotionConfig(() => module.MotionConfig as ComponentType<MotionConfigProps>);
    });

    return () => {
      active = false;
    };
  }, [MotionConfig, shouldLoad]);

  if (!shouldLoad || !MotionConfig) return <>{children}</>;
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

function DeferredOverlays() {
  const isSettingsOpen = usePrimeDexStore((state) => state.isSettingsOpen);
  const [commandPaletteRequested, setCommandPaletteRequested] = useState(false);

  useEffect(() => {
    const requestCommandPalette = () => setCommandPaletteRequested(true);
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        requestCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('primedex:open-command-palette', requestCommandPalette);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('primedex:open-command-palette', requestCommandPalette);
    };
  }, []);

  return (
    <>
      {commandPaletteRequested && <CommandPalette initialOpen />}
      {isSettingsOpen && <SettingsModal />}
    </>
  );
}


interface ThemeProviderProps {
  children: ReactNode;
  translationInstance: I18nInstance;
}

function ThemeProvider({ children, translationInstance }: ThemeProviderProps) {
  const theme = usePrimeDexStore(s => s.theme);
  const setSystemLanguage = usePrimeDexStore(s => s.setSystemLanguage);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const _hasHydrated = usePrimeDexStore(s => s._hasHydrated);
  const routeLanguage = useClientLanguage();
  const langDetectedRef = useRef(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    // Detect system language (once only)
    if (!langDetectedRef.current && navigator.language) {
      langDetectedRef.current = true;
      const baseLang = navigator.language.split('-')[0];
      if (baseLang !== systemLanguage) {
        setSystemLanguage(baseLang);
      }
    }

    const root = document.documentElement;

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);

      const listener = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, setSystemLanguage, _hasHydrated, systemLanguage]);

  useLayoutEffect(() => {
    if (translationInstance.hasResourceBundle(routeLanguage, 'translation')) {
      if (translationInstance.resolvedLanguage !== routeLanguage) {
        void translationInstance.changeLanguage(routeLanguage);
      }
      return;
    }

    let active = true;

    void loadLanguage(translationInstance, routeLanguage).then(() => {
      if (!active || translationInstance.resolvedLanguage === routeLanguage) return;
      void translationInstance.changeLanguage(routeLanguage);
    });

    return () => {
      active = false;
    };
  }, [routeLanguage, translationInstance]);

  useEffect(() => {
    if (!_hasHydrated) return;

    document.documentElement.lang = routeLanguage;
    persistLanguageCookie(routeLanguage);

    const selectedLanguage = usePrimeDexStore.getState().language;
    if (selectedLanguage !== 'auto' && selectedLanguage !== routeLanguage) {
      usePrimeDexStore.getState().setLanguage(routeLanguage);
    }
  }, [routeLanguage, _hasHydrated]);

  return <>{children}</>;
}

interface ProvidersProps {
  children: ReactNode;
  initialLanguage: SupportedLanguage;
  initialTranslations: ResourceLanguage;
}

export default function Providers({ children, initialLanguage, initialTranslations }: ProvidersProps) {
  const [translationInstance] = useState(() => createClientI18n(initialLanguage, initialTranslations));
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ClientLanguageProvider initialLanguage={initialLanguage}>
        <I18nextProvider i18n={translationInstance}>
          <MotionConfigBoundary>
            <AuthProvider>
              <SyncAuthPrompt />
              <ThemeProvider translationInstance={translationInstance}>
                <NeonSyncBridge />
                {children}
                <VercelInsights />
                <DeferredOverlays />
              </ThemeProvider>
            </AuthProvider>
          </MotionConfigBoundary>
        </I18nextProvider>
      </ClientLanguageProvider>
    </QueryClientProvider>
  );
}
