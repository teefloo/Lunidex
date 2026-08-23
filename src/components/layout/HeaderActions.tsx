'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Sun, Moon, Heart, Search, Settings, ChevronDown } from 'lucide-react';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import AccountMenu from '@/components/auth/AccountMenu';

export function HeaderActions() {
  const theme = usePrimeDexStore(s => s.theme);
  const setTheme = usePrimeDexStore(s => s.setTheme);
  const toggleSettings = usePrimeDexStore(s => s.toggleSettings);
  const language = usePrimeDexStore(s => s.language);
  const mounted = useMounted();
  const { t } = useTranslation();
  const changeLanguage = useChangeLanguage();
  const resolvedLang = useClientLanguage();
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;

  const isMac = mounted && typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');

  const label = (key: string, fallback: string) => mounted ? (t(key) || fallback) : fallback;

  const isDark = mounted && (
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  const cycleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const handleLanguageChange = useCallback((nextLanguage: string | null) => {
    if (!nextLanguage || nextLanguage === language) return;
    changeLanguage(nextLanguage);
  }, [changeLanguage, language]);

  const languageLabel = mounted ? (language === 'auto' ? t('settings.auto') : language.toUpperCase()) : 'EN';
  const themeLabel = mounted
    ? (theme === 'system' ? t('settings.system') : theme === 'dark' ? t('settings.dark') : t('settings.light'))
    : 'System';
  const searchPlaceholder = label('search.placeholder', 'Search Pokémon (name or id)...');
  const favoritesLabel = label('nav.favorites', 'Favorites');
  const settingsLabel = label('header.open_settings', 'Open Settings');

  const languageOptions = useMemo(() => [
    { code: 'auto', label: t('languages.auto'), flag: '🌐' },
    { code: 'en',  label: t('languages.en'),  flag: '🇺🇸' },
    { code: 'fr',  label: t('languages.fr'),  flag: '🇫🇷' },
    { code: 'de',  label: t('languages.de'),  flag: '🇩🇪' },
    { code: 'es',  label: t('languages.es'),  flag: '🇪🇸' },
    { code: 'it',  label: t('languages.it'),  flag: '🇮🇹' },
    { code: 'ja',  label: t('languages.ja'),  flag: '🇯🇵' },
    { code: 'ko',  label: t('languages.ko'),  flag: '🇰🇷' },
    { code: 'zh',  label: t('languages.zh'),  flag: '🇨🇳' },
  ] as const, [t]);

  return (
    <>
      <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('primedex:open-command-palette'))}
            aria-label={t('command_palette.title', { defaultValue: 'Command Palette' })}
            title={searchPlaceholder}
            className="glass-control mr-0.5 hidden h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 text-muted-foreground transition-all hover:text-primary active:scale-95 md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="hidden rounded-sm border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[11px] font-bold 2xl:inline-flex">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
      </button>

      <Link prefetch={false} href={localizedHref('/favorites')} aria-label={t('nav.favorites')} title={favoritesLabel} className="hidden sm:block">
            <div className="glass-control touch-target flex h-11 w-11 items-center justify-center text-muted-foreground transition-[color,transform] hover:text-[var(--action-favorite)] active:scale-95">
              <Heart className="h-3.5 w-3.5" />
            </div>
      </Link>

      <div className="relative flex h-11 w-14 items-center sm:w-24">
        <select
          value={language}
          onChange={(event) => handleLanguageChange(event.target.value)}
          aria-label={languageLabel}
          className="glass-control touch-target h-11 w-full cursor-pointer appearance-none rounded-sm border border-input/70 bg-transparent px-2 text-transparent outline-none transition-colors hover:border-indigo-500/20 hover:bg-indigo-500/10 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:px-3"
        >
          {languageOptions.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-card text-foreground">
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted-foreground sm:left-3">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
            <circle cx="9" cy="9" r="7.2" />
            <path d="M2 9h14" />
            <path d="M9 1.8C7 4.2 6 6.5 6 9s1 4.8 3 7.2" />
            <path d="M9 1.8c2 2.4 3 4.7 3 7.2s-1 4.8-3 7.2" />
            <path d="M2.8 5.5h12.4M2.8 12.5h12.4" />
          </svg>
        </div>
        <span className="pointer-events-none absolute right-5 hidden text-[11px] font-semibold uppercase leading-none text-muted-foreground sm:block">
          {language === 'auto' ? 'AUTO' : language.toUpperCase()}
        </span>
        <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-muted-foreground sm:right-2" aria-hidden="true" />
      </div>

      <button
            type="button"
            onClick={cycleTheme}
            title={themeLabel}
            className="glass-control touch-target flex h-11 w-11 items-center justify-center text-muted-foreground hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500 active:scale-95"
            aria-label={isDark ? t('settings.switch_to_light', { defaultValue: `Switch to light theme — current theme: ${themeLabel}` }) : t('settings.switch_to_dark', { defaultValue: `Switch to dark theme — current theme: ${themeLabel}` })}
            suppressHydrationWarning
          >
            {!mounted ? (
              <div className="h-4 w-4 md:h-[18px] md:w-[18px]" />
            ) : isDark ? (
              <Moon className="h-4 w-4 text-blue-400 md:h-[18px] md:w-[18px]" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500 md:h-[18px] md:w-[18px]" />
            )}
      </button>

      <button
            type="button"
            onClick={toggleSettings}
            aria-label={settingsLabel}
            title={settingsLabel}
            className="glass-control touch-target flex h-11 w-11 items-center justify-center text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <Settings className="h-4 w-4 md:h-[18px] md:w-[18px]" aria-hidden="true" />
      </button>

      <AccountMenu />
    </>
  );
}
