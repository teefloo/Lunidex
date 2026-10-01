'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usePrimeDexStore } from '@/store/primedex';
import { getPokemonList, getAllPokemonDetailed, getAllPokemonSummary } from '@/lib/api';
import { getPokemonSummarySlice } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RotateCcw, SearchX, X } from 'lucide-react';
import { PokemonBasicData, GraphQLPokemonSummary, LocalizedNameEntry, PokemonSpecies } from '@/types/pokemon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import {
  comparePokemonMeasurements,
  getExactNumericPokemonId,
  normalizeSearchText,
  shouldShowInitialPokemonListError,
  shouldUseCompletePokemonSummary,
} from '@/lib/pokemon-filter-utils';

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
  const setSelectedTypes = usePrimeDexStore(s => s.setSelectedTypes);
  const selectedGeneration = usePrimeDexStore(s => s.selectedGeneration);
  const setSelectedGeneration = usePrimeDexStore(s => s.setSelectedGeneration);
  const showFavoritesOnly = usePrimeDexStore(s => s.showFavoritesOnly);
  const setShowFavoritesOnly = usePrimeDexStore(s => s.setShowFavoritesOnly);
  const favorites = usePrimeDexStore(s => s.favorites);
  const sortBy = usePrimeDexStore(s => s.sortBy);
  const setSortBy = usePrimeDexStore(s => s.setSortBy);
  const isLegendary = usePrimeDexStore(s => s.isLegendary);
  const setIsLegendary = usePrimeDexStore(s => s.setIsLegendary);
  const isMythical = usePrimeDexStore(s => s.isMythical);
  const setIsMythical = usePrimeDexStore(s => s.setIsMythical);
  const selectedEggGroups = usePrimeDexStore(s => s.selectedEggGroups);
  const setSelectedEggGroups = usePrimeDexStore(s => s.setSelectedEggGroups);
  const selectedColors = usePrimeDexStore(s => s.selectedColors);
  const setSelectedColors = usePrimeDexStore(s => s.setSelectedColors);
  const selectedShapes = usePrimeDexStore(s => s.selectedShapes);
  const setSelectedShapes = usePrimeDexStore(s => s.setSelectedShapes);
  const minBaseStats = usePrimeDexStore(s => s.minBaseStats);
  const setMinBaseStats = usePrimeDexStore(s => s.setMinBaseStats);
  const minAttack = usePrimeDexStore(s => s.minAttack);
  const setMinAttack = usePrimeDexStore(s => s.setMinAttack);
  const minDefense = usePrimeDexStore(s => s.minDefense);
  const setMinDefense = usePrimeDexStore(s => s.setMinDefense);
  const minSpeed = usePrimeDexStore(s => s.minSpeed);
  const setMinSpeed = usePrimeDexStore(s => s.setMinSpeed);
  const minHp = usePrimeDexStore(s => s.minHp);
  const setMinHp = usePrimeDexStore(s => s.setMinHp);
  const heightRange = usePrimeDexStore(s => s.heightRange);
  const setHeightRange = usePrimeDexStore(s => s.setHeightRange);
  const weightRange = usePrimeDexStore(s => s.weightRange);
  const setWeightRange = usePrimeDexStore(s => s.setWeightRange);
  const showCaughtOnly = usePrimeDexStore(s => s.showCaughtOnly);
  const setShowCaughtOnly = usePrimeDexStore(s => s.setShowCaughtOnly);
  const caughtPokemon = usePrimeDexStore(s => s.caughtPokemon);
  const storeResetFilters = usePrimeDexStore(s => s.resetFilters);
  const _hasHydrated = usePrimeDexStore(s => s._hasHydrated);
  const resetFilters = () => {
    storeResetFilters();
  };

  const resolvedLang = useClientLanguage();

  // Detect whether any filter other than collection views is non-default.
  const hasOtherFilters = selectedTypes.length > 0 ||
    !!searchTerm ||
    !!selectedGeneration ||
    isLegendary !== null ||
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
    sortBy !== 'id-asc';

  const useCompleteSummary = shouldUseCompletePokemonSummary({
    hasOtherFilters,
    showCaughtOnly,
    showFavoritesOnly,
  });

  // Before IndexedDB hydration completes, always use basic mode.
  // This matches the server render (all defaults) and prevents
  // query switching (infinite → allSummary) during hydration,
  // which was the root cause of the infinite load/stop cycle.
  const isBasicMode = !_hasHydrated ? true : !useCompleteSummary;

  // Whether stat-based advanced filters need the heavy allDetailed query
  const needsDetailedData = isLegendary !== null || isMythical !== null ||
    selectedEggGroups.length > 0 || selectedColors.length > 0 ||
    selectedShapes.length > 0 || minBaseStats > 0 || minAttack > 0 ||
    minDefense > 0 || minSpeed > 0 || minHp > 0;

  // Whether ANY advanced filter is active (including height/weight/sort)
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
  const { data: allSummary, isLoading: isLoadingSummary, error: summaryError } = useQuery({
    queryKey: pokemonKeys.allSummary(),
    queryFn: () => getAllPokemonSummary(),
    enabled: !isBasicMode || !!searchTerm, // Load only if filtering or searching
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000, // Keep 48h in garbage collection
    placeholderData: keepPreviousData,
    // Never bubble summary fetch failures to the root error boundary — we
    // already have basic + detailed fallbacks.
    throwOnError: false,
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
    throwOnError: false,
  });

  // 3. Normal Mode : Infinite Scroll
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingInfinite,
    error: infiniteError,
    refetch: refetchInfinite,
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

  const buildInitialData = useMemo(() => {
    return (p: PokemonResultItem) => _getCachedInitialData(p);
  }, []);

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
        generation_id: p.pokemon_v2_pokemonspecy?.generation_id,
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
  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset pagination when filters change
      setDisplayLimit(20);
    }
  }, [filterKey]);

  const filteredAndSortedResults = useMemo(() => {
    let results: PokemonResultItem[] = [];

    if (isBasicMode) {
      const summaryMap = new Map(transformedSummary.map(d => [d.id, d]));
      const basicResults = infiniteData?.pages.flatMap((page) => page.results).map(p => {
        const id = parseInt(p.url.split('/').filter(Boolean).pop() || '0');
        return summaryMap.get(id) || { ...p, id };
      }) || [];

      results = basicResults;
    } else {
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
        const normalizedSearch = normalizeSearchText(searchTerm);
        const exactId = getExactNumericPokemonId(searchTerm);
        const partialIdSearch = searchTerm.trim();
        results = results.filter((p) =>
          normalizeSearchText(p.name).includes(normalizedSearch) ||
          (exactId !== null ? p.id === exactId : p.id.toString().includes(partialIdSearch)) ||
          p.localizedNames?.some((n: { name: string }) => normalizeSearchText(n.name).includes(normalizedSearch))
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
      sortedResults.sort((a, b) => comparePokemonMeasurements(a.height, b.height, 'asc'));
    } else if (sortBy === 'height-desc') {
      sortedResults.sort((a, b) => comparePokemonMeasurements(a.height, b.height, 'desc'));
    } else if (sortBy === 'weight-asc') {
      sortedResults.sort((a, b) => comparePokemonMeasurements(a.weight, b.weight, 'asc'));
    } else if (sortBy === 'weight-desc') {
      sortedResults.sort((a, b) => comparePokemonMeasurements(a.weight, b.weight, 'desc'));
    }

    return sortedResults;
  }, [infiniteData, transformedSummary, transformedDetailed, searchTerm, selectedTypes, selectedGeneration, showFavoritesOnly, favorites, sortBy, isLegendary, isMythical, selectedEggGroups, selectedColors, selectedShapes, minBaseStats, minAttack, minDefense, minSpeed, minHp, heightRange, weightRange, isBasicMode, resolvedLang, showCaughtOnly, caughtPokemon, isLoadingDetailed, needsDetailedData]);

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
                        (!isBasicMode && needsDetailedData && isLoadingDetailed) || 
                        (!isBasicMode && !needsDetailedData && isLoadingSummary) ||
                        (!isBasicMode && filteredAndSortedResults === null);

  const activeFilterChips: Array<{ id: string; label: string; onRemove: () => void }> = [];
  const addFilterChip = (id: string, label: string, onRemove: () => void) => activeFilterChips.push({ id, label, onRemove });
  const displayFilterValue = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const regionByGeneration: Record<number, string> = {
    1: 'kanto', 2: 'johto', 3: 'hoenn', 4: 'sinnoh', 5: 'unova', 6: 'kalos', 7: 'alola', 8: 'galar', 9: 'paldea',
  };
  for (const type of selectedTypes) {
    addFilterChip(`type-${type}`, t(`types.${type}`), () => setSelectedTypes(selectedTypes.filter((value) => value !== type)));
  }
  if (selectedGeneration) {
    addFilterChip('generation', t(`regions.${regionByGeneration[selectedGeneration]}`, { defaultValue: `${t('filters.generation')} ${selectedGeneration}` }), () => setSelectedGeneration(null));
  }
  if (showFavoritesOnly) addFilterChip('favorites', t('nav.favorites'), () => setShowFavoritesOnly(false));
  if (showCaughtOnly !== 'all') {
    const label = showCaughtOnly === 'caught' ? t('caught_filter.caught') : t('caught_filter.missing');
    addFilterChip('caught', label, () => setShowCaughtOnly('all'));
  }
  if (isLegendary !== null) addFilterChip('legendary', `${t('filters.legendary')}${isLegendary ? '' : ` · ${t('common.no', { defaultValue: 'No' })}`}`, () => setIsLegendary(null));
  if (isMythical !== null) addFilterChip('mythical', `${t('filters.mythical')}${isMythical ? '' : ` · ${t('common.no', { defaultValue: 'No' })}`}`, () => setIsMythical(null));
  for (const group of selectedEggGroups) addFilterChip(`egg-${group}`, `${t('filters.egg_groups', { defaultValue: 'Egg group' })}: ${displayFilterValue(group)}`, () => setSelectedEggGroups(selectedEggGroups.filter((value) => value !== group)));
  for (const color of selectedColors) addFilterChip(`color-${color}`, `${t('filters.color', { defaultValue: 'Color' })}: ${displayFilterValue(color)}`, () => setSelectedColors(selectedColors.filter((value) => value !== color)));
  for (const shape of selectedShapes) addFilterChip(`shape-${shape}`, `${t('filters.shape', { defaultValue: 'Shape' })}: ${displayFilterValue(shape)}`, () => setSelectedShapes(selectedShapes.filter((value) => value !== shape)));
  if (minBaseStats > 0) addFilterChip('min-bst', `${t('filters.min_bst', { defaultValue: 'Min BST' })}: ${minBaseStats}`, () => setMinBaseStats(0));
  if (minAttack > 0) addFilterChip('min-attack', `${t('filters.min_attack', { defaultValue: 'Min attack' })}: ${minAttack}`, () => setMinAttack(0));
  if (minDefense > 0) addFilterChip('min-defense', `${t('filters.min_defense', { defaultValue: 'Min defense' })}: ${minDefense}`, () => setMinDefense(0));
  if (minSpeed > 0) addFilterChip('min-speed', `${t('filters.min_speed', { defaultValue: 'Min speed' })}: ${minSpeed}`, () => setMinSpeed(0));
  if (minHp > 0) addFilterChip('min-hp', `${t('filters.min_hp', { defaultValue: 'Min HP' })}: ${minHp}`, () => setMinHp(0));
  if (heightRange[0] > 0 || heightRange[1] < 25) addFilterChip('height', `${t('filters.height', { defaultValue: 'Height' })}: ${heightRange[0]}–${heightRange[1]}`, () => setHeightRange([0, 25]));
  if (weightRange[0] > 0 || weightRange[1] < 1200) addFilterChip('weight', `${t('filters.weight', { defaultValue: 'Weight' })}: ${weightRange[0]}–${weightRange[1]}`, () => setWeightRange([0, 1200]));
  if (sortBy !== 'id-asc') addFilterChip('sort', `${t('list.sort', { defaultValue: 'Sort' })}: ${displayFilterValue(sortBy)}`, () => setSortBy('id-asc'));

  if (isDataLoading) {
    return (
      <div className="pokedex-grid grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-2 gap-x-2 px-2 sm:px-2 mt-8">
        {Array.from({ length: 10 }).map((_, i) => <PokemonCardSkeleton key={i} />)}
      </div>
    );
  }

  if (shouldShowInitialPokemonListError(
    isBasicMode,
    (infiniteData?.pages.length ?? 0) > 0,
    infiniteError,
  )) {
    return (
      <div className="pokedex-empty-state flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <SearchX className="w-20 h-20 text-red-500/40" />
        <h2 className="text-2xl font-black uppercase tracking-tight text-muted-foreground">{t('list.error_loading')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{t('list.error_desc')}</p>
        <Button
          variant="outline"
          onClick={() => void refetchInfinite()}
          className="rounded-sm px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2"
        >
          <RotateCcw className="w-4 h-4" /> {t('common.retry', { defaultValue: 'Retry' })}
        </Button>
      </div>
    );
  }

  if (detailedError || (!isBasicMode && summaryError)) {
    const dataError = detailedError ?? summaryError;
    return (
      <div className="pokedex-empty-state flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <SearchX className="w-20 h-20 text-red-500/40" />
        <h2 className="text-2xl font-black uppercase tracking-tight text-muted-foreground">{t('list.error_loading')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{(dataError as Error)?.message || t('list.error_desc')}</p>
        <Button variant="outline" onClick={resetFilters} className="rounded-sm px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2">
          <RotateCcw className="w-4 h-4" /> {t('filters.reset')}
        </Button>
      </div>
    );
  }

  if (displayedPokemon.length === 0) {
    return (
      <div className="pokedex-empty-state flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <SearchX className="w-20 h-20 text-foreground/20" />
        <h2 className="text-2xl font-black uppercase tracking-tight text-muted-foreground">{t('list.no_results')}</h2>
        <Button variant="outline" onClick={resetFilters} className="rounded-sm px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2">
          <RotateCcw className="w-4 h-4" /> {t('filters.reset')}
        </Button>
      </div>
    );
  }

  return (
    <div className="pokedex-list-shell space-y-6 pb-20">
      <div className="pokedex-list-heading mx-auto w-full max-w-6xl px-4 sm:px-2 pt-6">
        <h2 className="sr-only">
          {t('list.title', { defaultValue: 'Specimen Catalogue' })}
        </h2>
        <div className="rule-line" aria-hidden="true" />
      </div>

      {!isBasicMode && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-2">
          <div className="pokedex-result-status flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 codex-frame" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="cat-no text-[0.6rem] text-muted-foreground">{t('list.results')}</span>
              <Badge variant="secondary" className="bg-primary/10 text-foreground font-mono font-semibold tracking-wider border-none text-[11px]">
                {(filteredAndSortedResults?.length ?? 0).toString().padStart(3, '0')}
              </Badge>
              {filteredAndSortedResults && filteredAndSortedResults.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {t('list.showing', {
                    shown: displayedPokemon.length,
                    total: filteredAndSortedResults.length,
                  })}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-[11px] md:text-[11px] font-bold uppercase tracking-[0.18em] gap-1.5">
              <RotateCcw className="w-3 h-3" /> {t('filters.clear_all')}
            </Button>
          </div>
        </div>
      )}

      {activeFilterChips.length > 0 ? (
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 sm:px-2" role="region" aria-label={t('filters.button')}>
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-foreground/45">{t('filters.button')}</span>
          {activeFilterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              aria-label={`${t('filters.reset')}: ${chip.label}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-primary/25 bg-primary/8 px-2.5 text-xs font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span>{chip.label}</span>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ))}
          <button type="button" onClick={resetFilters} className="min-h-11 px-2 text-xs font-bold text-foreground/55 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            {t('filters.clear_all')}
          </button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-2 sm:px-2">
        <div className="pokedex-grid grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-2 gap-x-2">
          {displayedPokemon.map((p, idx) => (
            <div key={p.id} className="pokemon-grid-item">
              <PokemonCard name={p.name} url={p.url} index={idx} initialData={buildInitialData(p)} />
            </div>
          ))}
        </div>
      </div>

      {(isBasicMode || hasMoreFiltered) && (
        <div className="pokedex-load-more flex justify-center p-8">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage || (!hasNextPage && !hasMoreFiltered)}
            className="rounded-sm px-8 py-6 h-auto font-black uppercase tracking-[0.2em] text-xs border-primary/20 hover:bg-primary/10 gap-2"
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
                    <span className="text-muted-foreground font-normal normal-case tracking-normal">
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

const _initialDataCache = new Map<string, ReturnType<typeof _buildInitialDataRaw>>();
const CACHE_MAX = 200;

function _buildInitialDataRaw(p: PokemonResultItem) {
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
}

function _getCachedInitialData(p: PokemonResultItem) {
  const key = `${p.id}-${p.name}`;
  let data = _initialDataCache.get(key);
  if (!data) {
    data = _buildInitialDataRaw(p);
    if (_initialDataCache.size >= CACHE_MAX) {
      const firstKey = _initialDataCache.keys().next().value;
      if (firstKey !== undefined) _initialDataCache.delete(firstKey);
    }
    _initialDataCache.set(key, data);
  }
  return data;
}
