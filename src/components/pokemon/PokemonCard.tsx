'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPokemonDetail, getPokemonSpecies } from '@/lib/api';
import { getBaseSpeciesName, getFormDisplayName } from '@/lib/form-names';
import { PokemonDetail, PokemonSpecies, TYPE_COLORS, PokemonCardType, LocalizedNameEntry } from '@/types/pokemon';
import { Heart, ArrowLeftRight, Plus, Minus } from 'lucide-react';
import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { useMounted } from '@/hooks/useMounted';

import { Skeleton } from '@/components/ui/skeleton';
import { PokeballIcon } from '@/components/ui/PokeballIcon';

interface GqlPokemonData {
  id?: number;
  name?: string;
  types?: PokemonDetail['types'] | string[];
  pokemon_v2_pokemontypes?: Array<{ pokemon_v2_type: { name: string } }>;
  localizedNames?: LocalizedNameEntry[];
  stats?: number[];
  is_legendary?: boolean;
  is_mythical?: boolean;
}

interface PokemonCardProps {
  name: string;
  url?: string;
  index?: number;
  initialData?: {
    pokemon: Partial<PokemonDetail> & GqlPokemonData;
    species?: Partial<PokemonSpecies>;
  };
}

export type { GqlPokemonData, PokemonCardProps };

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;
  const value = Number.parseInt(expanded, 16);

  if (Number.isNaN(value)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// Active state for an action toggle — tinted by the element's --chip accent.
const CHIP_ACTIVE =
  'border-[color-mix(in_oklab,var(--chip)_42%,transparent)] bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)] shadow-[0_0_14px_color-mix(in_oklab,var(--chip)_26%,transparent)]';

export function PokemonCardSkeleton() {
  return (
    <div className="py-1 px-1 h-[18rem]">
      <div className="relative h-full p-4 flex flex-col animate-pulse rounded-[1.15rem] border border-border/50 bg-card/60 overflow-hidden">
        <div className="flex justify-between items-center w-full mb-3">
          <Skeleton className="h-4 w-12 bg-muted/40" />
          <div className="flex gap-1.5">
            <Skeleton className="h-11 w-11 rounded-full bg-muted/40" />
            <Skeleton className="h-11 w-11 rounded-full bg-muted/40" />
            <Skeleton className="h-11 w-11 rounded-full bg-muted/40" />
          </div>
        </div>
        <Skeleton className="w-28 h-28 rounded-full bg-muted/40 my-3 mx-auto" />
        <div className="mt-auto w-full flex flex-col items-center gap-2">
          <Skeleton className="h-3 w-20 bg-muted/40" />
          <Skeleton className="h-6 w-32 bg-muted/40" />
          <Skeleton className="h-5 w-16 rounded-full bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

export const PokemonCard = memo(function PokemonCard({ name, index = 0, initialData }: PokemonCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mounted = useMounted();

  const language = usePrimeDexStore(s => s.language);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const favorites = usePrimeDexStore(s => s.favorites);
  const compareList = usePrimeDexStore(s => s.compareList);
  const team = usePrimeDexStore(s => s.team);
  const caughtPokemon = usePrimeDexStore(s => s.caughtPokemon);

  const addFavorite = usePrimeDexStore(s => s.addFavorite);
  const removeFavorite = usePrimeDexStore(s => s.removeFavorite);
  const addToCompare = usePrimeDexStore(s => s.addToCompare);
  const removeFromCompare = usePrimeDexStore(s => s.removeFromCompare);
  const addToTeam = usePrimeDexStore(s => s.addToTeam);
  const removeFromTeam = usePrimeDexStore(s => s.removeFromTeam);
  const toggleCaught = usePrimeDexStore(s => s.toggleCaught);

  const resolvedLang = language === 'auto' ? systemLanguage : language;

  const pokemonGql = initialData?.pokemon as GqlPokemonData | undefined;
  const hasUsableData = !!(initialData?.pokemon?.id &&
    ((pokemonGql?.types?.length ?? 0) > 0 || (pokemonGql?.pokemon_v2_pokemontypes?.length ?? 0) > 0));

  const { data, isLoading } = useQuery<{
    pokemon: Partial<PokemonDetail>;
    species?: Partial<PokemonSpecies>;
  }>({
    queryKey: ['pokemon-card', name],
    queryFn: async () => {
      const baseName = getBaseSpeciesName(name);
      const [pokemon, species] = await Promise.all([
        getPokemonDetail(name),
        getPokemonSpecies(baseName).catch(() => null),
      ]);
      return {
        pokemon,
        species: species as PokemonSpecies,
      };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !hasUsableData,
  });

  const displayData = data || initialData;
  const pokemonData = displayData?.pokemon;
  const speciesData = displayData?.species;
  const pokemonGqlData = pokemonData as GqlPokemonData | undefined;

  const pokemonName = pokemonData?.name || name;
  let baseLocalizedName = pokemonName;
  if (speciesData?.names?.length) {
    const entry = speciesData.names.find(n => n?.language?.name === resolvedLang) || speciesData.names.find(n => n?.language?.name === 'en');
    if (entry?.name) baseLocalizedName = entry.name;
  } else if (pokemonGqlData?.localizedNames?.length) {
    const entry = pokemonGqlData.localizedNames.find((n: LocalizedNameEntry) => n?.language === resolvedLang) || pokemonGqlData.localizedNames.find((n: LocalizedNameEntry) => n?.language === 'en');
    if (entry?.name) baseLocalizedName = entry.name;
  }
  const displayName = pokemonName.includes('-')
    ? getFormDisplayName(pokemonName, baseLocalizedName, resolvedLang)
    : baseLocalizedName;

  const prefetchDetails = useCallback(() => {
    if (!name) return;
    queryClient.prefetchQuery({
      queryKey: ['pokemon-card', name],
      queryFn: async () => {
        const baseName = getBaseSpeciesName(name);
        const [pokemon, species] = await Promise.all([
          getPokemonDetail(name),
          getPokemonSpecies(baseName).catch(() => null),
        ]);
        return {
          pokemon,
          species: species as PokemonSpecies,
        };
      },
      staleTime: 10 * 60 * 1000,
    });
  }, [name, queryClient]);

  if (isLoading && !displayData) {
    return <PokemonCardSkeleton />;
  }

  if (!displayData || !displayData.pokemon) return null;
  const pokemon = displayData.pokemon as Partial<PokemonDetail> & GqlPokemonData;
  const pokemonId = pokemon.id || 0;

  if (!pokemonId) return null;

  const isFav = mounted && favorites.includes(pokemonId);
  const isComp = mounted && compareList.includes(pokemonId);
  const isTeam = mounted && team.includes(pokemonId);
  const caught = mounted && caughtPokemon.includes(pokemonId);

  const teamFull = mounted && team.length >= 6;
  const compareFull = mounted && compareList.length >= 3;

  const toggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isFav) {
      removeFavorite(pokemonId);
    } else {
      addFavorite(pokemonId);
    }
  };

  const toggleCompare = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isComp) {
      removeFromCompare(pokemonId);
    } else {
      addToCompare(pokemonId);
    }
  };

  const toggleTeam = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isTeam) {
      removeFromTeam(pokemonId);
    } else {
      addToTeam(pokemonId);
    }
  };

  const types: PokemonCardType[] = (pokemon.types || pokemon.pokemon_v2_pokemontypes || []).map((typeItem): PokemonCardType | null => {
    if (!typeItem) return null;
    if (typeof typeItem === 'string') return { type: { name: typeItem } };
    if ('type' in typeItem && (typeItem as { type?: { name?: string } }).type?.name) return typeItem as PokemonCardType;
    if ('pokemon_v2_type' in typeItem) {
      const gqlType = typeItem as { pokemon_v2_type?: { name?: string } };
      if (gqlType.pokemon_v2_type?.name) return { type: { name: gqlType.pokemon_v2_type.name } };
    }
    return null;
  }).filter((type): type is PokemonCardType => type !== null);

  const mainType = types[0]?.type?.name || 'normal';
  const color = TYPE_COLORS[mainType] || '#A8A77A';
  const cardLabel = t('detail.view_card_aria', { name: displayName });
  const cardBackground = [
    `linear-gradient(165deg, ${hexToRgba(color, 0.07)} 0%, transparent 35%, ${hexToRgba(color, 0.05)} 100%)`,
  ].join(', ');
  const cardShadow = `0 14px 36px -28px ${hexToRgba(color, 0.4)}, 0 2px 6px -3px rgba(20, 14, 8, 0.08)`;
  const isLegendary = pokemon.is_legendary;
  const isMythical = pokemon.is_mythical;

  return (
    <Link
      href={`/pokemon/${name}`}
      aria-label={cardLabel}
      className="group/specimen relative block h-full py-1 px-1 outline-none sm:px-2 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[1.35rem]"
      onMouseEnter={prefetchDetails}
    >
      <article
        className="relative flex h-full flex-col rounded-[1.15rem] border border-border/50 bg-card/60 p-1.5 transition-all duration-500 hover:-translate-y-1 sm:p-2"
        style={{
          '--type-color': color,
          backgroundImage: cardBackground,
          borderColor: hexToRgba(color, 0.32),
          boxShadow: cardShadow,
        } as CSSProperties}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-60 transition-opacity duration-500 group-hover/specimen:opacity-80"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${hexToRgba(color, 0.1)} 0%, transparent 65%)`,
          }}
        />

        <div className="relative z-10 mb-1 flex w-full items-start justify-between sm:mb-1.5">
          <div className="flex flex-col items-start gap-0.5">
            <span className="cat-no text-[0.55rem] text-muted-foreground/70 sm:text-[0.6rem]">Cat. No.</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/85 sm:text-[11px]">
              #{pokemonId.toString().padStart(3, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTeam}
              disabled={!isTeam && teamFull}
              aria-label={isTeam ? t('card.remove_team') : t('card.add_team')}
              style={{ '--chip': 'var(--action-team)' } as CSSProperties}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border p-1 backdrop-blur-md transition-all duration-300 outline-none hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                isTeam
                  ? CHIP_ACTIVE
                  : 'border-foreground/15 bg-background/55 text-foreground/65 hover:border-foreground/30 hover:text-foreground/90',
                !isTeam && teamFull && 'cursor-not-allowed opacity-30'
              )}
            >
              {isTeam ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={toggleCompare}
              disabled={!isComp && compareFull}
              aria-label={isComp ? t('card.remove_compare') : t('card.add_compare')}
              style={{ '--chip': 'var(--action-compare)' } as CSSProperties}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border p-1 backdrop-blur-md transition-all duration-300 outline-none hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                isComp
                  ? CHIP_ACTIVE
                  : 'border-foreground/15 bg-background/55 text-foreground/65 hover:border-foreground/30 hover:text-foreground/90',
                !isComp && compareFull && 'cursor-not-allowed opacity-30'
              )}
            >
              <ArrowLeftRight className={cn('h-4 w-4 transition-transform', isComp && 'scale-110 rotate-12')} />
            </button>

            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={isFav ? t('card.remove_favorite') : t('card.add_favorite')}
              style={{ '--chip': 'var(--action-favorite)' } as CSSProperties}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border p-1 backdrop-blur-md transition-all duration-300 outline-none hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                isFav
                  ? CHIP_ACTIVE
                  : 'border-foreground/15 bg-background/55 text-foreground/65 hover:border-foreground/30 hover:text-foreground/90'
              )}
            >
              <Heart className={cn('h-5 w-5 transition-all', isFav && 'fill-current scale-110')} />
            </button>
          </div>
        </div>

        <div className="relative mx-auto h-20 w-20 transition-transform duration-500 group-hover/specimen:scale-105 sm:h-24 sm:w-24">
          <div
            className="absolute inset-1 rounded-full opacity-0 transition-opacity duration-500 group-hover/specimen:opacity-100"
            style={{ background: `radial-gradient(circle, ${hexToRgba(color, 0.18)} 0%, transparent 70%)` }}
            aria-hidden="true"
          />
          <Image
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 33vw, 20vw"
            className="relative object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.32)] transition-all duration-500 group-hover/specimen:drop-shadow-[0_20px_32px_rgba(0,0,0,0.42)]"
            priority={index < 8}
          />
        </div>

        <div className="relative z-10 mt-1 flex flex-col items-center gap-0.5 px-1 pb-3 sm:mt-2 sm:pb-3">
          <p className="latin-name font-display text-[10px] italic text-muted-foreground/80 sm:text-[11px]" style={{ fontVariationSettings: '"opsz" 9' }}>
            {pokemonName.replace(/-/g, ' ')}
          </p>
          <h3 className="truncate w-full text-center font-display text-sm font-semibold tracking-tight text-foreground transition-colors duration-300 sm:text-base" style={{ fontVariationSettings: '"opsz" 24' }}>
            {displayName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {types.map((typeItem: PokemonCardType, i: number) => {
              const typeName = typeItem?.type?.name;
              if (!typeName) return null;
              const typeColor = TYPE_COLORS[typeName] || '#A8A77A';
              return (
                <span
                  key={`${typeName}-${i}`}
                  className="type-bar px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] sm:px-2 sm:py-0.5 sm:text-[9px]"
                  style={{
                    color: typeColor,
                  }}
                >
                  {t(`types.${typeName}`)}
                </span>
              );
            })}
            {(isLegendary || isMythical) && (
              <span
                className="type-bar rounded-sm border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] sm:text-[9px]"
                style={{
                  borderColor: 'color-mix(in oklab, var(--action-legendary) 55%, transparent)',
                  background: 'color-mix(in oklab, var(--action-legendary) 15%, transparent)',
                  color: 'color-mix(in oklab, var(--action-legendary) 82%, var(--foreground) 18%)',
                }}
                title={isMythical ? t('card.mythical') : t('card.legendary')}
              >
                {isMythical ? t('card.mythical') : t('card.legendary')}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (pokemon.id) toggleCaught(pokemon.id);
          }}
          className={cn(
            'absolute bottom-1 right-1.5 z-20 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all duration-300 outline-none hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:bottom-1 sm:right-2',
            caught
              ? 'border-primary/55 bg-primary text-primary-foreground shadow-[0_0_18px_rgba(190,93,72,0.32)]'
              : 'border-foreground/15 bg-background/65 text-foreground/55 backdrop-blur-md hover:border-foreground/35 hover:text-foreground/85'
          )}
          aria-label={caught ? t('card.caught') : t('card.mark_caught')}
        >
          <PokeballIcon className={cn('h-5 w-5 sm:h-5 sm:w-5', caught ? 'text-primary-foreground' : 'text-foreground/55')} />
        </button>
      </article>
    </Link>
  );
});
