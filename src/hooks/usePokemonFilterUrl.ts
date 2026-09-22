'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePrimeDexStore } from '@/store/primedex';
import {
  parseHomeFilters,
  serializeHomeFilters,
  type HomeSortValue,
} from '@/lib/pokemon-filter-url';

export function usePokemonFilterUrl(): void {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = usePrimeDexStore((state) => state._hasHydrated);
  const searchTerm = usePrimeDexStore((state) => state.searchTerm);
  const selectedTypes = usePrimeDexStore((state) => state.selectedTypes);
  const selectedGeneration = usePrimeDexStore((state) => state.selectedGeneration);
  const sortBy = usePrimeDexStore((state) => state.sortBy);
  const showCaughtOnly = usePrimeDexStore((state) => state.showCaughtOnly);
  const showFavoritesOnly = usePrimeDexStore((state) => state.showFavoritesOnly);
  const isLegendary = usePrimeDexStore((state) => state.isLegendary);
  const isMythical = usePrimeDexStore((state) => state.isMythical);
  const selectedEggGroups = usePrimeDexStore((state) => state.selectedEggGroups);
  const selectedColors = usePrimeDexStore((state) => state.selectedColors);
  const selectedShapes = usePrimeDexStore((state) => state.selectedShapes);
  const minBaseStats = usePrimeDexStore((state) => state.minBaseStats);
  const minAttack = usePrimeDexStore((state) => state.minAttack);
  const minDefense = usePrimeDexStore((state) => state.minDefense);
  const minSpeed = usePrimeDexStore((state) => state.minSpeed);
  const minHp = usePrimeDexStore((state) => state.minHp);
  const heightRange = usePrimeDexStore((state) => state.heightRange);
  const weightRange = usePrimeDexStore((state) => state.weightRange);
  const setSearchTerm = usePrimeDexStore((state) => state.setSearchTerm);
  const setSelectedTypes = usePrimeDexStore((state) => state.setSelectedTypes);
  const setSelectedGeneration = usePrimeDexStore((state) => state.setSelectedGeneration);
  const setSortBy = usePrimeDexStore((state) => state.setSortBy);
  const setShowCaughtOnly = usePrimeDexStore((state) => state.setShowCaughtOnly);
  const setShowFavoritesOnly = usePrimeDexStore((state) => state.setShowFavoritesOnly);
  const setIsLegendary = usePrimeDexStore((state) => state.setIsLegendary);
  const setIsMythical = usePrimeDexStore((state) => state.setIsMythical);
  const setSelectedEggGroups = usePrimeDexStore((state) => state.setSelectedEggGroups);
  const setSelectedColors = usePrimeDexStore((state) => state.setSelectedColors);
  const setSelectedShapes = usePrimeDexStore((state) => state.setSelectedShapes);
  const setMinBaseStats = usePrimeDexStore((state) => state.setMinBaseStats);
  const setMinAttack = usePrimeDexStore((state) => state.setMinAttack);
  const setMinDefense = usePrimeDexStore((state) => state.setMinDefense);
  const setMinSpeed = usePrimeDexStore((state) => state.setMinSpeed);
  const setMinHp = usePrimeDexStore((state) => state.setMinHp);
  const setHeightRange = usePrimeDexStore((state) => state.setHeightRange);
  const setWeightRange = usePrimeDexStore((state) => state.setWeightRange);
  // Initialize synchronously from the address bar so the first apply-effect
  // run already sees the real query (a client-side mount can happen with a
  // populated URL while an effect-based read would race it with defaults).
  const [urlSearch, setUrlSearch] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.search.slice(1),
  );
  const hasAppliedUrl = useRef(false);
  const externalNavigationRef = useRef(false);
  const suppressSerializeRef = useRef(false);

  useEffect(() => {
    // Our own router.push/replace calls never fire popstate, so any popstate
    // event is browser Back/Forward navigation whose filters must be applied
    // back into the store instead of being overwritten by it.
    const syncFromLocation = () => {
      externalNavigationRef.current = true;
      setUrlSearch(window.location.search.slice(1));
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const shouldApplyFilters = !hasAppliedUrl.current || externalNavigationRef.current;
    if (!shouldApplyFilters) return;

    const parsed = parseHomeFilters(new URLSearchParams(urlSearch));
    // Browser Back/Forward makes the URL the complete source of truth, so
    // absent params reset stale store values too. The very first application
    // keeps absent params untouched so an account's synced filter values can
    // survive a plain visit to a parameter-less URL.
    const overwriteAll = externalNavigationRef.current;
    if (overwriteAll || parsed.q !== undefined) setSearchTerm(parsed.q ?? '');
    if (overwriteAll || parsed.types !== undefined) setSelectedTypes(parsed.types ?? []);
    if (overwriteAll || parsed.gen !== undefined) setSelectedGeneration(parsed.gen ?? null);
    if (overwriteAll || parsed.sort !== undefined) {
      setSortBy((parsed.sort as HomeSortValue | undefined) ?? 'id-asc');
    }
    if (overwriteAll || parsed.view !== undefined) {
      setShowCaughtOnly(
        parsed.view === 'missing' ? 'uncaught' : parsed.view === 'caught' ? 'caught' : 'all',
      );
    }
    if (overwriteAll || parsed.fav !== undefined) setShowFavoritesOnly(parsed.fav ?? false);
    if (overwriteAll || parsed.legendary !== undefined) setIsLegendary(parsed.legendary ?? null);
    if (overwriteAll || parsed.mythical !== undefined) setIsMythical(parsed.mythical ?? null);
    if (overwriteAll || parsed.eggGroups !== undefined) setSelectedEggGroups(parsed.eggGroups ?? []);
    if (overwriteAll || parsed.colors !== undefined) setSelectedColors(parsed.colors ?? []);
    if (overwriteAll || parsed.shapes !== undefined) setSelectedShapes(parsed.shapes ?? []);
    if (overwriteAll || parsed.minBst !== undefined) setMinBaseStats(parsed.minBst ?? 0);
    if (overwriteAll || parsed.minAttack !== undefined) setMinAttack(parsed.minAttack ?? 0);
    if (overwriteAll || parsed.minDefense !== undefined) setMinDefense(parsed.minDefense ?? 0);
    if (overwriteAll || parsed.minSpeed !== undefined) setMinSpeed(parsed.minSpeed ?? 0);
    if (overwriteAll || parsed.minHp !== undefined) setMinHp(parsed.minHp ?? 0);
    if (overwriteAll || parsed.heightRange !== undefined) setHeightRange(parsed.heightRange ?? [0, 25]);
    if (overwriteAll || parsed.weightRange !== undefined) setWeightRange(parsed.weightRange ?? [0, 1200]);

    hasAppliedUrl.current = true;
    externalNavigationRef.current = false;
    // The serialize effect below runs in this same commit with pre-apply store
    // values; skip it once so it cannot rewrite the URL we just applied.
    suppressSerializeRef.current = true;
  }, [
    hydrated,
    setSearchTerm,
    setSelectedTypes,
    setSelectedGeneration,
    setSortBy,
    setShowCaughtOnly,
    setShowFavoritesOnly,
    setIsLegendary,
    setIsMythical,
    setSelectedEggGroups,
    setSelectedColors,
    setSelectedShapes,
    setMinBaseStats,
    setMinAttack,
    setMinDefense,
    setMinSpeed,
    setMinHp,
    setHeightRange,
    setWeightRange,
    urlSearch,
  ]);

  useEffect(() => {
    if (!hydrated || !hasAppliedUrl.current) return;
    if (suppressSerializeRef.current) {
      suppressSerializeRef.current = false;
      return;
    }

    const nextSearch = serializeHomeFilters({
      searchTerm,
      selectedTypes,
      selectedGeneration,
      sortBy,
      showCaughtOnly,
      showFavoritesOnly,
      isLegendary,
      isMythical,
      selectedEggGroups,
      selectedColors,
      selectedShapes,
      minBaseStats,
      minAttack,
      minDefense,
      minSpeed,
      minHp,
      heightRange,
      weightRange,
    });
    if (nextSearch === urlSearch) return;

    const currentParams = new URLSearchParams(urlSearch);
    const searchChanged = currentParams.get('q') !== (searchTerm.trim() || null);
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const updateUrl = () => {
      if (searchChanged) {
        router.replace(nextUrl, { scroll: false });
      } else {
        router.push(nextUrl, { scroll: false });
      }
      setUrlSearch(nextSearch);
    };

    if (searchChanged) {
      const timer = window.setTimeout(updateUrl, 300);
      return () => window.clearTimeout(timer);
    }

    updateUrl();
    return undefined;
  }, [
    hydrated,
    pathname,
    router,
    searchTerm,
    selectedTypes,
    selectedGeneration,
    sortBy,
    showCaughtOnly,
    showFavoritesOnly,
    isLegendary,
    isMythical,
    selectedEggGroups,
    selectedColors,
    selectedShapes,
    minBaseStats,
    minAttack,
    minDefense,
    minSpeed,
    minHp,
    heightRange,
    weightRange,
    urlSearch,
  ]);
}
