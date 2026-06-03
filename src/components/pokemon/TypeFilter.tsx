'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { TYPE_COLORS } from '@/types/pokemon';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function TypeFilter() {
  const selectedTypes = usePrimeDexStore(s => s.selectedTypes);
  const toggleType = usePrimeDexStore(s => s.toggleType);
  const setSelectedTypes = usePrimeDexStore(s => s.setSelectedTypes);
  const types = Object.keys(TYPE_COLORS);
  const { t } = useTranslation();

  return (
    <div
      className="w-full overflow-x-auto pb-8 pt-4 scrollbar-hide"
    >
      <div className="flex flex-nowrap lg:flex-wrap gap-2 justify-start lg:justify-center px-4 min-w-max lg:min-w-0 mx-auto max-w-7xl">
        {selectedTypes.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedTypes([])}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-foreground/80 bg-destructive/10 border border-destructive/20 rounded-full hover:bg-destructive/20 hover:text-destructive transition-all duration-300 whitespace-nowrap overflow-hidden backdrop-blur-xl"
            aria-label={t('filters.clear_types', { count: selectedTypes.length })}
          >
            <X className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">{t('filters.clear_types', { count: selectedTypes.length })}</span>
          </button>
        )}

        {types.map((type) => {
          const isActive = selectedTypes.includes(type);
          const color = TYPE_COLORS[type];
          const label = t(`types.${type}`);

          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-label={label}
              className={cn(
                "relative px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-400 overflow-hidden group border hover:scale-105 active:scale-95",
                isActive
                  ? "text-primary-foreground border-transparent"
                  : "bg-card/50 backdrop-blur-xl text-foreground/70 hover:text-foreground/90 border-border/50 hover:border-border/70"
              )}
              style={isActive ? {
                backgroundColor: color,
                boxShadow: `0 4px 20px -4px ${color}80, inset 0 1px 0 rgba(255,255,255,0.2)`,
              } : {}}
            >
              {/* Hover color preview */}
              {!isActive && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-400 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}

              {/* Inner glow for active */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
              )}

              <span className="relative z-10 flex items-center gap-2">
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground shadow-sm" />
                )}
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
