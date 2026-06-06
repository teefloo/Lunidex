'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';

const FALLBACK_LANG: SupportedLanguage = 'en';

export function useClientLanguage(): SupportedLanguage {
  const pathname = usePathname();

  return useMemo<SupportedLanguage>(() => {
    const pathSeg = pathname.split('/').filter(Boolean)[0];
    return isSupportedLanguage(pathSeg ?? '')
      ? (pathSeg as SupportedLanguage)
      : FALLBACK_LANG;
  }, [pathname]);
}

export function useLocaleHref(): (path: string) => string {
  const lang = useClientLanguage();
  return (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized === '/') return `/${lang}`;
    return `/${lang}${normalized}`;
  };
}
