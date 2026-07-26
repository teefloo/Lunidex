'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';

const FALLBACK_LANG: SupportedLanguage = 'en';

export function useClientLanguage(): SupportedLanguage {
  const pathname = usePathname();
  const documentLanguage = useSyncExternalStore(
    () => () => {},
    () => {
      const htmlLanguage = document.documentElement.lang;
      return isSupportedLanguage(htmlLanguage)
        ? (htmlLanguage as SupportedLanguage)
        : FALLBACK_LANG;
    },
    () => FALLBACK_LANG,
  );

  return useMemo<SupportedLanguage>(() => {
    const pathSeg = pathname.split('/').filter(Boolean)[0];
    return isSupportedLanguage(pathSeg ?? '')
      ? (pathSeg as SupportedLanguage)
      : documentLanguage;
  }, [documentLanguage, pathname]);
}

export function useLocaleHref(): (path: string) => string {
  const lang = useClientLanguage();
  return (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized === '/') return `/${lang}`;
    return `/${lang}${normalized}`;
  };
}
