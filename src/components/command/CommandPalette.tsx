'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import {
  getAllPokemonSearchIndex,
  getAllItems,
  getAllMoves,
  getAllAbilities,
} from '@/lib/api/graphql';

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

const ITEM_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

export function CommandPalette({ initialOpen = false }: { initialOpen?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const mounted = useMounted();
  const [open, setOpen] = useState(initialOpen);
  const [search, setSearch] = useState('');

  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const getLanguageId = usePrimeDexStore((s) => s.getLanguageId);
  const resolvedLang = mounted ? resolveLanguage(language, systemLanguage) : 'en';
  const languageId = mounted ? getLanguageId() : 9;

  const localizedHref = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized === '/' ? `/${resolvedLang}` : `/${resolvedLang}${normalized}`;
  }, [resolvedLang]);

  const hasQuery = search.trim().length > 0;

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
    enabled: open && hasQuery,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: allItems } = useQuery({
    queryKey: ['items', languageId],
    queryFn: () => getAllItems(languageId),
    enabled: open && hasQuery,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: allMoves } = useQuery({
    queryKey: ['moves', languageId],
    queryFn: () => getAllMoves(languageId),
    enabled: open && hasQuery,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: allAbilities } = useQuery({
    queryKey: ['abilities', languageId],
    queryFn: () => getAllAbilities(languageId),
    enabled: open && hasQuery,
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

  const itemResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !allItems) return [];

    return allItems
      .filter((item) => {
        const localized = item.pokemon_v2_itemnames[0]?.name;
        return (localized?.toLowerCase().includes(query) || item.name.toLowerCase().includes(query));
      })
      .slice(0, 6);
  }, [search, allItems]);

  const moveResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !allMoves) return [];

    return allMoves
      .filter((move) => {
        const localized = move.pokemon_v2_movenames[0]?.name;
        return (localized?.toLowerCase().includes(query) || move.name.toLowerCase().includes(query));
      })
      .slice(0, 6);
  }, [search, allMoves]);

  const abilityResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !allAbilities) return [];

    return allAbilities
      .filter((ability) => {
        const localized = ability.pokemon_v2_abilitynames[0]?.name;
        return (localized?.toLowerCase().includes(query) || ability.name.toLowerCase().includes(query));
      })
      .slice(0, 6);
  }, [search, allAbilities]);

  const pageResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PAGE_ITEMS;
    return PAGE_ITEMS.filter((item) => {
      const label = (mounted ? t(item.labelKey, { defaultValue: item.fallback }) : item.fallback) || item.fallback;
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

          {itemResults.length > 0 && (
            <CommandGroup heading={t('command_palette.items', { defaultValue: 'Items' })}>
              {itemResults.map((item) => {
                const localizedName = item.pokemon_v2_itemnames[0]?.name || formatName(item.name);
                return (
                  <CommandItem
                    key={`item-${item.id}`}
                    onSelect={() => navigate(localizedHref(`/items/${item.name}`))}
                    className="gap-3"
                  >
                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/45 p-0.5">
                      <Image
                        src={`${ITEM_SPRITE_BASE}/${item.name}.png`}
                        alt={localizedName}
                        width={28}
                        height={28}
                        className="object-contain drop-shadow-sm"
                        unoptimized
                      />
                    </div>
                    <span className="flex-1 truncate">{localizedName}</span>
                    {item.pokemon_v2_itemcategory?.name && (
                      <span className="hidden text-[11px] text-foreground/30 capitalize sm:inline">
                        {item.pokemon_v2_itemcategory.name.replace(/-/g, ' ')}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {moveResults.length > 0 && (
            <CommandGroup heading={t('command_palette.moves', { defaultValue: 'Moves' })}>
              {moveResults.map((move) => {
                const localizedName = move.pokemon_v2_movenames[0]?.name || formatName(move.name);
                return (
                  <CommandItem
                    key={`move-${move.id}`}
                    onSelect={() => navigate(localizedHref(`/moves/${move.name}`))}
                    className="gap-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/45">
                      <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="flex-1 truncate">{localizedName}</span>
                    <span className="text-[11px] font-medium uppercase tracking-tight text-foreground/30">
                      {move.pokemon_v2_type.name}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {abilityResults.length > 0 && (
            <CommandGroup heading={t('command_palette.abilities', { defaultValue: 'Abilities' })}>
              {abilityResults.map((ability) => {
                const localizedName = ability.pokemon_v2_abilitynames[0]?.name || formatName(ability.name);
                return (
                  <CommandItem
                    key={`ability-${ability.id}`}
                    onSelect={() => navigate(localizedHref(`/abilities/${ability.name}`))}
                    className="gap-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/45">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="flex-1 truncate">{localizedName}</span>
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
                    className="gap-3"
                  >
                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/45 p-0.5">
                      <Image
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                        alt={displayName}
                        width={28}
                        height={28}
                        className="object-contain drop-shadow-sm"
                        unoptimized
                      />
                    </div>
                    <span className="flex-1 truncate">{displayName}</span>
                    <span className="text-[11px] text-foreground/30">#{String(pokemon.id).padStart(3, '0')}</span>
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
