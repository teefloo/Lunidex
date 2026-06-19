'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { usePrimeDexStore } from '@/store/primedex';
import { I18nextProvider } from 'react-i18next';
import i18n, { loadLanguage, persistLanguageCookie } from '@/lib/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resolveLanguage } from '@/lib/languages';
import { AuthProvider } from '@/lib/supabase/AuthProvider';
import { useSupabaseSync } from '@/lib/supabase/useSupabaseSync';

function SupabaseSyncBridge() {
  useSupabaseSync();
  return null;
}


function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePrimeDexStore(s => s.theme);
  const setSystemLanguage = usePrimeDexStore(s => s.setSystemLanguage);
  const language = usePrimeDexStore(s => s.language);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const _hasHydrated = usePrimeDexStore(s => s._hasHydrated);
  const resolvedLanguage = resolveLanguage(language, systemLanguage);
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
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <SupabaseSyncBridge />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
