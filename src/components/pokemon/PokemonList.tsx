'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usePrimeDexStore } from '@/store/primedex';
import { getPokemonList, getAllPokemonDetailed, getAllPokemonSummary } from '@/lib/api';
import { getPokemonSummarySlice } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { SITE_URL } from '@/lib/site';
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard';
import { useMemo, useState } from 'react';
import { Loader2, RotateCcw, SearchX } from 'lucide-react';
import { PokemonBasicData, GraphQLPokemonSummary, LocalizedNameEntry, PokemonSpecies } from '@/types/pokemon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

type PokemonStatName = 'hp' | 'attack' | 'defense' | 'speed' | 'special-attack' | 'special-defense';

interface PokemonStatMap {
  hp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  'special-attack'?: number;
  'special-defense'?: number;
}

interface PokemonResultItem {
  id: number;
  name: string;
  url: string;
  types?: string[];
  localizedNames?: LocalizedNameEntry[];
  generation_id?: number;
  height?: number;
  weight?: number;
  stats?: PokemonStatMap;
  base_stat_total?: number;
  is_legendary?: boolean;
  is_mythical?: boolean;
  egg_groups?: string[];
  color?: string;
  shape?: string;
  species?: Partial<PokemonSpecies>;
}

export default function PokemonList() {
  const { t } = useTranslation();
  
  // Atomic selectors
  const searchTerm = usePrimeDexStore(s => s.searchTerm);
  const selectedTypes = usePrimeDexStore(s => s.selectedTypes);
  const selectedGeneration = usePrimeDexStore(s => s.selectedGeneration);
  const showFavoritesOnly = usePrimeDexStore(s => s.showFavoritesOnly);
  const favorites = usePrimeDexStore(s => s.favorites);
  const sortBy = usePrimeDexStore(s => s.sortBy);
  const isLegendary = usePrimeDexStore(s => s.isLegendary);
  const isMythical = usePrimeDexStore(s => s.isMythical);
  const selectedEggGroups = usePrimeDexStore(s => s.selectedEggGroups);
  const selectedColors = usePrimeDexStore(s => s.selectedColors);
  const selectedShapes = usePrimeDexStore(s => s.selectedShapes);
  const minBaseStats = usePrimeDexStore(s => s.minBaseStats);
  const minAttack = usePrimeDexStore(s => s.minAttack);
  const minDefense = usePrimeDexStore(s => s.minDefense);
  const minSpeed = usePrimeDexStore(s => s.minSpeed);
  const minHp = usePrimeDexStore(s => s.minHp);
  const heightRange = usePrimeDexStore(s => s.heightRange);
  const weightRange = usePrimeDexStore(s => s.weightRange);
  const language = usePrimeDexStore(s => s.language);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const showCaughtOnly = usePrimeDexStore(s => s.showCaughtOnly);
  const caughtPokemon = usePrimeDexStore(s => s.caughtPokemon);
  const storeResetFilters = usePrimeDexStore(s => s.resetFilters);
  const resetFilters = () => {
    storeResetFilters();
  };

  const resolvedLang = language === 'auto' ? systemLanguage : language;

  const isBasicMode = selectedTypes.length === 0 &&
    !searchTerm &&
    !selectedGeneration &&
    !showFavoritesOnly &&
    showCaughtOnly === 'all' &&
    isLegendary === null &&
    isMythical === null &&
    selectedEggGroups.length === 0 &&
    selectedColors.length === 0 &&
    selectedShapes.length === 0 &&
    minBaseStats === 0 &&
    minAttack === 0 &&
    minDefense === 0 &&
    minSpeed === 0 &&
    minHp === 0 &&
    heightRange[0] === 0 &&
    heightRange[1] === 25 &&
    weightRange[0] === 0 &&
    weightRange[1] === 1200 &&
    sortBy === 'id-asc';

  // Advanced mode check
  const isAdvancedFilterActive = isLegendary !== null || 
    isMythical !== null || 
    selectedEggGroups.length > 0 || 
    selectedColors.length > 0 || 
    selectedShapes.length > 0 || 
    minBaseStats > 0 || 
    minAttack > 0 || 
    minDefense > 0 || 
    minSpeed > 0 || 
    minHp > 0 || 
    heightRange[0] > 0 || 
    heightRange[1] < 25 || 
    weightRange[0] > 0 || 
    weightRange[1] < 1200 ||
    sortBy.includes('height') ||
    sortBy.includes('weight');

  // 1. Summary Data : Loaded on demand (Search or Filters)
  const { data: allSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: pokemonKeys.allSummary(),
    queryFn: () => getAllPokemonSummary(),
    enabled: !isBasicMode || !!searchTerm, // Load only if filtering or searching
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000, // Keep 48h in garbage collection
  });

  const { data: basicSummary } = useQuery({
    queryKey: pokemonKeys.summarySlice(0, 80),
    queryFn: () => getPokemonSummarySlice(80, 0),
    enabled: isBasicMode,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });

  // 2. Detailed Data : Loaded ONLY if advanced filters are used
  const { data: allDetailed, isLoading: isLoadingDetailed, error: detailedError } = useQuery({
    queryKey: pokemonKeys.allDetailed(),
    queryFn: () => getAllPokemonDetailed(),
    enabled: isAdvancedFilterActive,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    retry: 2,
  });

  // 3. Normal Mode : Infinite Scroll
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingInfinite,
  } = useInfiniteQuery({
    queryKey: pokemonKeys.lists(),
    queryFn: getPokemonList,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextParam,
    enabled: isBasicMode,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000, // Keep pages 2h in GC
  });

  const transformedSummary = useMemo(() => {
    const source = isBasicMode ? basicSummary : allSummary;
    if (!source) return [];
    return source.map((p: GraphQLPokemonSummary) => ({
      name: p.name,
      url: `https://pokeapi.co/api/v2/pokemon/${p.id}/`,
      id: p.id,
      height: p.height ?? 0,
      weight: p.weight ?? 0,
      types: p.pokemon_v2_pokemontypes?.map((t) => t.pokemon_v2_type.name) || [],
      localizedNames: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames?.map((n) => ({
        language: n.pokemon_v2_language.name,
        name: n.name
      })) || [],
      generation_id: p.pokemon_v2_pokemonspecy?.generation_id
    }));
  }, [allSummary, basicSummary, isBasicMode]);

  const buildInitialData = (p: PokemonResultItem) => {
    const localizedNames = p.localizedNames || [];
    return {
      pokemon: {
        id: p.id,
        name: p.name,
        types: p.types?.map((t) => ({ type: { name: t, url: '' }, slot: 1 })) || [],
        localizedNames,
      },
      species: {
        names: localizedNames.map((n: LocalizedNameEntry) => ({
          name: n.name,
          language: { name: n.language },
        })),
      } as Partial<PokemonSpecies>,
    };
  };

  const transformedDetailed = useMemo(() => {
    if (!allDetailed || !Array.isArray(allDetailed)) return [];
    return allDetailed
      .filter((p): boolean => !!p && typeof p === 'object')
      .map((p: PokemonBasicData) => ({
        name: p.name,
        url: `https://pokeapi.co/api/v2/pokemon/${p.id}/`,
        id: p.id,
        height: p.height ?? 0,
        weight: p.weight ?? 0,
        stats: p.pokemon_v2_pokemonstats?.reduce<PokemonStatMap>((acc, stat) => {
          const statName = stat.pokemon_v2_stat?.name as PokemonStatName | undefined;
          if (!statName) return acc;
          acc[statName] = stat.base_stat;
          return acc;
        }, {}) || {},
        base_stat_total: p.pokemon_v2_pokemonstats?.reduce((acc, curr) => acc + curr.base_stat, 0) || 0,
        is_legendary: p.pokemon_v2_pokemonspecy?.is_legendary || false,
        is_mythical: p.pokemon_v2_pokemonspecy?.is_mythical || false,
        types: p.pokemon_v2_pokemontypes?.map(t => t.pokemon_v2_type.name) || [],
        egg_groups: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonegggroups?.map(eg => eg.pokemon_v2_egggroup.name) || [],
        color: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemoncolor?.name,
        shape: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonshape?.name,
        localizedNames: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames?.map(n => ({
          language: n.pokemon_v2_language.name,
          name: n.name
        })) || []
      }));
  }, [allDetailed]);

  const filterKey = `${searchTerm}-${selectedTypes.join(',')}-${selectedGeneration}-${showFavoritesOnly}-${isLegendary}-${isMythical}-${selectedEggGroups.join(',')}-${selectedColors.join(',')}-${selectedShapes.join(',')}-${minBaseStats}-${minAttack}-${minDefense}-${minSpeed}-${minHp}-${heightRange[0]}-${heightRange[1]}-${weightRange[0]}-${weightRange[1]}-${isBasicMode}-${showCaughtOnly}`;

  const [displayLimit, setDisplayLimit] = useState(20);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setDisplayLimit(20);
  }

  const filteredAndSortedResults = useMemo(() => {
    let results: PokemonResultItem[] = [];

    if (isBasicMode) {
      const summaryMap = new Map(transformedSummary.map(d => [d.id, d]));
      results = infiniteData?.pages.flatMap((page) => page.results).map(p => {
        const id = parseInt(p.url.split('/').filter(Boolean).pop() || '0');
        return summaryMap.get(id) || { ...p, id };
      }) || [];
    } else {
      // Only use detailed data when stat-based advanced filters require it
      const needsDetailedData = isLegendary !== null || isMythical !== null ||
        selectedEggGroups.length > 0 || selectedColors.length > 0 ||
        selectedShapes.length > 0 || minBaseStats > 0 || minAttack > 0 ||
        minDefense > 0 || minSpeed > 0 || minHp > 0;
      
      let sourceData: PokemonResultItem[] = needsDetailedData ? transformedDetailed : transformedSummary;
      
      if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
        if (needsDetailedData && isLoadingDetailed) return null;
        return [];
      }

      sourceData = sourceData.filter((p): p is PokemonResultItem => p !== null && p !== undefined && typeof p === 'object' && 'id' in p && 'name' in p);
      if (sourceData.length === 0) return [];
      results = [...sourceData];

      if (selectedTypes.length > 0) {
        results = results.filter(p => selectedTypes.every(t => p.types?.includes(t)));
      }

      if (selectedGeneration) {
        results = results.filter(p => p.generation_id === selectedGeneration);
      }

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        results = results.filter((p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.id.toString().includes(lowerSearch) ||
          p.localizedNames?.some((n: { name: string }) => n.name.toLowerCase().includes(lowerSearch))
        );
      }

      if (showFavoritesOnly) results = results.filter(p => favorites.includes(p.id));
      
      if (showCaughtOnly === 'caught') {
        results = results.filter(p => caughtPokemon.includes(p.id));
      } else if (showCaughtOnly === 'uncaught') {
        results = results.filter(p => !caughtPokemon.includes(p.id));
      }

      if (needsDetailedData && transformedDetailed.length > 0) {
        const detailedMap = new Map(transformedDetailed.map(d => [d.id, d]));
        results = results.map(p => {
          const detailed = detailedMap.get(p.id);
          if (detailed) {
            return {
              ...p,
              is_legendary: detailed.is_legendary,
              is_mythical: detailed.is_mythical,
              egg_groups: detailed.egg_groups,
              color: detailed.color,
              shape: detailed.shape,
              stats: detailed.stats,
              base_stat_total: detailed.base_stat_total,
            };
          }
          return p;
        });
      }

      if (isLegendary === true) results = results.filter(p => p.is_legendary);
      else if (isLegendary === false) results = results.filter(p => !p.is_legendary);
      if (isMythical === true) results = results.filter(p => p.is_mythical);
      else if (isMythical === false) results = results.filter(p => !p.is_mythical);
      if (selectedEggGroups.length > 0) results = results.filter(p => selectedEggGroups.some(eg => p.egg_groups?.includes(eg)));
      if (selectedColors.length > 0) results = results.filter(p => p.color && selectedColors.includes(p.color));
      if (selectedShapes.length > 0) results = results.filter(p => p.shape && selectedShapes.includes(p.shape));
      if (minBaseStats > 0) results = results.filter(p => (p.base_stat_total || 0) >= minBaseStats);
      if (minHp > 0) results = results.filter(p => (p.stats?.hp || 0) >= minHp);
      if (minAttack > 0) results = results.filter(p => (p.stats?.attack || 0) >= minAttack);
      if (minDefense > 0) results = results.filter(p => (p.stats?.defense || 0) >= minDefense);
      if (minSpeed > 0) results = results.filter(p => (p.stats?.speed || 0) >= minSpeed);

      if (heightRange[0] > 0 || heightRange[1] < 25) {
        const minH = heightRange[0];
        const maxH = heightRange[1];
        results = results.filter(p => {
          const rawHeight = Number(p.height);
          if (Number.isNaN(rawHeight)) return false;
          const h = rawHeight / 10;
          const meetsMin = h >= minH;
          const meetsMax = maxH >= 25 || h <= maxH;
          return meetsMin && meetsMax;
        });
      }
      if (weightRange[0] > 0 || weightRange[1] < 1200) {
        const minW = weightRange[0];
        const maxW = weightRange[1];
        results = results.filter(p => {
          const rawWeight = Number(p.weight);
          if (Number.isNaN(rawWeight)) return false;
          const w = rawWeight / 10;
          const meetsMin = w >= minW;
          const meetsMax = maxW >= 1200 || w <= maxW;
          return meetsMin && meetsMax;
        });
      }
    }

    // Fast path: basic mode with default ID sort is already ordered from API
    if (isBasicMode && sortBy === 'id-asc') {
      return results;
    }

    const sortedResults = [...results];

    if (sortBy === 'id-asc') sortedResults.sort((a, b) => a.id - b.id);
    else if (sortBy === 'id-desc') sortedResults.sort((a, b) => b.id - a.id);
    else if (sortBy === 'name-asc') {
      sortedResults.sort((a, b) => {
        const nameA = a.localizedNames?.find((n: LocalizedNameEntry) => n.language === resolvedLang)?.name || a.name;
        const nameB = b.localizedNames?.find((n: LocalizedNameEntry) => n.language === resolvedLang)?.name || b.name;
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'name-desc') {
      sortedResults.sort((a, b) => {
        const nameA = a.localizedNames?.find((n: LocalizedNameEntry) => n.language === resolvedLang)?.name || a.name;
        const nameB = b.localizedNames?.find((n: LocalizedNameEntry) => n.language === resolvedLang)?.name || b.name;
        return nameB.localeCompare(nameA);
      });
    } else if (sortBy === 'height-asc') {
      sortedResults.sort((a, b) => (Number(a.height) || 0) - (Number(b.height) || 0));
    } else if (sortBy === 'height-desc') {
      sortedResults.sort((a, b) => (Number(b.height) || 0) - (Number(a.height) || 0));
    } else if (sortBy === 'weight-asc') {
      sortedResults.sort((a, b) => (Number(a.weight) || 0) - (Number(b.weight) || 0));
    } else if (sortBy === 'weight-desc') {
      sortedResults.sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0));
    }

    return sortedResults;
  }, [infiniteData, transformedSummary, transformedDetailed, searchTerm, selectedTypes, selectedGeneration, showFavoritesOnly, favorites, sortBy, isLegendary, isMythical, selectedEggGroups, selectedColors, selectedShapes, minBaseStats, minAttack, minDefense, minSpeed, minHp, heightRange, weightRange, isBasicMode, resolvedLang, showCaughtOnly, caughtPokemon, isLoadingDetailed]);

  const displayedPokemon = useMemo(() => {
    if (!filteredAndSortedResults) return [];
    return filteredAndSortedResults.slice(0, displayLimit);
  }, [filteredAndSortedResults, displayLimit]);

  const hasMoreFiltered = !isBasicMode && filteredAndSortedResults !== null && displayLimit < filteredAndSortedResults.length;

  const handleLoadMore = () => {
    if (isBasicMode && hasNextPage) {
      fetchNextPage();
    }
    setDisplayLimit(prev => prev + 40);
  };

  const isDataLoading = (isBasicMode && isLoadingInfinite) || 
                        (!isBasicMode && isAdvancedFilterActive && isLoadingDetailed) || 
                        (!isBasicMode && !isAdvancedFilterActive && isLoadingSummary) ||
                        (!isBasicMode && filteredAndSortedResults === null);

  if (isDataLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 sm:gap-2 px-1 sm:px-4 mt-8">
        {Array.from({ length: 10 }).map((_, i) => <PokemonCardSkeleton key={i} />)}
      </div>
    );
  }

  if (detailedError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <SearchX className="w-20 h-20 text-red-500/40" />
        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground/80">{t('list.error_loading')}</h3>
        <p className="text-sm text-foreground/70 max-w-md">{(detailedError as Error).message || t('list.error_desc')}</p>
        <Button variant="outline" onClick={resetFilters} className="rounded-full px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2">
          <RotateCcw className="w-4 h-4" /> {t('filters.reset')}
        </Button>
      </div>
    );
  }

  if (displayedPokemon.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <SearchX className="w-20 h-20 text-foreground/20" />
        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground/80">{t('list.no_results')}</h3>
        <Button variant="outline" onClick={resetFilters} className="rounded-full px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2">
          <RotateCcw className="w-4 h-4" /> {t('filters.reset')}
        </Button>
      </div>
    );
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: filteredAndSortedResults?.length ?? 0,
    itemListElement: displayedPokemon.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: p.localizedNames?.find((n: LocalizedNameEntry) => n.language === resolvedLang)?.name || p.name,
      url: `${SITE_URL}/pokemon/${p.name}`,
    })),
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="sr-only">{t('list.title') || 'Pokémon List'}</h2>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-2 pt-6">
        <h2 className="sr-only">
          {t('list.title', { defaultValue: 'Specimen Catalogue' })}
        </h2>
        <div className="rule-line" aria-hidden="true" />
      </div>

      {!isBasicMode && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-2">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 codex-frame" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="cat-no text-[0.6rem] text-muted-foreground/80">{t('list.results')}</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-mono font-semibold tracking-wider border-none text-[10px]">
                {(filteredAndSortedResults?.length ?? 0).toString().padStart(3, '0')}
              </Badge>
              {filteredAndSortedResults && filteredAndSortedResults.length > 0 && (
                <span className="text-[10px] text-foreground/55">
                  {t('list.showing', { defaultValue: `Showing ${displayedPokemon.length} of ${filteredAndSortedResults.length}` })}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-[11px] md:text-[10px] font-bold uppercase tracking-[0.18em] gap-1.5">
              <RotateCcw className="w-3 h-3" /> {t('filters.clear_all')}
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl px-2 sm:px-2">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-0.5 gap-x-2">
          {displayedPokemon.map((p, idx) => (
            <div key={p.id} className="pokemon-grid-item">
              <PokemonCard name={p.name} url={p.url} index={idx} initialData={buildInitialData(p)} />
            </div>
          ))}
        </div>
      </div>

      {(isBasicMode || hasMoreFiltered) && (
        <div className="flex justify-center p-8">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage || (!hasNextPage && !hasMoreFiltered)}
            className="rounded-full px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2"
            aria-label={isFetchingNextPage ? t('list.loading_more') : t('list.load_more')}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t('list.loading_more')}
              </>
            ) : (
              <>
                {t('list.load_more')}
                {!isBasicMode && filteredAndSortedResults && (
                  <span className="text-foreground/50 font-normal normal-case tracking-normal">
                    ({displayedPokemon.length} / {filteredAndSortedResults.length})
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
