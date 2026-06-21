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
    <div className="w-full overflow-x-auto pb-8 pt-4 scrollbar-hide">
      <div className="flex flex-nowrap lg:flex-wrap gap-2 justify-start lg:justify-center px-4 min-w-max lg:min-w-0 mx-auto max-w-7xl">
        {selectedTypes.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedTypes([])}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/30 rounded-sm hover:bg-destructive/20 transition-all duration-100 whitespace-nowrap overflow-hidden min-h-[44px] shadow-[var(--shadow-pixel-sm)]"
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
                "relative px-5 py-3 rounded-sm text-[11px] font-black uppercase tracking-wider transition-all duration-100 border min-h-[44px] shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
                isActive
                  ? "text-primary-foreground border-transparent"
                  : "bg-card text-foreground/70 hover:text-foreground/90 border-border/60 hover:border-border"
              )}
              style={isActive ? {
                backgroundColor: color,
                boxShadow: `2px 2px 0 ${color}80`,
              } : {}}
            >
              {!isActive && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-100 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-primary-foreground" />
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
