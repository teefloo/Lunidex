'use client';

import { useCallback, type ChangeEvent } from 'react';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';

const OPTIONS = [
  ['en', '🇺🇸'],
  ['fr', '🇫🇷'],
  ['es', '🇪🇸'],
  ['de', '🇩🇪'],
  ['it', '🇮🇹'],
  ['ja', '🇯🇵'],
  ['ko', '🇰🇷'],
  ['zh', '🇨🇳'],
] as const;

interface HomeLanguageSelectProps {
  className?: string;
}

export function HomeLanguageSelect({ className }: HomeLanguageSelectProps) {
  const mounted = useMounted();
  const { t } = useTranslation();
  const language = usePrimeDexStore((state) => state.language);
  const changeLanguage = useChangeLanguage();
  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(event.target.value);
  }, [changeLanguage]);

  return (
    <label className={`field-language-control ${className ?? ''}`}>
      <span className="sr-only">{t('settings.language')}</span>
      <select
        aria-label={t('settings.language')}
        value={mounted ? language : 'en'}
        onChange={handleChange}
        className="field-language-select"
      >
        <option value="auto">{t('settings.auto')}</option>
        {OPTIONS.map(([code, flag]) => (
          <option key={code} value={code}>
            {flag} {t(`languages.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
