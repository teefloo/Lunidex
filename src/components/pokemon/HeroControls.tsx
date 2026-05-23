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
    <div className="mt-10 w-full max-w-5xl mx-auto">
      <div className="mb-5 relative z-20 min-h-[88px]" id="hero-search-bar">
        <SearchBar />
      </div>

      <div className="section-frame p-5 md:p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-500">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-foreground/10 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-foreground/10 to-transparent" />
        <div className="w-full flex min-h-[96px] flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <FavoriteToggle />
            <CaughtFilter />
            <AdvancedFiltersWrapper />
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent hidden md:block" />
          <div className="flex-shrink-0">
            <SortSelector />
          </div>
        </div>

        <div className="w-full min-h-[160px] space-y-4 relative z-10">
          <RegionFilter />
          <TypeFilter />
        </div>
      </div>
    </div>
  );
}
