'use client';

import { Info, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { usePrimeDexStore } from '@/store/primedex';
import { useTranslation } from '@/lib/i18n';
import { isTcgLangLimited, isTcgLangSupported } from '@/lib/api/tcg';
import { persistLanguageCookie } from '@/lib/i18n';

interface TCGDataLangBannerProps {
  resolvedLang: string;
  variant?: 'inline' | 'full';
}

export function TCGDataLangBanner({ resolvedLang, variant = 'inline' }: TCGDataLangBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const setLanguage = usePrimeDexStore((s) => s.setLanguage);

  if (dismissed) return null;

  const isSupported = isTcgLangSupported(resolvedLang);
  const isLimited = isTcgLangLimited(resolvedLang);

  if (isSupported && !isLimited) return null;

  const languageName = t(`languages.${resolvedLang}`);

  if (!isSupported) {
    return (
      <div
        role="status"
        className={`flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ${
          variant === 'full' ? 'sm:px-5 sm:py-4' : ''
        }`}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-amber-50">
            {t('tcg.cards_not_available_in_language', { language: languageName })}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                persistLanguageCookie('en');
              }}
              className="inline-flex h-8 items-center rounded-full border border-amber-300/40 bg-amber-500/15 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 transition-colors hover:border-amber-200/60 hover:bg-amber-500/25"
            >
              {t('tcg.try_english')}
            </button>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/70">
              {t('tcg.showing_english_fallback')}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('tcg.clear')}
          className="shrink-0 rounded-full p-1 text-amber-200/60 transition-colors hover:bg-amber-500/15 hover:text-amber-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-sky-50">
          {t('tcg.cards_limited_in_language', { language: languageName })}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              persistLanguageCookie('en');
            }}
            className="inline-flex h-8 items-center rounded-full border border-sky-300/40 bg-sky-500/15 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100 transition-colors hover:border-sky-200/60 hover:bg-sky-500/25"
          >
            {t('tcg.try_english')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('tcg.clear')}
        className="shrink-0 rounded-full p-1 text-sky-200/60 transition-colors hover:bg-sky-500/15 hover:text-sky-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function TCGUnsupportedLangBanner({ resolvedLang }: { resolvedLang: string }) {
  return <TCGDataLangBanner resolvedLang={resolvedLang} />;
}
