'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';
import { X, Map } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const REGIONS = [
  { key: 'kanto', gen: '1' },
  { key: 'johto', gen: '2' },
  { key: 'hoenn', gen: '3' },
  { key: 'sinnoh', gen: '4' },
  { key: 'unova', gen: '5' },
  { key: 'kalos', gen: '6' },
  { key: 'alola', gen: '7' },
  { key: 'galar', gen: '8' },
  { key: 'paldea', gen: '9' },
];

export default function RegionFilter() {
  const selectedGeneration = usePrimeDexStore(s => s.selectedGeneration);
  const setSelectedGeneration = usePrimeDexStore(s => s.setSelectedGeneration);
  const { t } = useTranslation();

  return (
    <div 
      className="w-full pb-4 pt-2"
    >
      <div className="flex flex-nowrap items-center gap-2 md:gap-2.5 justify-start lg:justify-center px-4 mx-auto w-full max-w-7xl overflow-x-auto scrollbar-hide lg:flex-wrap">
        {/* Region label */}
        <div className="hidden sm:flex items-center gap-2 mr-1 px-3 py-2 bg-primary/10 rounded-full border border-primary/15 shrink-0">
          <Map className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">{t('regions.title')}</span>
        </div>

        {selectedGeneration && (
          <button
            type="button"
            onClick={() => setSelectedGeneration(null)}
            className="flex items-center justify-center shrink-0 gap-1 bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-full text-xs text-destructive hover:bg-destructive/20 transition-all duration-300 whitespace-nowrap backdrop-blur-xl min-h-[44px]"
            aria-label={t('filters.reset')}
          >
            <X className="w-3 h-3 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px]">{t('filters.reset')}</span>
          </button>
        )}
        
        {REGIONS.map((region) => {
          const isActive = selectedGeneration === parseInt(region.gen);
          const label = t(`regions.${region.key}`);
          
          return (
            <button
              key={region.key}
              type="button"
              onClick={() => setSelectedGeneration(isActive ? null : parseInt(region.gen))}
              aria-label={label}
              className={cn(
                "relative px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-400 overflow-hidden group border hover:scale-105 active:scale-95 min-h-[44px]",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary/50 shadow-[0_4px_20px_-4px_rgba(227,53,13,0.5)]"
                  : "bg-card/50 backdrop-blur-xl text-foreground/70 hover:text-foreground/90 border-border/50 hover:border-border/70"
              )}
            >
              {/* Hover glow */}
              {!isActive && (
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-400 rounded-full" />
              )}
              
              {/* Active inner shine */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
              )}
              
              <span className="relative z-10 flex items-center justify-center gap-2">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
