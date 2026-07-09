'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, Heart, Search } from 'lucide-react';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import AccountMenu from '@/components/auth/AccountMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function HeaderActions() {
  const theme = usePrimeDexStore(s => s.theme);
  const setTheme = usePrimeDexStore(s => s.setTheme);
  const language = usePrimeDexStore(s => s.language);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const mounted = useMounted();
  const { t } = useTranslation();
  const changeLanguage = useChangeLanguage();
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac'));
  }, []);

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
      <Tooltip>
        <TooltipTrigger>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('primedex:open-command-palette'))}
            aria-label={t('command_palette.title', { defaultValue: 'Command Palette' })}
            className="glass-control mr-0.5 hidden h-10 items-center gap-1.5 px-2.5 text-muted-foreground transition-all hover:text-primary active:scale-95 md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="rounded-sm border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[9px] font-bold">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-bold">{searchPlaceholder}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Link href={localizedHref('/favorites')} aria-label={t('nav.favorites')} className="hidden sm:block">
            <div className="glass-control flex h-10 w-10 items-center justify-center text-muted-foreground transition-all hover:text-[var(--action-favorite)] active:scale-95">
              <Heart className="h-3.5 w-3.5" />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-bold">{favoritesLabel}</TooltipContent>
      </Tooltip>

      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger
          size="sm"
          aria-label={languageLabel}
          className="glass-control flex !h-10 !w-10 sm:!w-[96px] items-center justify-center sm:justify-between !px-2.5 sm:!px-3 !py-0 overflow-hidden sm:overflow-visible text-muted-foreground hover:border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500 active:scale-95"
          style={{ minHeight: 40 }}
        >
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
            <circle cx="9" cy="9" r="7.2" />
            <path d="M2 9h14" />
            <path d="M9 1.8C7 4.2 6 6.5 6 9s1 4.8 3 7.2" />
            <path d="M9 1.8c2 2.4 3 4.7 3 7.2s-1 4.8-3 7.2" />
            <path d="M2.8 5.5h12.4M2.8 12.5h12.4" />
          </svg>
          <span className="hidden sm:contents">
            <SelectValue suppressHydrationWarning className="min-w-[24px] justify-center text-center font-mono text-[10px] font-semibold uppercase leading-none">{languageLabel}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="glass-surface min-w-48 p-1">
          {languageOptions.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="rounded-sm focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="text-[11px] font-bold uppercase tracking-tight">{lang.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger>
          <button
            type="button"
            onClick={cycleTheme}
            className="glass-control flex h-10 w-10 items-center justify-center text-muted-foreground hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500 active:scale-95"
            aria-label={themeLabel}
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
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-bold">{themeLabel}</TooltipContent>
      </Tooltip>

      <AccountMenu />
    </>
  );
}
