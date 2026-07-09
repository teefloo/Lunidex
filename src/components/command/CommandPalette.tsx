'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ArrowLeftRight,
  LayoutGrid,
  Shapes,
  Swords,
  Package,
  Sparkles,
  BrainCircuit,
  Shield,
  Egg,
  Heart,
  Home,
  Calculator,
  HelpCircle,
  Trophy,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { getAllPokemonSearchIndex } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { resolveLanguage } from '@/lib/languages';
import { formatName } from '@/lib/utils';

interface StaticCommandItem {
  path: string;
  icon: LucideIcon;
  labelKey: string;
  fallback: string;
}

const PAGE_ITEMS: StaticCommandItem[] = [
  { path: '/', icon: Home, labelKey: 'nav.home', fallback: 'Home' },
  { path: '/team', icon: Users, labelKey: 'nav.team', fallback: 'Team Builder' },
  { path: '/compare', icon: ArrowLeftRight, labelKey: 'nav.compare', fallback: 'Compare' },
  { path: '/tcg', icon: LayoutGrid, labelKey: 'nav.tcg', fallback: 'TCG Catalog' },
  { path: '/types', icon: Shapes, labelKey: 'nav.types', fallback: 'Types' },
  { path: '/moves', icon: Swords, labelKey: 'nav.moves', fallback: 'Moves' },
  { path: '/items', icon: Package, labelKey: 'nav.items', fallback: 'Items' },
  { path: '/abilities', icon: Sparkles, labelKey: 'nav.abilities', fallback: 'Abilities' },
  { path: '/quiz', icon: BrainCircuit, labelKey: 'nav.quiz', fallback: 'Quiz' },
  { path: '/battle', icon: Shield, labelKey: 'nav.battle', fallback: 'Battle' },
  { path: '/breeding', icon: Egg, labelKey: 'nav.breeding', fallback: 'Breeding' },
  { path: '/ev-iv', icon: Calculator, labelKey: 'nav.ev_iv', fallback: 'EV/IV Calc' },
  { path: '/favorites', icon: Heart, labelKey: 'nav.favorites', fallback: 'Favorites' },
  { path: '/faq', icon: HelpCircle, labelKey: 'nav.faq', fallback: 'FAQ' },
  { path: '/nuzlocke', icon: Trophy, labelKey: 'nuzlocke.title', fallback: 'Nuzlocke Tracker' },
  { path: '/tcg/deck-builder', icon: LayoutTemplate, labelKey: 'tcg.nav_deck_builder', fallback: 'Deck Builder' },
];

export function CommandPalette() {
  const { t } = useTranslation();
  const router = useRouter();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const resolvedLang = mounted ? resolveLanguage(language, systemLanguage) : 'en';

  const localizedHref = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized === '/' ? `/${resolvedLang}` : `/${resolvedLang}${normalized}`;
  }, [resolvedLang]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const handleOpenEvent = () => setOpen(true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('primedex:open-command-palette', handleOpenEvent);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('primedex:open-command-palette', handleOpenEvent);
    };
  }, []);

  const { data: allPokemon } = useQuery({
    queryKey: pokemonKeys.allSearchIndex(),
    queryFn: () => getAllPokemonSearchIndex(),
    enabled: open && search.trim().length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const pokemonResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !allPokemon) return [];

    return allPokemon
      .filter((pokemon) => {
        const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
        const localized = speciesNames.find((entry) => entry.pokemon_v2_language?.name === resolvedLang);
        const name = (localized?.name || pokemon.name).toLowerCase();
        return name.includes(query) || pokemon.name.includes(query);
      })
      .slice(0, 8);
  }, [search, allPokemon, resolvedLang]);

  const pageResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PAGE_ITEMS;
    return PAGE_ITEMS.filter((item) => {
      const label = (mounted ? t(item.labelKey) : item.fallback) || item.fallback;
      return label.toLowerCase().includes(query) || item.path.toLowerCase().includes(query);
    });
  }, [search, mounted, t]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setSearch('');
    router.push(href);
  }, [router]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('command_palette.title', { defaultValue: 'Command Palette' })}
      description={t('command_palette.description', { defaultValue: 'Search pages and Pokémon' })}
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={t('command_palette.placeholder', { defaultValue: 'Search pages, Pokémon...' })}
        />
        <CommandList>
          <CommandEmpty>
            {t('command_palette.no_results', { defaultValue: 'No results found.' })}
          </CommandEmpty>

          {pageResults.length > 0 && (
            <CommandGroup heading={t('command_palette.pages', { defaultValue: 'Pages' })}>
              {pageResults.map((item) => {
                const Icon = item.icon;
                const label = (mounted ? t(item.labelKey) : item.fallback) || item.fallback;
                return (
                  <CommandItem
                    key={item.path}
                    onSelect={() => navigate(localizedHref(item.path))}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {pokemonResults.length > 0 && (
            <CommandGroup heading={t('command_palette.pokemon', { defaultValue: 'Pokémon' })}>
              {pokemonResults.map((pokemon) => {
                const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
                const localized = speciesNames.find((entry) => entry.pokemon_v2_language?.name === resolvedLang);
                const displayName = localized?.name || formatName(pokemon.name);
                return (
                  <CommandItem
                    key={pokemon.id}
                    onSelect={() => navigate(localizedHref(`/pokemon/${pokemon.name}`))}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{displayName}</span>
                    <span className="ml-auto text-[10px] text-foreground/30">#{String(pokemon.id).padStart(3, '0')}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
