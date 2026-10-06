'use client';

import { useCallback, type ChangeEvent } from 'react';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import { useLanguageSelection } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';

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

interface LanguageSelectProps {
  className?: string;
  onLanguageChange?: () => void;
}

export function LanguageSelect({ className, onLanguageChange }: LanguageSelectProps) {
  const { t } = useTranslation();
  const language = useLanguageSelection();
  const changeLanguage = useChangeLanguage();
  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(event.target.value);
    onLanguageChange?.();
  }, [changeLanguage, onLanguageChange]);

  return (
    <label className={`field-language-control ${className ?? ''}`}>
      <span className="sr-only">{t('settings.language')}</span>
      <select
        aria-label={t('settings.language')}
        value={language}
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
