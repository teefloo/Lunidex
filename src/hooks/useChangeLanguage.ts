'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { loadLanguage, persistLanguageCookie, useTranslation } from '@/lib/i18n';
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
  const { i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const setLanguage = usePrimeDexStore((s) => s.setLanguage);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);

  return useCallback(
    (code: string) => {
      if (!code) return;

      setLanguage(code);

      const resolvedLang = resolveLang(code, systemLanguage);
      persistLanguageCookie(resolvedLang);

      const stripped = stripLocalePrefix(pathname);
      const localizedPath =
        stripped === '/' ? `/${resolvedLang}` : `/${resolvedLang}${stripped}`;
      const currentUrl = typeof window === 'undefined' ? null : new URL(window.location.href);
      const suffix = `${currentUrl?.search ?? ''}${currentUrl?.hash ?? ''}`;
      const newPath = `${localizedPath}${suffix}`;

      // Load the bundle before navigation. The route locale remains active in
      // both the selector and translations until the new server render arrives.
      void loadLanguage(i18n, resolvedLang).then(() => {
        if (`${pathname}${suffix}` !== newPath) {
          router.replace(newPath, { scroll: false });
        }
        router.refresh();
      });
    },
    [i18n, setLanguage, systemLanguage, pathname, router]
  );
}
