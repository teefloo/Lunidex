'use client';

import { Moon, Sun } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';

export default function HomeThemeToggle() {
  const mounted = useMounted();
  const theme = usePrimeDexStore((state) => state.theme);
  const setTheme = usePrimeDexStore((state) => state.setTheme);
  const { t } = useTranslation();

  const isDark = mounted && (
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const themeLabel = mounted
    ? theme === 'system' ? t('settings.system') : theme === 'dark' ? t('settings.dark') : t('settings.light')
    : 'System';
  const label = isDark
    ? t('settings.switch_to_light', { defaultValue: `Switch to light theme: current theme: ${themeLabel}` })
    : t('settings.switch_to_dark', { defaultValue: `Switch to dark theme: current theme: ${themeLabel}` });

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={themeLabel}
      className="field-theme-toggle"
      suppressHydrationWarning
    >
      {!mounted ? (
        <Sun className="field-theme-toggle-icon" aria-hidden="true" />
      ) : isDark ? (
        <Moon className="field-theme-toggle-icon" aria-hidden="true" />
      ) : (
        <Sun className="field-theme-toggle-icon" aria-hidden="true" />
      )}
    </button>
  );
}
