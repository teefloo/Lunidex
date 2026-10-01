'use client';

import SearchBar from '@/components/pokemon/SearchBar';
import FavoriteToggle from '@/components/pokemon/FavoriteToggle';
import CaughtFilter from '@/components/pokemon/CaughtFilter';
import SortSelector from '@/components/pokemon/SortSelector';
import AdvancedFiltersWrapper from '@/components/pokemon/AdvancedFiltersWrapper';
import { usePokemonFilterUrl } from '@/hooks/usePokemonFilterUrl';

export default function HeroControls() {
  usePokemonFilterUrl();

  return (
    <div className="pokedex-controls flex w-full flex-col gap-3">
      <div className="pokedex-search-stage relative z-20" id="hero-search-bar">
        <SearchBar />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <FavoriteToggle className="w-full sm:w-auto" />
          <AdvancedFiltersWrapper className="w-full sm:w-auto" />
        </div>
        <CaughtFilter className="w-full sm:w-auto" />
        <div className="sm:ml-auto">
          <SortSelector />
        </div>
      </div>
    </div>
  );
}
