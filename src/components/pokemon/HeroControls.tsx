'use client';

import SearchBar from '@/components/pokemon/SearchBar';
import TypeFilter from '@/components/pokemon/TypeFilter';
import RegionFilter from '@/components/pokemon/RegionFilter';
import FavoriteToggle from '@/components/pokemon/FavoriteToggle';
import CaughtFilter from '@/components/pokemon/CaughtFilter';
import SortSelector from '@/components/pokemon/SortSelector';
import AdvancedFiltersWrapper from '@/components/pokemon/AdvancedFiltersWrapper';

export default function HeroControls() {
  return (
    <div className="w-full">
      <div className="mb-5 relative z-20 min-h-[88px]" id="hero-search-bar">
        <SearchBar />
      </div>

      <div className="codex-frame relative overflow-hidden p-5 md:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden="true" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-foreground/15 to-transparent" aria-hidden="true" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-foreground/15 to-transparent" aria-hidden="true" />

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-5">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-6 bg-foreground/30" />
            <h2 className="cat-no text-[0.65rem] text-muted-foreground">Filter the Index</h2>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="cat-no text-[0.65rem] text-muted-foreground/70">/ refine specimen entries</span>
          </div>
        </div>

        <div className="w-full flex min-h-[96px] flex-col md:flex-row items-stretch md:items-center justify-between gap-5 relative z-10">
          <div className="flex flex-wrap items-center justify-start gap-2.5">
            <FavoriteToggle />
            <CaughtFilter />
            <AdvancedFiltersWrapper />
          </div>
          <div className="hidden md:block h-px flex-1 mx-2 bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
          <div className="flex-shrink-0">
            <SortSelector />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-dashed border-foreground/15 w-full min-h-[120px] space-y-4 relative z-10">
          <RegionFilter />
          <TypeFilter />
        </div>
      </div>
    </div>
  );
}
