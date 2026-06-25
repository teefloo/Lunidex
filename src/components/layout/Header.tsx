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
  Egg,
  Shield,
} from 'lucide-react';
import { useEffect, useMemo, useState, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getFormDisplayName } from '@/lib/form-names';
import { useTranslation } from '@/lib/i18n';
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
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import AccountMenu from '@/components/auth/AccountMenu';

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
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-transparent text-sm font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'ghost' && 'hover:border-border/60 hover:bg-muted/70 hover:text-foreground',
        size === 'sm' && 'h-10 px-4 text-xs tracking-[0.16em] uppercase',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  const theme = usePrimeDexStore(s => s.theme);
  const setTheme = usePrimeDexStore(s => s.setTheme);
  const caughtPokemon = usePrimeDexStore(s => s.caughtPokemon);
  const language = usePrimeDexStore(s => s.language);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const { t } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const changeLanguage = useChangeLanguage();
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
  const localizedHref = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized === '/' ? `/${resolvedLang}` : `/${resolvedLang}${normalized}`;
  };

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
  const teamLabel = mounted ? t('nav.team') : 'Team Builder';
  const compareLabel = mounted ? t('nav.compare') : 'Compare';
  const tcgLabel = mounted ? t('nav.tcg') : 'TCG Catalog';
  const typesLabel = mounted ? t('nav.types') : 'Types';
  const movesLabel = mounted ? t('nav.moves') : 'Moves';
  const quizLabel = mounted ? t('nav.quiz') : 'Quiz';
  const battleLabel = mounted ? (t('nav.battle') || 'Battle') : 'Battle';
  const breedingLabel = mounted ? (t('nav.breeding') || 'Breeding') : 'Breeding';
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
    changeLanguage(nextLanguage);
  }, [changeLanguage, language]);

  const caughtCount = mounted ? caughtPokemon.length : 0;
  const progressPercent = Math.round((caughtCount / 1025) * 100);

  return (
    <>
      <header
        className="fixed left-0 right-0 top-2 z-50 flex justify-center px-3 md:top-3 md:px-4"
      >
        <div className="relative">
        <div
          className="glass-toolbar codex-frame inline-flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1.5 px-3 py-2 md:max-w-[calc(100vw-3rem)] md:px-4 shadow-[var(--shadow-pixel)]"
        >
          <div className="flex shrink-0 items-center justify-start">
            <Link href={localizedHref('/')} className="flex items-center gap-2.5 group">
              <div className="shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                <PrimeDexLogo className="h-5 w-5 md:h-6 md:w-6 transition-all duration-300 drop-shadow-[0_0_8px_rgba(190,93,72,0.18)] group-hover:drop-shadow-[0_0_14px_rgba(190,93,72,0.32)]" />
              </div>

              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-baseline leading-none tracking-tight">
                  <span className="font-display text-[1.05rem] font-extrabold gradient-text-hero md:text-base">
                    Prime
                  </span>
                  <span className="font-display text-[1.05rem] font-medium italic editorial-italic text-foreground md:text-base">
                    Dex
                  </span>
                </div>

                <div className="flex h-3 items-center gap-1.5 px-0.5">
                  <span suppressHydrationWarning className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-[10px]">
                    {mounted ? caughtCount.toString().padStart(3, '0') : '000'} <span className="text-muted-foreground">/</span> 1025
                  </span>
                  <div className="h-[2px] w-7 overflow-hidden bg-foreground/15" role="progressbar" aria-valuenow={mounted ? progressPercent : 0} aria-valuemin={0} aria-valuemax={100} aria-label={mounted ? `${caughtCount} of 1025 Pokémon caught, ${progressPercent}% complete` : 'Loading progress'}>
                    <div
                      className="h-full bg-primary transition-[width] duration-700 ease-out"
                      style={{ width: `${mounted ? progressPercent : 0}%`, willChange: mounted ? 'width' : 'auto' }}
                    />
                  </div>
                  <span className="sr-only">{mounted ? `${caughtCount} of 1025 Pokémon caught, ${progressPercent}% complete` : 'Loading progress'}</span>
                </div>
              </div>
            </Link>
          </div>

          <nav className="hidden min-w-0 flex-none items-center justify-center gap-0 rounded-sm border border-border bg-background/40 px-1 py-0.5 lg:flex">
            <HeaderLink href={localizedHref('/team')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <Users className="h-3 w-3" /> {teamLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/compare')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <ArrowLeftRight className="h-3 w-3" /> {compareLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/tcg')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <LayoutGrid className="h-3 w-3" /> {tcgLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/types')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <Shapes className="h-3 w-3" /> {typesLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/moves')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <Swords className="h-3 w-3" /> {movesLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/quiz')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <BrainCircuit className="h-3 w-3" /> {quizLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/battle')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <Shield className="h-3 w-3" /> {battleLabel}
            </HeaderLink>
            <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
            <HeaderLink href={localizedHref('/breeding')} variant="ghost" size="sm" className="gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
              <Egg className="h-3 w-3" /> {breedingLabel}
            </HeaderLink>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 md:gap-1.5">
            <div ref={searchRef} className="relative group mr-0.5 hidden w-[clamp(180px,13vw,240px)] 2xl:block">
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 transition-colors duration-300 group-hover:text-primary">
                  <Search className="h-3.5 w-3.5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                </div>
                  <input
                  type="text"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={localSearch || ''}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="h-10 w-full rounded-sm border border-border/70 bg-background/50 pl-9 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-foreground shadow-[var(--shadow-pixel-sm)] transition-all duration-100 placeholder:text-muted-foreground placeholder:normal-case placeholder:tracking-normal focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

            </div>

            <Tooltip>
              <TooltipTrigger>
                  <Link href={localizedHref('/favorites')} aria-label={t('nav.favorites')} className="hidden sm:block">
                  <div
                    className="glass-control flex h-10 items-center gap-1.5 px-2.5 text-muted-foreground transition-all hover:text-[var(--action-favorite)] active:scale-95"
                    style={{ '--hover-color': 'var(--action-favorite)' } as React.CSSProperties}
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
                aria-label={languageLabel}
                className="glass-control flex !h-10 !w-[96px] items-center justify-between !px-3 !py-0 text-muted-foreground hover:border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500 active:scale-95"
                style={{ width: 96, minWidth: 96, height: 40, minHeight: 40 }}
              >
                <Languages className="h-4 w-4" />
                <SelectValue suppressHydrationWarning className="min-w-[24px] justify-center text-center font-mono text-[10px] font-semibold uppercase leading-none">
                  {languageLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="glass-surface min-w-48 p-1">
                {languageOptions.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="rounded-sm focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5"
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
              <TooltipContent side="bottom" className="text-xs font-bold">
                {themeLabel}
              </TooltipContent>
            </Tooltip>

            <AccountMenu />

            <div className="flex items-center lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <button
                      type="button"
                      className="glass-control flex h-10 w-10 items-center justify-center text-muted-foreground hover:scale-105 hover:border-border/80 hover:bg-muted/55 hover:text-foreground active:scale-95"
                      aria-label={menuLabel}
                    >
                      <Menu className="h-4 w-4" />
                    </button>
                  }
                />
                <SheetContent side="right" className="w-[85vw] max-w-[350px] p-0">
                  <SheetHeader className="border-b border-foreground/15 p-6">
                    <SheetTitle className="flex items-baseline text-left font-display tracking-tight">
                      <span className="text-2xl font-extrabold gradient-text-hero" >
                        Prime
                      </span>
                        <span className="text-2xl font-medium italic editorial-italic text-foreground" >
                        Dex
                      </span>
                    </SheetTitle>
                    <p className="mt-1 cat-no text-[0.6rem] text-muted-foreground">Chapter I — Field Compendium</p>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 p-4">
                    <SheetClose
                      render={
                        <Link href={localizedHref('/')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <PrimeDexLogo className="h-5 w-5 flex-shrink-0" /> {homeMenuLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/favorites')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <Heart className="h-5 w-5 flex-shrink-0" /> {favoritesLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/team')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <Users className="h-5 w-5 flex-shrink-0" /> {teamLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/compare')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <ArrowLeftRight className="h-5 w-5 flex-shrink-0" /> {compareLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/tcg')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <LayoutGrid className="h-5 w-5 flex-shrink-0" /> {tcgLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/types')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <Shapes className="h-5 w-5 flex-shrink-0" /> {typesLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/moves')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <Swords className="h-5 w-5 flex-shrink-0" /> {movesLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/quiz')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <BrainCircuit className="h-5 w-5 flex-shrink-0" /> {quizLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/battle')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <Swords className="h-5 w-5 flex-shrink-0" /> {battleLabel}
                        </Link>
                      }
                    />
                    <SheetClose
                      render={
                        <Link href={localizedHref('/breeding')} className="flex items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                          <Egg className="h-5 w-5 flex-shrink-0" /> {breedingLabel}
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
                className="glass-surface !overflow-hidden p-2 w-72"
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
                        className="flex w-full cursor-pointer items-center gap-3 rounded-sm p-2.5 text-left transition-colors hover:bg-muted/70 group/item"
                      >
                        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-border/60 bg-muted/60 p-1">
                          <Image
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                            alt={displayName}
                            width={32}
                            height={32}
                            className="object-contain transition-transform drop-shadow-md group-hover/item:scale-110"
                          />
                        </div>
                        <span className="flex-1 truncate font-display text-xs font-semibold italic editorial-italic capitalize text-muted-foreground group-hover/item:text-primary">
                          {displayName}
                        </span>
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
