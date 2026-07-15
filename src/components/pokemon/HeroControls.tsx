'use client';

import SearchBar from '@/components/pokemon/SearchBar';
import TypeFilter from '@/components/pokemon/TypeFilter';
import RegionFilter from '@/components/pokemon/RegionFilter';
import FavoriteToggle from '@/components/pokemon/FavoriteToggle';
import CaughtFilter from '@/components/pokemon/CaughtFilter';
import SortSelector from '@/components/pokemon/SortSelector';
import AdvancedFiltersWrapper from '@/components/pokemon/AdvancedFiltersWrapper';
import { usePokemonFilterUrl } from '@/hooks/usePokemonFilterUrl';

export default function HeroControls() {
  usePokemonFilterUrl();

  return (
    <div className="w-full">
      <div className="mb-4 relative z-20 h-[64px]" id="hero-search-bar">
        <SearchBar />
      </div>

      <div className="w-full flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {/* Mobile: 2-col grid (Favorites + Filters), then full-width Caught row */}
        <div className="flex flex-col gap-2 sm:flex sm:flex-row sm:items-center sm:gap-2.5">
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <FavoriteToggle className="w-full sm:w-auto" />
            <AdvancedFiltersWrapper className="w-full sm:w-auto" />
          </div>
          <CaughtFilter className="w-full sm:w-auto [&>button]:flex-1" />
        </div>
        <div className="flex-shrink-0">
          <SortSelector />
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-dashed border-foreground/15 w-full space-y-4 relative z-10">
        <RegionFilter />
        <TypeFilter />
      </div>
    </div>
  );
}
