'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { useMounted } from '@/hooks/useMounted';

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
  const mounted = useMounted();
  const pathname = usePathname();
  const documentLanguage = useSyncExternalStore(
    subscribeToDocumentLanguage,
    getDocumentLanguage,
    () => FALLBACK_LANG,
  );

  if (!mounted) return FALLBACK_LANG;

  const publicPathname = typeof window === 'undefined' ? pathname : window.location.pathname;
  const pathLanguage = publicPathname.split('/').filter(Boolean)[0];

  return isSupportedLanguage(pathLanguage ?? '')
    ? (pathLanguage as SupportedLanguage)
    : documentLanguage;
}

export function useLocaleHref(): (path: string) => string {
  const lang = useClientLanguage();
  return (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized === '/') return `/${lang}`;
    return `/${lang}${normalized}`;
  };
}
