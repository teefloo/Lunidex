'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useInitialClientLanguage } from '@/lib/client-language';
import {
  isSupportedLanguage,
  resolveLanguage,
  type AppLanguage,
  type SupportedLanguage,
} from '@/lib/languages';
import { usePrimeDexStore } from '@/store/primedex';

const FALLBACK_LANG: SupportedLanguage = 'en';

function subscribeToDocumentLanguage(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  return () => observer.disconnect();
}

function getDocumentLanguage(): SupportedLanguage {
  const htmlLanguage = document.documentElement.lang;
  return isSupportedLanguage(htmlLanguage)
    ? (htmlLanguage as SupportedLanguage)
    : FALLBACK_LANG;
}

export function useClientLanguage(): SupportedLanguage {
  const initialLanguage = useInitialClientLanguage();
  const pathname = usePathname();
  const documentLanguage = useSyncExternalStore(
    subscribeToDocumentLanguage,
    getDocumentLanguage,
    () => initialLanguage,
  );

  const publicPathname = typeof window === 'undefined' ? pathname : window.location.pathname;
  const pathLanguage = publicPathname.split('/').filter(Boolean)[0];

  return isSupportedLanguage(pathLanguage ?? '')
    ? (pathLanguage as SupportedLanguage)
    : documentLanguage;
}

export function useLanguageSelection(): AppLanguage {
  const activeLanguage = useClientLanguage();
  const selectedLanguage = usePrimeDexStore((state) => state.language);
  const systemLanguage = usePrimeDexStore((state) => state.systemLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);

  if (!hasHydrated) return activeLanguage;
  if (selectedLanguage === 'auto' && resolveLanguage(selectedLanguage, systemLanguage) === activeLanguage) {
    return selectedLanguage;
  }
  return isSupportedLanguage(selectedLanguage) && selectedLanguage === activeLanguage
    ? selectedLanguage
    : activeLanguage;
}

export function useLocaleHref(): (path: string) => string {
  const lang = useClientLanguage();
  return useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized === '/') return `/${lang}`;
    return `/${lang}${normalized}`;
  }, [lang]);
}
