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
  const setSearchTerm = usePrimeDexStore((state) => state.setSearchTerm);
  const setSelectedTypes = usePrimeDexStore((state) => state.setSelectedTypes);
  const setSelectedGeneration = usePrimeDexStore((state) => state.setSelectedGeneration);
  const setSortBy = usePrimeDexStore((state) => state.setSortBy);
  const setShowCaughtOnly = usePrimeDexStore((state) => state.setShowCaughtOnly);
  const setShowFavoritesOnly = usePrimeDexStore((state) => state.setShowFavoritesOnly);
  const [urlSearch, setUrlSearch] = useState('');
  const hasAppliedUrl = useRef(false);

  useEffect(() => {
    const syncFromLocation = () => setUrlSearch(window.location.search.slice(1));
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    if (!hydrated || hasAppliedUrl.current) return;

    const parsed = parseHomeFilters(new URLSearchParams(urlSearch));
    if (parsed.q !== undefined) setSearchTerm(parsed.q);
    if (parsed.types !== undefined) setSelectedTypes(parsed.types);
    if (parsed.gen !== undefined) setSelectedGeneration(parsed.gen);
    if (parsed.sort !== undefined) setSortBy(parsed.sort as HomeSortValue);
    if (parsed.view !== undefined) setShowCaughtOnly(parsed.view === 'missing' ? 'uncaught' : parsed.view);
    if (parsed.fav !== undefined) setShowFavoritesOnly(parsed.fav);

    hasAppliedUrl.current = true;
  }, [
    hydrated,
    setSearchTerm,
    setSelectedTypes,
    setSelectedGeneration,
    setSortBy,
    setShowCaughtOnly,
    setShowFavoritesOnly,
    urlSearch,
  ]);

  useEffect(() => {
    if (!hydrated || !hasAppliedUrl.current) return;

    const nextSearch = serializeHomeFilters({
      searchTerm,
      selectedTypes,
      selectedGeneration,
      sortBy,
      showCaughtOnly,
      showFavoritesOnly,
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
    urlSearch,
  ]);
}
