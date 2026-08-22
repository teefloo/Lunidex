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
  const stripped = path.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/, '');
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
      const localizedPath =
        stripped === '/' ? `/${resolvedLang}` : `/${resolvedLang}${stripped}`;
      const currentUrl = typeof window === 'undefined' ? null : new URL(window.location.href);
      const suffix = `${currentUrl?.search ?? ''}${currentUrl?.hash ?? ''}`;
      const newPath = `${localizedPath}${suffix}`;

      // The locale prefix is removed by the Next rewrite before the route
      // reaches the App Router. Refresh after the client navigation so the
      // server components receive the new locale header and render their
      // translated content immediately, without a browser reload.
      if (`${pathname}${suffix}` !== newPath) {
        router.replace(newPath, { scroll: false });
      }
      router.refresh();
    },
    [setLanguage, systemLanguage, pathname, router]
  );
}
