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
import { useRouter } from 'next/navigation';
import { memo, useCallback } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
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

export function PokemonCardSkeleton() {
  return (
    <div className="py-2 px-2 h-[22rem]">
      <div className="glass-card h-full p-6 flex flex-col items-center rounded-xl animate-pulse">
        <div className="flex justify-between items-center w-full mb-4">
          <Skeleton className="h-5 w-14 bg-muted/60" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full bg-muted/60" />
            <Skeleton className="h-9 w-9 rounded-full bg-muted/60" />
            <Skeleton className="h-9 w-9 rounded-full bg-muted/60" />
          </div>
        </div>
        <Skeleton className="w-36 h-36 rounded-full bg-muted/60 my-4" />
        <div className="mt-auto w-full flex flex-col items-center gap-4 pt-6">
          <Skeleton className="h-8 w-32 bg-muted/60" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full bg-muted/60" />
            <Skeleton className="h-6 w-16 rounded-full bg-muted/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const PokemonCard = memo(function PokemonCard({ name, index = 0, initialData }: PokemonCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
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

  const openPokemonDetail = useCallback(() => {
    router.push(`/pokemon/${name}`);
  }, [name, router]);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPokemonDetail();
    }
  };

  if (isLoading && !displayData) {
    return <PokemonCardSkeleton />;
  }

  if (!displayData || !displayData.pokemon) return null;
  const pokemon = displayData.pokemon as Partial<PokemonDetail> & GqlPokemonData;
  const pokemonId = pokemon.id || 0;

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
    `radial-gradient(circle at 50% 18%, ${hexToRgba(color, 0.18)} 0%, transparent 52%)`,
    `radial-gradient(circle at 50% 100%, ${hexToRgba(color, 0.1)} 0%, transparent 42%)`,
    `linear-gradient(180deg, ${hexToRgba(color, 0.12)} 0%, rgba(8, 12, 22, 0.9) 48%, rgba(4, 7, 14, 1) 100%)`,
  ].join(', ');
  const cardShadow = `0 18px 48px -34px ${hexToRgba(color, 0.42)}, inset 0 1px 0 rgba(255, 255, 255, 0.06)`;

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={cardLabel}
      className="relative block h-full cursor-pointer py-1 px-1 outline-none sm:px-2 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={openPokemonDetail}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={prefetchDetails}
    >
      <div
        className="group relative isolate flex h-full flex-col overflow-hidden rounded-[1.35rem] border p-2 transition-all duration-500 hover:-translate-y-1 sm:p-4"
        style={{
          '--type-color': color,
          backgroundImage: cardBackground,
          borderColor: hexToRgba(color, 0.28),
          boxShadow: cardShadow,
        } as CSSProperties}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-80 transition-opacity duration-500 group-hover:opacity-90"
          style={{
            background: [
              `radial-gradient(circle at 50% 28%, ${hexToRgba(color, 0.14)} 0%, transparent 68%)`,
              `radial-gradient(circle at 50% 72%, ${hexToRgba(color, 0.08)} 0%, transparent 58%)`,
              `linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 28%, rgba(0, 0, 0, 0.14) 100%)`,
            ].join(', '),
          }}
        />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (pokemon.id) toggleCaught(pokemon.id);
          }}
          className={cn(
            'absolute bottom-2 left-2 z-20 flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border shadow-lg transition-all duration-400 hover:scale-110 active:scale-95 sm:bottom-3 sm:left-3 sm:min-h-[40px] sm:min-w-[40px]',
            caught
              ? 'border-primary/45 bg-primary text-primary-foreground shadow-sm'
              : 'border-border/60 bg-background/75 text-foreground/70 backdrop-blur-md hover:bg-muted/70 hover:text-foreground/90'
          )}
          aria-label={caught ? t('card.caught') : t('card.mark_caught')}
        >
          <PokeballIcon className={cn('h-4 w-4 sm:h-5 sm:w-5', caught ? 'text-primary-foreground' : 'text-foreground/50')} />
        </button>

        <div
          className="pointer-events-none absolute inset-0 z-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            boxShadow: `inset 0 0 0 1px ${color}28`,
          }}
        />

        <div className="relative z-10 mb-1 flex w-full flex-col gap-1 sm:mb-2 sm:gap-2">
          <div className="flex items-start justify-between">
            <span className="rounded-md bg-muted/60 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-foreground/70 sm:text-[11px]">
              #{pokemonId.toString().padStart(3, '0')}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={toggleTeam}
                disabled={!isTeam && teamFull}
                aria-label={isTeam ? t('card.remove_team') : t('card.add_team')}
                className={cn(
                  'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border p-1.5 backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 sm:min-h-[38px] sm:min-w-[38px] sm:p-2',
                  isTeam
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.25)]'
                    : 'border-border/60 bg-background/70 text-foreground/70 hover:bg-muted/70 hover:text-foreground/90',
                  !isTeam && teamFull && 'cursor-not-allowed opacity-20'
                )}
              >
                {isTeam ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>

              <button
                type="button"
                onClick={toggleCompare}
                disabled={!isComp && compareFull}
                aria-label={isComp ? t('card.remove_compare') : t('card.add_compare')}
                className={cn(
                  'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border p-1.5 backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 sm:min-h-[38px] sm:min-w-[38px] sm:p-2',
                  isComp
                    ? 'border-primary/30 bg-primary/20 text-primary shadow-[0_0_16px_rgba(227,53,13,0.25)]'
                    : 'border-border/60 bg-background/70 text-foreground/70 hover:bg-muted/70 hover:text-foreground/90',
                  !isComp && compareFull && 'cursor-not-allowed opacity-20'
                )}
              >
                <ArrowLeftRight className={cn('h-3 w-3 transition-transform', isComp && 'scale-110 rotate-12')} />
              </button>

              <button
                type="button"
                onClick={toggleFavorite}
                aria-label={isFav ? t('card.remove_favorite') : t('card.add_favorite')}
                className={cn(
                  'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border p-1.5 backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 sm:min-h-[38px] sm:min-w-[38px] sm:p-2',
                  isFav
                    ? 'border-rose-500/30 bg-rose-500/20 text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
                    : 'border-border/60 bg-background/70 text-foreground/70 hover:bg-muted/70 hover:text-foreground/90'
                )}
              >
                <Heart className={cn('h-3.5 w-3.5 transition-all', isFav && 'fill-current scale-110')} />
              </button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto h-24 w-24 transition-transform duration-500 group-hover:scale-110 sm:h-36 sm:w-36">
          <div className="absolute inset-0 rounded-full" />
          <Image
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.42)] transition-all duration-500 group-hover:drop-shadow-[0_22px_38px_rgba(0,0,0,0.55)]"
            priority={index < 8}
          />
        </div>

        <div className="relative z-10 mt-1 space-y-1 text-center sm:mt-4 sm:space-y-2">
          <h3 className="truncate px-1 text-xs font-bold uppercase tracking-wide text-foreground/90 transition-colors duration-300 group-hover:text-white sm:text-lg">
            {displayName}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {types.map((typeItem: PokemonCardType, i: number) => {
              const typeName = typeItem?.type?.name;
              if (!typeName) return null;
              return (
                <span
                  key={`${typeName}-${i}`}
                  className="rounded-md border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]"
                  style={{
                    backgroundColor: `${TYPE_COLORS[typeName] || '#A8A77A'}22`,
                    color: TYPE_COLORS[typeName] || '#A8A77A',
                    borderColor: `${TYPE_COLORS[typeName] || '#A8A77A'}35`,
                    boxShadow: `0 2px 8px -2px ${TYPE_COLORS[typeName] || '#A8A77A'}24`,
                  }}
                >
                  {t(`types.${typeName}`)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
