'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import {
  getTCGCardLanguageName,
  isTCGCardLanguage,
  TCG_CARD_LANGUAGES,
  type TCGCardLanguage,
} from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';

interface TCGLanguageSelectorProps {
  className?: string;
  /** When supplied, the selector controls a collection route instead of the catalogue. */
  value?: TCGCardLanguage;
  onChange?: (language: TCGCardLanguage) => void;
  preserveQuery?: boolean;
  /** Accessible context for selectors rendered more than once on a page. */
  ariaLabel?: string;
}

export function TCGLanguageSelector({
  className = '',
  value,
  onChange,
  preserveQuery = true,
  ariaLabel,
}: TCGLanguageSelectorProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appLanguage = useClientLanguage();
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const setBrowseLanguage = usePrimeDexStore((state) => state.setTCGBrowseLanguage);
  const queryLanguage = searchParams.get('tcgLang');
  const requestedLanguage = queryLanguage && isTCGCardLanguage(queryLanguage) ? queryLanguage : undefined;
  // Show a URL-selected language on the first hydrated render, before the
  // effect below mirrors it into the persisted browse preference. This avoids
  // an English flash that could be mistaken for a user choice.
  const selectedLanguage = value ?? requestedLanguage ?? browseLanguage;
  const accessibleLabel = ariaLabel ?? t('tcg.card_language', { defaultValue: 'Card language' });

  useEffect(() => {
    if (!mounted || !hasHydrated || value) return;
    if (requestedLanguage && requestedLanguage !== browseLanguage) {
      setBrowseLanguage(requestedLanguage);
    }
  }, [browseLanguage, hasHydrated, mounted, requestedLanguage, setBrowseLanguage, value]);

  // The web preference lives in async IndexedDB storage.  Do not expose an
  // English-looking control while that preference is still loading: a click
  // during this window would overwrite a persisted French/Japanese choice.
  if (!mounted || (!value && !hasHydrated)) return null;

  const handleChange = (next: string) => {
    if (!isTCGCardLanguage(next)) return;
    if (onChange) {
      onChange(next);
      return;
    }
    setBrowseLanguage(next);
    if (!preserveQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tcgLang', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <label className={`inline-flex min-h-11 items-center gap-2 rounded-sm border border-border/45 bg-card/55 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/65 ${className}`}>
      <span className="sr-only">{accessibleLabel}</span>
      <span aria-hidden="true" className="whitespace-nowrap text-foreground/45">
        {t('tcg.card_language_short', { defaultValue: 'Cards' })}
      </span>
      <select
        value={selectedLanguage}
        onChange={(event) => handleChange(event.target.value)}
        className="min-h-9 max-w-[12rem] cursor-pointer bg-transparent text-xs font-bold normal-case tracking-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label={accessibleLabel}
      >
        {TCG_CARD_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {getTCGCardLanguageName(language, appLanguage)}
          </option>
        ))}
      </select>
    </label>
  );
}
