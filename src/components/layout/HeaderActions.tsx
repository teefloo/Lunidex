'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Sun, Moon, Heart, Search, Settings, ChevronDown, Globe2 } from 'lucide-react';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import { useClientLanguage, useLanguageSelection } from '@/hooks/useLocaleHref';
import { cn } from '@/lib/utils';
import AccountMenu from '@/components/auth/AccountMenu';

type HeaderActionsPlacement = 'toolbar' | 'sheet';

interface HeaderActionsProps {
  placement?: HeaderActionsPlacement;
  onInteraction?: () => void;
  onRequestAuth?: () => void;
}

export function HeaderActions({ placement = 'toolbar', onInteraction, onRequestAuth }: HeaderActionsProps = {}) {
  const theme = usePrimeDexStore(s => s.theme);
  const setTheme = usePrimeDexStore(s => s.setTheme);
  const toggleSettings = usePrimeDexStore(s => s.toggleSettings);
  const language = useLanguageSelection();
  const mounted = useMounted();
  const { t } = useTranslation();
  const changeLanguage = useChangeLanguage();
  const resolvedLang = useClientLanguage();
  const isSheet = placement === 'sheet';

  const isMac = mounted && typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');

  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };

  const isDark = mounted && (
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  const cycleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const handleLanguageChange = useCallback((nextLanguage: string | null) => {
    if (!nextLanguage || nextLanguage === language) return;
    changeLanguage(nextLanguage);
    onInteraction?.();
  }, [changeLanguage, language, onInteraction]);

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

  const searchLabel = label('command_palette.title', 'Search');
  const searchPlaceholder = label('search.placeholder', 'Search Pokémon (name or id)…').replace(/\.\.\./g, '…');
  const favoritesLabel = label('nav.favorites', 'Favorites');
  const settingsLabel = label('header.open_settings', 'Open Settings');
  const languageLabel = label('settings.language', 'Language');
  const themeLabel = mounted
    ? (theme === 'system' ? t('settings.system') : theme === 'dark' ? t('settings.dark') : t('settings.light'))
    : 'System';
  const languageCode = language === 'auto' ? 'AUTO' : language.toUpperCase();
  const selectedLanguage = languageOptions.find((option) => option.code === language)?.label ?? languageCode;
  const baseActionClass = isSheet ? 'site-header-sheet-action' : 'site-header-action';

  const switchThemeLabel = isDark
    ? t('settings.switch_to_light', { defaultValue: `Switch to light theme — current theme: ${themeLabel}` })
    : t('settings.switch_to_dark', { defaultValue: `Switch to dark theme — current theme: ${themeLabel}` });

  return (
    <div className={isSheet ? 'site-header-sheet-actions-grid' : 'site-header-actions-list'}>
      <button
        type="button"
        onClick={() => {
          onInteraction?.();
          window.dispatchEvent(new CustomEvent('primedex:open-command-palette'));
        }}
        aria-label={searchLabel}
        title={searchPlaceholder}
        className={cn(baseActionClass, !isSheet && 'site-header-search-action')}
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        <span className={cn(!isSheet && 'sr-only')}>{searchLabel}</span>
        {!isSheet && (
          <kbd className="site-header-shortcut hidden rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold 2xl:inline-flex">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        )}
      </button>

      <Link
        prefetch={false}
        href={`/${resolvedLang}/favorites`}
        aria-label={favoritesLabel}
        title={favoritesLabel}
        onClick={onInteraction}
        className={cn(
          baseActionClass,
          !isSheet && 'hidden sm:inline-flex',
          isSheet && 'site-header-sheet-favorites',
        )}
      >
        <Heart aria-hidden="true" className="h-4 w-4" />
        <span className={cn(!isSheet && 'sr-only')}>{favoritesLabel}</span>
      </Link>

      <label className={cn('site-header-language', !isSheet && 'hidden xl:flex', isSheet && 'site-header-language-sheet')}>
        <Globe2 aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="site-header-language-code" aria-hidden="true">{languageCode}</span>
        {isSheet && <span className="site-header-language-name">{selectedLanguage}</span>}
        <select
          name="language"
          value={language}
          onChange={(event) => handleLanguageChange(event.target.value)}
          aria-label={languageLabel}
          className="site-header-language-select"
        >
          {languageOptions.map((option) => (
            <option key={option.code} value={option.code} className="bg-card text-foreground">
              {option.flag} {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="site-header-language-chevron h-3.5 w-3.5 shrink-0" />
      </label>

      <button
        type="button"
        onClick={() => {
          cycleTheme();
          onInteraction?.();
        }}
        title={themeLabel}
        aria-label={switchThemeLabel}
        suppressHydrationWarning
        className={cn(baseActionClass, !isSheet && 'hidden md:inline-flex h-11 w-11')}
      >
        {!mounted ? (
          <Sun aria-hidden="true" className="h-4 w-4" />
        ) : isDark ? (
          <Moon aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Sun aria-hidden="true" className="h-4 w-4" />
        )}
        <span className={cn(!isSheet && 'sr-only')}>{themeLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          toggleSettings();
          onInteraction?.();
        }}
        aria-label={settingsLabel}
        title={settingsLabel}
        className={cn(baseActionClass, !isSheet && 'hidden md:inline-flex h-11 w-11')}
      >
        <Settings aria-hidden="true" className="h-4 w-4" />
        <span className={cn(!isSheet && 'sr-only')}>{settingsLabel}</span>
      </button>

      <AccountMenu
        className={cn(!isSheet && 'hidden sm:inline-flex', isSheet && 'site-header-sheet-action site-header-sheet-account')}
        showLabel={isSheet}
        onInteraction={onInteraction}
        onRequestAuth={onRequestAuth}
      />
    </div>
  );
}
