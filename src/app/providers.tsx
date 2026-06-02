'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { usePrimeDexStore } from '@/store/primedex';
import { I18nextProvider } from 'react-i18next';
import i18n, { loadLanguage, persistLanguageCookie } from '@/lib/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resolveLanguage } from '@/lib/languages';


function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setSystemLanguage, language, systemLanguage, _hasHydrated } = usePrimeDexStore();
  const resolvedLanguage = resolveLanguage(language, systemLanguage);

  useEffect(() => {
    if (!_hasHydrated) return;

    // Detect system language
    if (navigator.language) {
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

  useEffect(() => {
    if (!_hasHydrated) return;
    document.documentElement.lang = resolvedLanguage;

    // Load language bundle on demand, then switch
    loadLanguage(resolvedLanguage).then(() => {
      i18n.changeLanguage(resolvedLanguage);
    });
    // Mirror to localStorage for synchronous initial boot on next reload
    try {
      localStorage.setItem('primedex-lang', resolvedLanguage);
    } catch {
      // localStorage may be unavailable in private browsing
    }
    // Mirror to a cookie so server components can read the active language
    persistLanguageCookie(resolvedLanguage);
  }, [resolvedLanguage, _hasHydrated]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
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
      <ThemeProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
