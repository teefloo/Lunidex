'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Swords,
  Sparkles,
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
import { useClientLanguage } from '@/hooks/useLocaleHref';
import {
  getAllPokemonSearchIndex,
  getAllItems,
  getAllMoves,
  getAllAbilities,
} from '@/lib/api/graphql';

import { pokemonKeys } from '@/lib/api/keys';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { formatName } from '@/lib/utils';
import { getBaseSpeciesName, getFormDisplayName } from '@/lib/form-names';
import { usePrimeDexStore } from '@/store/primedex';
import {
  NAVIGATION_DESTINATIONS,
  PRIMARY_NAVIGATION,
  matchesDestinationSearch,
} from '@/lib/navigation-registry';

const ITEM_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

export function CommandPalette({ initialOpen = false }: { initialOpen?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const toggleSettings = usePrimeDexStore((state) => state.toggleSettings);
  const [open, setOpen] = useState(initialOpen);
  const [search, setSearch] = useState('');

  const resolvedLang = useClientLanguage();
  const languageId = languageToPokemonLanguageId[resolvedLang];

  const localizedHref = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized === '/' ? `/${resolvedLang}` : `/${resolvedLang}${normalized}`;
  }, [resolvedLang]);

  const hasQuery = search.trim().length > 0;

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch('');
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
    const destinations = hasQuery ? NAVIGATION_DESTINATIONS : PRIMARY_NAVIGATION;
    return destinations.filter((item) => {
      const label = t(item.labelKey, { defaultValue: item.fallback }) || item.fallback;
      return matchesDestinationSearch(item, search, resolvedLang, label);
    });
  }, [hasQuery, resolvedLang, search, t]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setSearch('');
    router.push(href);
  }, [router]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('command_palette.title', { defaultValue: 'Command Palette' })}
      description={t('command_palette.description', { defaultValue: 'Search pages and Pokémon' })}
    >
      <Command shouldFilter={false} label={t('command_palette.title', { defaultValue: 'Command Palette' })}>
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
                const label = t(item.labelKey, { defaultValue: item.fallback }) || item.fallback;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      if (item.action === 'settings') {
                        toggleSettings();
                        setOpen(false);
                        setSearch('');
                      } else if (item.path) {
                        navigate(localizedHref(item.path));
                      }
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {hasQuery && itemResults.length > 0 && (
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

          {hasQuery && moveResults.length > 0 && (
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

          {hasQuery && abilityResults.length > 0 && (
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

          {hasQuery && pokemonResults.length > 0 && (
            <CommandGroup heading={t('command_palette.pokemon', { defaultValue: 'Pokémon' })}>
              {pokemonResults.map((pokemon) => {
                const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
                const localized = speciesNames.find((entry) => entry.pokemon_v2_language?.name === resolvedLang);
                const displayName = getFormDisplayName(
                  pokemon.name,
                  localized?.name || getBaseSpeciesName(pokemon.name),
                  resolvedLang,
                );
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
