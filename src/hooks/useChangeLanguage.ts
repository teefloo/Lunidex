'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import i18n, { loadLanguage, persistLanguageCookie } from '@/lib/i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { usePrimeDexStore } from '@/store/primedex';

const FALLBACK_LANG: SupportedLanguage = 'en';

function resolveLang(code: string, systemLanguage: string): SupportedLanguage {
  if (code === 'auto') {
    return isSupportedLanguage(systemLanguage) ? systemLanguage : FALLBACK_LANG;
  }
  return isSupportedLanguage(code) ? code : FALLBACK_LANG;
}

function stripLocalePrefix(path: string): string {
  const stripped = path.replace(/^\/[^/]+/, '');
  return stripped === '' ? '/' : stripped;
}

export function useChangeLanguage(): (code: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  const setLanguage = usePrimeDexStore((s) => s.setLanguage);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);

  return useCallback(
    (code: string) => {
      if (!code) return;

      setLanguage(code);

      const resolvedLang = resolveLang(code, systemLanguage);
      loadLanguage(resolvedLang).then(() => {
        i18n.changeLanguage(resolvedLang);
      });
      persistLanguageCookie(resolvedLang);

      const stripped = stripLocalePrefix(pathname);
      const newPath =
        stripped === '/' ? `/${resolvedLang}` : `/${resolvedLang}${stripped}`;

      if (pathname !== newPath) {
        router.push(newPath);
      } else {
        router.refresh();
      }
    },
    [setLanguage, systemLanguage, pathname, router]
  );
}
