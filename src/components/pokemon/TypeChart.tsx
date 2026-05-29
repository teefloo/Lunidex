'use client';

import { useMemo, useState, useCallback } from 'react';
import { TYPE_COLORS } from '@/types/pokemon';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Grid3x3, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_ORDER = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

type TypeName = typeof TYPE_ORDER[number];

const EFFECTIVENESS: Record<TypeName, Record<TypeName, number>> = {
  normal:   { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 0.5, ghost: 0, dragon: 1, dark: 1, steel: 0.5, fairy: 1 },
  fire:     { normal: 1, fire: 0.5, water: 0.5, electric: 1, grass: 2, ice: 2, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 2, rock: 0.5, ghost: 1, dragon: 0.5, dark: 1, steel: 2, fairy: 1 },
  water:    { normal: 1, fire: 2, water: 0.5, electric: 1, grass: 0.5, ice: 1, fighting: 1, poison: 1, ground: 2, flying: 1, psychic: 1, bug: 1, rock: 2, ghost: 1, dragon: 0.5, dark: 1, steel: 1, fairy: 1 },
  electric: { normal: 1, fire: 1, water: 2, electric: 0.5, grass: 0.5, ice: 1, fighting: 1, poison: 1, ground: 0, flying: 2, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 0.5, dark: 1, steel: 1, fairy: 1 },
  grass:    { normal: 1, fire: 0.5, water: 2, electric: 1, grass: 0.5, ice: 1, fighting: 1, poison: 0.5, ground: 2, flying: 0.5, psychic: 1, bug: 0.5, rock: 2, ghost: 1, dragon: 0.5, dark: 1, steel: 0.5, fairy: 1 },
  ice:      { normal: 1, fire: 0.5, water: 0.5, electric: 1, grass: 2, ice: 0.5, fighting: 1, poison: 1, ground: 2, flying: 2, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, dark: 1, steel: 0.5, fairy: 1 },
  fighting: { normal: 2, fire: 1, water: 1, electric: 1, grass: 1, ice: 2, fighting: 1, poison: 0.5, ground: 1, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dragon: 1, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { normal: 1, fire: 1, water: 1, electric: 1, grass: 2, ice: 1, fighting: 1, poison: 0.5, ground: 0.5, flying: 1, psychic: 1, bug: 1, rock: 0.5, ghost: 0.5, dragon: 1, dark: 1, steel: 0, fairy: 2 },
  ground:   { normal: 1, fire: 2, water: 1, electric: 2, grass: 0.5, ice: 1, fighting: 1, poison: 2, ground: 1, flying: 0, psychic: 1, bug: 0.5, rock: 2, ghost: 1, dragon: 1, dark: 1, steel: 2, fairy: 1 },
  flying:   { normal: 1, fire: 1, water: 1, electric: 0.5, grass: 2, ice: 1, fighting: 2, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 2, rock: 0.5, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 1 },
  psychic:  { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 2, poison: 2, ground: 1, flying: 1, psychic: 0.5, bug: 1, rock: 1, ghost: 1, dragon: 1, dark: 0, steel: 0.5, fairy: 1 },
  bug:      { normal: 1, fire: 0.5, water: 1, electric: 1, grass: 2, ice: 1, fighting: 0.5, poison: 0.5, ground: 1, flying: 0.5, psychic: 2, bug: 1, rock: 1, ghost: 0.5, dragon: 1, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { normal: 1, fire: 2, water: 1, electric: 1, grass: 1, ice: 2, fighting: 0.5, poison: 1, ground: 0.5, flying: 2, psychic: 1, bug: 2, rock: 1, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 1 },
  ghost:    { normal: 0, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 2, bug: 1, rock: 1, ghost: 2, dragon: 1, dark: 0.5, steel: 1, fairy: 1 },
  dragon:   { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, dark: 1, steel: 0.5, fairy: 0 },
  dark:     { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 0.5, poison: 1, ground: 1, flying: 1, psychic: 2, bug: 1, rock: 1, ghost: 2, dragon: 1, dark: 0.5, steel: 0.5, fairy: 0.5 },
  steel:    { normal: 1, fire: 0.5, water: 0.5, electric: 0.5, grass: 1, ice: 2, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 2, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 2 },
  fairy:    { normal: 1, fire: 0.5, water: 1, electric: 1, grass: 1, ice: 1, fighting: 2, poison: 0.5, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, dark: 2, steel: 0.5, fairy: 1 },
};

interface TypeChartProps {
  onTypeClick?: (type: string) => void;
}

export default function TypeChart({ onTypeClick }: TypeChartProps) {
  const { t } = useTranslation();
  const [hoveredCell, setHoveredCell] = useState<{ atk: string; def: string } | null>(null);
  const [lastHoveredCell, setLastHoveredCell] = useState<{ atk: string; def: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleCellHover = useCallback((atk: string, def: string) => {
    setHoveredCell({ atk, def });
    setLastHoveredCell({ atk, def });
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const isHighlighted = useCallback((type: string) => {
    if (!hoveredCell) return false;
    return type === hoveredCell.atk || type === hoveredCell.def;
  }, [hoveredCell]);

  const activeCell = hoveredCell || lastHoveredCell;

  const tooltipInfo = useMemo(() => {
    if (!activeCell) return null;
    const val = EFFECTIVENESS[activeCell.atk as TypeName][activeCell.def as TypeName];
    return { atk: activeCell.atk, def: activeCell.def, value: val };
  }, [activeCell]);

  const getCellBg = (value: number, atkType: string, defType: string): string => {
    if (hoveredCell && (atkType === hoveredCell.atk || defType === hoveredCell.def)) {
      if (value === 2) return 'bg-emerald-500/70';
      if (value === 0.5) return 'bg-red-500/50';
      if (value === 0) return 'bg-zinc-800/90';
      return 'bg-card/50';
    }
    if (value === 2) return 'bg-emerald-500/50';
    if (value === 0.5) return 'bg-red-500/35';
    if (value === 0) return 'bg-zinc-800/70';
    return 'bg-transparent';
  };

  const getCellTextColor = (value: number): string => {
    if (value === 2) return 'text-primary-foreground font-black';
    if (value === 0.5) return 'text-foreground/90 font-bold';
    if (value === 0) return 'text-zinc-400 font-bold';
    return 'text-foreground/15';
  };

  const getCellLabel = (value: number): string => {
    if (value === 2) return '2';
    if (value === 0.5) return '½';
    if (value === 0) return '0';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-surface rounded-2xl overflow-hidden relative"
    >
      {/* Header */}
      <div className="bg-card/55 dark:bg-card/50 border-b border-border/50 dark:border-border/40 p-5 md:p-6 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Grid3x3 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black tracking-tight">{t('types_page.type_chart')}</h3>
              <p className="text-foreground/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {t('types_page.type_chart_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl bg-card/50 border border-border/50 hover:bg-card/70 transition-colors"
            aria-label={collapsed ? t('types_page.expand') : t('types_page.collapse')}
          >
            {collapsed ? <ChevronDown className="w-4 h-4 text-foreground/50" /> : <ChevronUp className="w-4 h-4 text-foreground/50" />}
          </button>
        </div>

        {/* Active calculation tooltip - prominent, above legend */}
        {tooltipInfo ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 px-4 py-3 bg-primary/10 backdrop-blur-xl border border-primary/20 rounded-xl flex items-center gap-3 text-sm"
          >
            <span className="font-black uppercase text-xs px-2 py-1 rounded-md" style={{ backgroundColor: TYPE_COLORS[tooltipInfo.atk] + '30', color: TYPE_COLORS[tooltipInfo.atk] }}>
              {t(`types.${tooltipInfo.atk}`)}
            </span>
            <span className="text-foreground/30 text-lg">→</span>
            <span className="font-black uppercase text-xs px-2 py-1 rounded-md" style={{ backgroundColor: TYPE_COLORS[tooltipInfo.def] + '30', color: TYPE_COLORS[tooltipInfo.def] }}>
              {t(`types.${tooltipInfo.def}`)}
            </span>
            <span className="text-foreground/30 text-lg">=</span>
            <span className={cn(
              'font-black text-xl',
              tooltipInfo.value === 2 && 'text-emerald-400',
              tooltipInfo.value === 0.5 && 'text-red-400',
              tooltipInfo.value === 0 && 'text-zinc-500',
              tooltipInfo.value === 1 && 'text-foreground/50',
            )}>
              {tooltipInfo.value}×
            </span>
            <span className="text-xs text-foreground/40 ml-2">
              {tooltipInfo.value === 2 && t('types_page.super_effective')}
              {tooltipInfo.value === 0.5 && t('types_page.not_very_effective')}
              {tooltipInfo.value === 0 && t('types_page.no_effect')}
              {tooltipInfo.value === 1 && t('types_page.normal_damage')}
            </span>
          </motion.div>
        ) : (
          <div className="mt-4 px-4 py-2.5 bg-card/35 border border-border/40 rounded-xl text-[10px] font-bold text-foreground/30 uppercase tracking-wider">
            {t('types_page.hover_hint', { defaultValue: 'Hover over a cell to see the multiplier' })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { label: t('types_page.super_effective'), color: 'bg-emerald-500/60', textColor: 'text-emerald-400' },
            { label: t('types_page.normal_damage'), color: 'bg-card/50 border border-border/60', textColor: 'text-foreground/40' },
            { label: t('types_page.not_very_effective'), color: 'bg-red-500/40', textColor: 'text-red-400' },
            { label: t('types_page.no_effect'), color: 'bg-zinc-800/80', textColor: 'text-zinc-400' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-sm', item.color)} />
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', item.textColor)}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix */}
      <motion.div
        animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="bg-background/50 p-3 md:p-5">
          <div className="rounded-xl overflow-hidden border border-border/40">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-[750px]">
                <table className="w-full border-separate border-spacing-[2px]" style={{ tableLayout: 'fixed' }} role="grid" aria-label={t('types_page.type_chart')}>
                  <colgroup>
                    <col style={{ width: '80px' }} />
                    {TYPE_ORDER.map((_, i) => (
                      <col key={i} style={{ width: `${100 / TYPE_ORDER.length}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="p-2 sticky left-0 z-30 bg-background/95 backdrop-blur-md rounded-lg shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-center text-[9px] font-black text-foreground/30 uppercase tracking-wider gap-1">
                          <span className="text-primary/60">ATK</span>
                          <span className="text-foreground/15">╲</span>
                          <span className="text-foreground/40">DEF</span>
                        </div>
                      </th>
                      {TYPE_ORDER.map((defType) => (
                        <th
                          key={defType}
                          className={cn(
                            'p-0.5 transition-all duration-200',
                            isHighlighted(defType) && 'scale-110'
                          )}
                        >
                          <button
                            onClick={() => onTypeClick?.(defType)}
                            className={cn(
                              'w-full flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-200 group',
                              isHighlighted(defType) ? 'bg-card/70' : 'hover:bg-card/50'
                            )}
                            aria-label={t(`types.${defType}`)}
                          >
                            <div
                              className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full shadow-sm ring-1 ring-foreground/10 group-hover:ring-foreground/30 transition-all"
                              style={{ backgroundColor: TYPE_COLORS[defType] }}
                            />
                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tight text-foreground/50 leading-none truncate max-w-[2.5rem]">
                              {t(`types.${defType}`).slice(0, 4)}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_ORDER.map((atkType) => (
                      <tr key={atkType}>
                        <td className={cn(
                          'p-0.5 sticky left-0 z-20 bg-background/95 backdrop-blur-md transition-all duration-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]',
                          isHighlighted(atkType) && 'bg-card/50'
                        )}>
                          <button
                            onClick={() => onTypeClick?.(atkType)}
                            className={cn(
                              'flex items-center gap-1.5 py-2 px-2 rounded-lg transition-all duration-200 w-full group',
                              isHighlighted(atkType) ? 'bg-card/70' : 'hover:bg-card/50'
                            )}
                            aria-label={t(`types.${atkType}`)}
                          >
                            <div
                              className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full shadow-sm ring-1 ring-foreground/10 group-hover:ring-foreground/30 transition-all flex-shrink-0"
                              style={{ backgroundColor: TYPE_COLORS[atkType] }}
                            />
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tight text-foreground/60 leading-none truncate max-w-[3rem]">
                              {t(`types.${atkType}`).slice(0, 5)}
                            </span>
                          </button>
                        </td>
                        {TYPE_ORDER.map((defType) => {
                          const val = EFFECTIVENESS[atkType][defType];
                          const isHovered = hoveredCell?.atk === atkType && hoveredCell?.def === defType;
                          const isRowHighlighted = hoveredCell?.atk === atkType;
                          const isColHighlighted = hoveredCell?.def === defType;
                          
                          return (
                            <td
                              key={defType}
                              className="p-[1px]"
                              onMouseEnter={() => handleCellHover(atkType, defType)}
                              onMouseLeave={handleCellLeave}
                            >
                              <div
                                className={cn(
                                  'w-full aspect-square rounded-md flex items-center justify-center transition-all duration-150 cursor-default',
                                  getCellBg(val, atkType, defType),
                                  getCellTextColor(val),
                                  'text-xs sm:text-sm md:text-base',
                                  isHovered
                                    ? 'ring-2 ring-primary/60 scale-110 z-10 relative shadow-lg'
                                    : (isRowHighlighted || isColHighlighted)
                                      ? 'ring-1 ring-foreground/10'
                                      : '',
                                  val === 1 && 'border border-border/30'
                                )}
                                role="gridcell"
                                aria-label={`${t(`types.${atkType}`)} vs ${t(`types.${defType}`)}: ${val}×`}
                              >
                                {getCellLabel(val)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
