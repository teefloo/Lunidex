'use client';

import Link, { LinkProps } from 'next/link';
import {
  Sun,
  Moon,
  Heart,
  Users,
  BrainCircuit,
  Languages,
  Shapes,
  Swords,
  Search,
  Menu,
  ArrowLeftRight,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import { useEffect, useMemo, useState, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getFormDisplayName } from '@/lib/form-names';
import { useTranslation, loadLanguage, persistLanguageCookie } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { getAllPokemonSearchIndex } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { useMounted } from '@/hooks/useMounted';

interface HeaderLinkProps extends LinkProps {
  children: ReactNode;
  variant?: 'ghost' | 'default' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  title?: string;
}

function HeaderLink({ children, href, variant, size, className, ...props }: HeaderLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-transparent text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'ghost' && 'hover:border-border/60 hover:bg-muted/70 hover:text-foreground',
        size === 'sm' && 'h-9 px-4 text-xs tracking-[0.16em] uppercase',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  const {
    theme,
    setTheme,
    caughtPokemon,
    language,
    setLanguage,
    systemLanguage,
  } = usePrimeDexStore();
  const { t, i18n } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updateDropdownPosition = useCallback(() => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
        zIndex: 9999,
      });
    }
  }, []);

  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const { data: allPokemon } = useQuery({
    queryKey: pokemonKeys.allSearchIndex(),
    queryFn: () => getAllPokemonSearchIndex(),
    enabled: localSearch.trim().length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const searchResults = useMemo(() => {
    if (!localSearch || !allPokemon) return [];

    const searchLower = localSearch.toLowerCase();

    return allPokemon
      .filter((pokemon) => {
        const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
        const localized = speciesNames.find((speciesName) => speciesName.pokemon_v2_language?.name === resolvedLang);
        const name = (localized?.name || pokemon.name).toLowerCase();

        return name.includes(searchLower) || pokemon.name.includes(searchLower);
      })
      .slice(0, 5);
  }, [localSearch, allPokemon, resolvedLang]);

  useEffect(() => {
    if (isSearchFocused && searchResults.length > 0) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isSearchFocused, searchResults, updateDropdownPosition]);

  const languageLabel = mounted ? (language === 'auto' ? t('settings.auto') : language.toUpperCase()) : 'EN';
  const themeLabel = mounted
    ? (theme === 'system' ? t('settings.system') : theme === 'dark' ? t('settings.dark') : t('settings.light'))
    : t('settings.system');
  const languageOptions = useMemo(() => [
    { code: 'auto', label: t('languages.auto'), flag: '🌐' },
    { code: 'en', label: t('languages.en'), flag: '🇺🇸' },
    { code: 'fr', label: t('languages.fr'), flag: '🇫🇷' },
    { code: 'de', label: t('languages.de'), flag: '🇩🇪' },
    { code: 'es', label: t('languages.es'), flag: '🇪🇸' },
    { code: 'it', label: t('languages.it'), flag: '🇮🇹' },
    { code: 'ja', label: t('languages.ja'), flag: '🇯🇵' },
    { code: 'ko', label: t('languages.ko'), flag: '🇰🇷' },
    { code: 'zh', label: t('languages.zh'), flag: '🇨🇳' },
  ] as const, [t]);
  const homeAriaLabel = mounted ? `${t('header.home_aria')} - PrimeDex` : 'Go to Home - PrimeDex';
  const teamLabel = mounted ? t('nav.team') : 'Team Builder';
  const compareLabel = mounted ? t('nav.compare') : 'Compare';
  const tcgLabel = mounted ? t('nav.tcg') : 'TCG Catalog';
  const typesLabel = mounted ? t('nav.types') : 'Types';
  const movesLabel = mounted ? t('nav.moves') : 'Moves';
  const quizLabel = mounted ? t('nav.quiz') : 'Quiz';
  const dashboardLabel = mounted ? t('nav.dashboard') : 'Dashboard';
  const favoritesLabel = mounted ? t('nav.favorites') : 'Favorites';
  const menuLabel = mounted ? (t('header.open_menu') || 'Menu') : 'Menu';
  const homeMenuLabel = mounted ? `${t('header.home_aria')} - PrimeDex` : 'Go to Home - PrimeDex';
  const searchPlaceholder = mounted ? t('search.placeholder') : 'Search Pokémon (name or id)...';

  const isDark = mounted && (
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const handleLanguageChange = useCallback((nextLanguage: string | null) => {
    if (!nextLanguage || nextLanguage === language) return;

    setLanguage(nextLanguage);

    const resolvedLang = nextLanguage === 'auto' ? (systemLanguage || 'en') : nextLanguage;
    loadLanguage(resolvedLang).then(() => {
      i18n.changeLanguage(resolvedLang);
    });
    persistLanguageCookie(resolvedLang);
  }, [i18n, language, setLanguage, systemLanguage]);

  const caughtCount = mounted ? caughtPokemon.length : 0;
  const progressPercent = Math.round((caughtCount / 1025) * 100);

  return (
    <>
      <header
        className="fixed left-0 right-0 top-2 z-50 flex justify-center px-3 md:top-3 md:px-4"
      >
        <div className="relative">
        <div
          className="glass-toolbar codex-frame inline-flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1.5 px-3 py-2 md:max-w-[calc(100vw-3rem)] md:px-4"
        >
          <div className="flex shrink-0 items-center justify-start">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label={homeAriaLabel}>
              <div className="shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                <PrimeDexLogo className="h-5 w-5 md:h-6 md:w-6 transition-all duration-300 drop-shadow-[0_0_8px_rgba(190,93,72,0.18)] group-hover:drop-shadow-[0_0_14px_rgba(190,93,72,0.32)]" />
              </div>

              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-baseline leading-none tracking-tight">
                  <span className="font-display text-[1.05rem] font-extrabold gradient-text-hero md:text-base" style={{ fontVariationSettings: '"opsz" 144' }}>
                    Prime
                  </span>
                  <span className="font-display text-[1.05rem] font-medium italic editorial-italic text-foreground/90 md:text-base" style={{ fontVariationSettings: '"opsz" 144' }}>
                    Dex
                  </span>
                  <span aria-hidden="true" className="ml-1.5 hidden h-3 w-px bg-foreground/30 sm:block" />
                  <span className="ml-1.5 cat-no hidden text-[0.55rem] text-muted-foreground/80 sm:block">No. 0001</span>
                </div>

                <div className="flex h-3 items-center gap-1.5 px-0.5">
                  <span suppressHydrationWarning className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/65 md:text-[10px]">
                    {mounted ? caughtCount.toString().padStart(3, '0') : '000'} <span className="text-muted-foreground/50">/</span> 1025
                  </span>
                  <div className="h-[2px] w-7 overflow-hidden rounded-full bg-foreground/15" role="progressbar" aria-valuenow={mounted ? progressPercent : 0} aria-valuemin={0} aria-valuemax={100} aria-label={mounted ? `${caughtCount} of 1025 Pokémon caught, ${progressPercent}% complete` : 'Loading progress'}>
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                      style={{ width: `${mounted ? progressPercent : 0}%` }}
                    />
                  </div>
                  <span className="sr-only">{mounted ? `${caughtCount} of 1025 Pokémon caught, ${progressPercent}% complete` : 'Loading progress'}</span>
                </div>
              </div>
            </Link>
          </div>

          <nav className="hidden min-w-0 flex-none items-center justify-center gap-0 rounded-full border border-foreground/10 bg-foreground/[0.03] px-1 py-0.5 backdrop-blur-xl lg:flex">
            <HeaderLink href="/team" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <Users className="h-3 w-3" /> {teamLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href="/compare" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <ArrowLeftRight className="h-3 w-3" /> {compareLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href="/tcg" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <LayoutGrid className="h-3 w-3" /> {tcgLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href="/types" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <Shapes className="h-3 w-3" /> {typesLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href="/moves" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <Swords className="h-3 w-3" /> {movesLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href="/quiz" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <BrainCircuit className="h-3 w-3" /> {quizLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href="/dashboard" variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/65 hover:text-primary">
              <BarChart3 className="h-3 w-3" /> {dashboardLabel}
            </HeaderLink>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 md:gap-1.5">
            <div ref={searchRef} className="relative group mr-0.5 hidden w-[clamp(180px,13vw,240px)] 2xl:block">
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 transition-colors duration-300 group-hover:text-primary">
                  <Search className="h-3.5 w-3.5 text-foreground/60 transition-colors duration-300 group-hover:text-primary" />
                </div>
                  <input
                  type="text"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={localSearch || ''}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="h-8 w-full rounded-full border border-foreground/15 bg-background/40 pl-9 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-foreground shadow-[0_10px_24px_-24px_rgba(24,36,54,0.28)] backdrop-blur-xl transition-all duration-300 placeholder:text-foreground/40 placeholder:normal-case placeholder:tracking-normal focus:border-primary/45 focus:bg-background/65 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

            </div>

            <Tooltip>
              <TooltipTrigger>
                  <Link href="/favorites" aria-label={t('nav.favorites')} className="hidden sm:block">
                  <div
                    className="glass-control flex h-8 items-center gap-1.5 px-2.5 text-foreground/70 hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-500 active:scale-95"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    <span className="hidden text-[9px] font-black uppercase tracking-[0.15em] xl:inline">{favoritesLabel}</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-bold">
                {favoritesLabel}
              </TooltipContent>
            </Tooltip>

            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger
                size="sm"
                aria-label={t('header.language_title', { language: languageLabel })}
                className="glass-control flex !h-8 !w-[96px] items-center justify-between !px-3 !py-0 text-foreground/70 hover:border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500 active:scale-95"
                style={{ width: 96, minWidth: 96, height: 32, minHeight: 32 }}
              >
                <Languages className="h-4 w-4" />
                <SelectValue suppressHydrationWarning className="min-w-[24px] justify-center text-center font-mono text-[10px] font-semibold uppercase leading-none">
                  {languageLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="glass-surface min-w-48 rounded-2xl p-1">
                {languageOptions.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5"
                  >
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
                  className="glass-control flex h-8 w-8 items-center justify-center text-foreground/70 hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500 active:scale-95"
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
              <TooltipContent side="bottom" className="text-xs font-bold">
                {themeLabel}
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <button
                      type="button"
                      className="glass-control flex h-8 w-8 items-center justify-center text-foreground/70 hover:scale-105 hover:border-border/80 hover:bg-muted/55 hover:text-foreground active:scale-95"
                      aria-label={menuLabel}
                    >
                      <Menu className="h-4 w-4" />
                    </button>
                  }
                />
                <SheetContent side="right" className="w-[85vw] max-w-[350px] p-0">
                  <SheetHeader className="border-b border-foreground/15 p-6">
                    <SheetTitle className="flex items-baseline text-left font-display tracking-tight">
                      <span className="text-2xl font-extrabold gradient-text-hero" style={{ fontVariationSettings: '"opsz" 144' }}>
                        Prime
                      </span>
                      <span className="text-2xl font-medium italic editorial-italic text-foreground/90" style={{ fontVariationSettings: '"opsz" 144' }}>
                        Dex
                      </span>
                    </SheetTitle>
                    <p className="mt-1 cat-no text-[0.6rem] text-muted-foreground">Chapter I — Field Compendium</p>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 p-4">
                    <SheetClose
                      render={
                        <Link href="/" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <PrimeDexLogo className="h-5 w-5 flex-shrink-0" /> {homeMenuLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/favorites" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <Heart className="h-5 w-5 flex-shrink-0" /> {favoritesLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/team" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <Users className="h-5 w-5 flex-shrink-0" /> {teamLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/compare" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <ArrowLeftRight className="h-5 w-5 flex-shrink-0" /> {compareLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/tcg" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <LayoutGrid className="h-5 w-5 flex-shrink-0" /> {tcgLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/types" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <Shapes className="h-5 w-5 flex-shrink-0" /> {typesLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/moves" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <Swords className="h-5 w-5 flex-shrink-0" /> {movesLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/quiz" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <BrainCircuit className="h-5 w-5 flex-shrink-0" /> {quizLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href="/dashboard" className="flex items-center gap-4 rounded-xl p-4 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-all hover:bg-muted/50 hover:text-primary">
                          <BarChart3 className="h-5 w-5 flex-shrink-0" /> {dashboardLabel}
                        </Link>
                      }
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          </div>

          {isSearchFocused && localSearch && searchResults.length > 0 && (
              <div
                className="glass-surface !overflow-hidden rounded-xl p-2 w-72"
                style={dropdownStyle}
                role="listbox"
                aria-label={t('search.results_aria', { defaultValue: 'Search results' })}
              >
                <div className="flex flex-col gap-1">
                  {searchResults.map((pokemon) => {
                    const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
                    const localized = speciesNames.find((speciesName) => speciesName.pokemon_v2_language?.name === resolvedLang);
                    const baseLocalizedName = localized?.name || pokemon.name;
                    const displayName = pokemon.name.includes('-')
                      ? getFormDisplayName(pokemon.name, baseLocalizedName, resolvedLang)
                      : baseLocalizedName;

                    return (
                      <button
                        key={pokemon.name}
                        type="button"
                        onClick={() => {
                          router.push(`/pokemon/${pokemon.name}`);
                          setLocalSearch('');
                          setIsSearchFocused(false);
                        }}
                        role="option"
                        aria-selected={false}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted/70 group/item"
                      >
                        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-muted/60 p-1">
                          <Image
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                            alt={displayName}
                            width={32}
                            height={32}
                            className="object-contain transition-transform drop-shadow-md group-hover/item:scale-110"
                          />
                        </div>
                        <span className="flex-1 truncate font-display text-xs font-semibold italic editorial-italic capitalize text-foreground/85 group-hover/item:text-primary">
                          {displayName}
                        </span>
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                          No. {pokemon.id.toString().padStart(3, '0')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </header>
    </>
  );
}
