'use client';

import SearchBar from '@/components/pokemon/SearchBar';
import TypeFilter from '@/components/pokemon/TypeFilter';
import RegionFilter from '@/components/pokemon/RegionFilter';
import FavoriteToggle from '@/components/pokemon/FavoriteToggle';
import CaughtFilter from '@/components/pokemon/CaughtFilter';
import SortSelector from '@/components/pokemon/SortSelector';
import dynamic from 'next/dynamic';

const AdvancedFiltersWrapper = dynamic(() => import('@/components/pokemon/AdvancedFiltersWrapper'), {
  ssr: false,
});

export default function HeroControls() {
  return (
    <div className="w-full">
      <div className="mb-4 relative z-20 h-[64px]" id="hero-search-bar">
        <SearchBar />
      </div>

      <div className="w-full flex h-[64px] flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center justify-start gap-2.5">
          <FavoriteToggle />
          <CaughtFilter />
          <AdvancedFiltersWrapper />
        </div>
        <div className="flex-shrink-0">
          <SortSelector />
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-dashed border-foreground/15 w-full h-[120px] space-y-4 relative z-10">
        <RegionFilter />
        <TypeFilter />
      </div>
    </div>
  );
}
