'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { TYPE_COLORS } from '@/types/pokemon';
import { cn } from '@/lib/utils';
import {
  SlidersHorizontal,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { useTranslation } from '@/lib/i18n';

const GENERATIONS = [
  { id: 1, region: 'kanto' },
  { id: 2, region: 'johto' },
  { id: 3, region: 'hoenn' },
  { id: 4, region: 'sinnoh' },
  { id: 5, region: 'unova' },
  { id: 6, region: 'kalos' },
  { id: 7, region: 'alola' },
  { id: 8, region: 'galar' },
  { id: 9, region: 'paldea' },
];

const EGG_GROUPS = [
  'monster', 'bug', 'flying', 'field', 'fairy', 'grass', 'human-like',
  'water1', 'water2', 'water3', 'mineral', 'amorphous', 'dragon', 'no-eggs'
];

const COLORS = [
  'red', 'blue', 'yellow', 'green', 'black', 'brown', 'purple', 'gray', 'white', 'pink'
];

const SHAPES = [
  'ball', 'squiggle', 'fish', 'arms', 'blob', 'upright', 'legs',
  'wings', 'tentacles', 'heads', 'humanoid', 'bug-wings', 'armor'
];

export default function AdvancedFilters({ className }: { className?: string }) {
  const selectedTypes = usePrimeDexStore(s => s.selectedTypes);
  const toggleType = usePrimeDexStore(s => s.toggleType);
  const selectedGeneration = usePrimeDexStore(s => s.selectedGeneration);
  const setSelectedGeneration = usePrimeDexStore(s => s.setSelectedGeneration);
  const selectedEggGroups = usePrimeDexStore(s => s.selectedEggGroups);
  const toggleEggGroup = usePrimeDexStore(s => s.toggleEggGroup);
  const selectedColors = usePrimeDexStore(s => s.selectedColors);
  const toggleColor = usePrimeDexStore(s => s.toggleColor);
  const selectedShapes = usePrimeDexStore(s => s.selectedShapes);
  const toggleShape = usePrimeDexStore(s => s.toggleShape);
  const isLegendary = usePrimeDexStore(s => s.isLegendary);
  const setIsLegendary = usePrimeDexStore(s => s.setIsLegendary);
  const isMythical = usePrimeDexStore(s => s.isMythical);
  const setIsMythical = usePrimeDexStore(s => s.setIsMythical);
  const minBaseStats = usePrimeDexStore(s => s.minBaseStats);
  const setMinBaseStats = usePrimeDexStore(s => s.setMinBaseStats);
  const minAttack = usePrimeDexStore(s => s.minAttack);
  const setMinAttack = usePrimeDexStore(s => s.setMinAttack);
  const minDefense = usePrimeDexStore(s => s.minDefense);
  const setMinDefense = usePrimeDexStore(s => s.setMinDefense);
  const minSpeed = usePrimeDexStore(s => s.minSpeed);
  const setMinSpeed = usePrimeDexStore(s => s.setMinSpeed);
  const minHp = usePrimeDexStore(s => s.minHp);
  const setMinHp = usePrimeDexStore(s => s.setMinHp);
  const heightRange = usePrimeDexStore(s => s.heightRange);
  const setHeightRange = usePrimeDexStore(s => s.setHeightRange);
  const weightRange = usePrimeDexStore(s => s.weightRange);
  const setWeightRange = usePrimeDexStore(s => s.setWeightRange);
  const resetFilters = usePrimeDexStore(s => s.resetFilters);
  const { t } = useTranslation();

  const activeFiltersCount = [
    selectedTypes.length > 0,
    selectedGeneration !== null,
    selectedEggGroups.length > 0,
    selectedColors.length > 0,
    selectedShapes.length > 0,
    isLegendary !== null,
    isMythical !== null,
    minBaseStats > 0,
    minAttack > 0,
    minDefense > 0,
    minSpeed > 0,
    minHp > 0,
    heightRange[0] > 0 || heightRange[1] < 25,
    weightRange[0] > 0 || weightRange[1] < 1200
  ].filter(Boolean).length;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className={cn("relative glass-btn px-6 py-6 rounded-sm gap-2 group hover:border-primary/50 transition-all duration-300", className)}
          />
        }
      >
        <SlidersHorizontal className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
        <span className="font-bold uppercase tracking-widest text-xs">{t('filters.button')}</span>
        {activeFiltersCount > 0 && (
          <Badge
            variant="default"
            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 rounded-full bg-primary text-primary-foreground border-2 border-background animate-in zoom-in"
          >
            {activeFiltersCount}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent className="w-full bg-background/95  border-l border-border/60 flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col p-0 data-[side=right]:sm:max-w-none data-[side=right]:lg:w-[min(56rem,calc(100vw-1rem))]">
        <SheetHeader className="border-b border-border/40 p-5 pb-4 pr-16 sm:pr-20 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <SheetTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-primary" />
              {t('filters.title')}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFilters}
              className="hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
              title={t('filters.reset')}
              aria-label={t('filters.reset')}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
          <div className="grid gap-4 pb-6 xl:grid-cols-2">
            {/* Generation Filter */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2">
                {t('filters.generation')}
              </h4>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                {GENERATIONS.map((gen) => {
                  const isActive = selectedGeneration === gen.id;
                  const label = t(`generations.gen_${gen.id}`);
                  const regionLabel = t(`regions.${gen.region}`);
                  return (
                    <button
                      key={gen.id}
                      onClick={() => setSelectedGeneration(isActive ? null : gen.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-sm border transition-all duration-200 min-h-[64px]",
                        isActive
                          ? "bg-primary/20 border-primary text-foreground shadow-[0_0_15px_rgba(255,50,50,0.1)]"
                          : "bg-secondary/20 border-border/40 text-foreground/60 hover:border-border/70 hover:text-foreground"
                      )}
                    >
                      <span className="text-xs font-black">{label}</span>
                      <span className="text-[10px] font-medium opacity-60 uppercase">{regionLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Types Filter */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2">
                {t('filters.types')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(TYPE_COLORS).map((type) => {
                  const isActive = selectedTypes.includes(type);
                  const color = TYPE_COLORS[type];
                  const label = t(`types.${type}`);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-4 rounded-sm border transition-all duration-200 overflow-hidden group min-h-[56px]",
                        isActive
                          ? "text-primary-foreground border-transparent"
                          : "bg-secondary/20 border-border/40 text-foreground/60 hover:border-border/70 hover:text-foreground"
                      )}
                      style={isActive ? { backgroundColor: color } : {}}
                    >
                      {isActive && <Check className="w-3 h-3 relative z-10" />}
                      <span className="text-[10px] font-black uppercase tracking-wider relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legendary & Mythical Status */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                {t('filters.special')}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-sm border border-border/40">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">{t('filters.legendary')}</span>
                    <span className="text-[10px] text-foreground/40 font-medium">{t('filters.legendary_desc')}</span>
                  </div>
                   <Switch
                     id="filter-legendary"
                     checked={isLegendary === true}
                     onCheckedChange={(checked) => setIsLegendary(checked ? true : null)}
                   />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-sm border border-border/40">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">{t('filters.mythical')}</span>
                    <span className="text-[10px] text-foreground/40 font-medium">{t('filters.mythical_desc')}</span>
                  </div>
                  <Switch
                     id="filter-mythical"
                     checked={isMythical === true}
                     onCheckedChange={(checked) => setIsMythical(checked ? true : null)}
                   />
                </div>
              </div>
            </div>

            {/* Egg Groups Filter */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2">
                {t('filters.egg_groups')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {EGG_GROUPS.map((group) => {
                  const isActive = selectedEggGroups.includes(group);
                  const label = t(`egg_groups.${group}`);
                  return (
                    <button
                      key={group}
                      onClick={() => toggleEggGroup(group)}
                      className={cn(
                        "px-3 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-200 min-h-[44px]",
                        isActive
                          ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                          : "bg-secondary/20 border-border/40 text-foreground/60 hover:border-border/70 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colors Filter */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2">
                {t('filters.colors')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => {
                  const isActive = selectedColors.includes(color);
                  const label = t(`colors.${color}`);
                  return (
                    <button
                      key={color}
                      onClick={() => toggleColor(color)}
                      className={cn(
                        "px-3 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-200 min-h-[44px]",
                        isActive
                          ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                          : "bg-secondary/20 border-border/40 text-foreground/60 hover:border-border/70 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shapes Filter */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2">
                {t('filters.shapes')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {SHAPES.map((shape) => {
                  const isActive = selectedShapes.includes(shape);
                  const label = t(`shapes.${shape}`);
                  return (
                    <button
                      key={shape}
                      onClick={() => toggleShape(shape)}
                      className={cn(
                        "px-3 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-200 min-h-[44px]",
                        isActive
                          ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                          : "bg-secondary/20 border-border/40 text-foreground/60 hover:border-border/70 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Min BST Slider */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('filters.min_bst')}
                </h4>
                <Badge variant="secondary" className="bg-primary/10 text-foreground font-black border-none">
                  {minBaseStats}+ {t('detail.total')}
                </Badge>
              </div>
              <Slider
                value={[minBaseStats]}
                onValueChange={(val) => setMinBaseStats(Array.isArray(val) ? val[0] : val as number)}
                max={800}
                step={10}
                className="py-4"
              />
              <div className="flex justify-between text-[10px] sm:text-[11px] font-black text-foreground/20 uppercase tracking-widest">
                <span>0</span>
                <span>400 ({t('filters.avg')})</span>
                <span>800</span>
              </div>
            </div>

            {/* Individual Stats Sliders */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                {t('filters.min_stats')}
              </h4>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">{t('stats.hp_short')}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-foreground font-black border-none text-[10px]">
                      {minHp}+
                    </Badge>
                  </div>
                  <Slider
                    value={[minHp]}
                    onValueChange={(val) => setMinHp(Array.isArray(val) ? val[0] : val as number)}
                    max={255}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">{t('stats.attack_short')}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-foreground font-black border-none text-[10px]">
                      {minAttack}+
                    </Badge>
                  </div>
                  <Slider
                    value={[minAttack]}
                    onValueChange={(val) => setMinAttack(Array.isArray(val) ? val[0] : val as number)}
                    max={255}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">{t('stats.defense_short')}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-foreground font-black border-none text-[10px]">
                      {minDefense}+
                    </Badge>
                  </div>
                  <Slider
                    value={[minDefense]}
                    onValueChange={(val) => setMinDefense(Array.isArray(val) ? val[0] : val as number)}
                    max={255}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">{t('stats.speed_short')}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-foreground font-black border-none text-[10px]">
                      {minSpeed}+
                    </Badge>
                  </div>
                  <Slider
                    value={[minSpeed]}
                    onValueChange={(val) => setMinSpeed(Array.isArray(val) ? val[0] : val as number)}
                    max={255}
                    step={5}
                  />
                </div>
              </div>
            </div>

            {/* Height Slider */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('filters.height')}
                </h4>
                <div className="flex gap-2">
                  <Badge variant="outline" className="font-black border-border/60">{heightRange[0].toFixed(1)}m</Badge>
                  <span className="text-foreground/20">-</span>
                  <Badge variant="outline" className="font-black border-border/60">{heightRange[1].toFixed(1)}m</Badge>
                </div>
              </div>
              <Slider
                value={heightRange}
                onValueChange={(val) => {
                  const values = Array.isArray(val) ? val : [val];
                  const clamped = [
                    Math.min(values[0], values[1]),
                    Math.max(values[0], values[1])
                  ] as [number, number];
                  setHeightRange(clamped);
                }}
                max={25}
                step={0.1}
                className="py-4 cursor-pointer"
              />
            </div>

            {/* Weight Slider */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('filters.weight')}
                </h4>
                <div className="flex gap-2">
                  <Badge variant="outline" className="font-black border-border/60">{weightRange[0]}kg</Badge>
                  <span className="text-foreground/20">-</span>
                  <Badge variant="outline" className="font-black border-border/60">{weightRange[1]}kg</Badge>
                </div>
              </div>
              <Slider
                value={weightRange}
                onValueChange={(val) => {
                  const values = Array.isArray(val) ? val : [val];
                  const clamped = [
                    Math.min(values[0], values[1]),
                    Math.max(values[0], values[1])
                  ] as [number, number];
                  setWeightRange(clamped);
                }}
                max={1200}
                step={1}
                className="py-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border/40 bg-background/50 p-4 md:p-5">
          <SheetClose render={<Button className="h-12 w-full rounded-sm text-sm font-black uppercase tracking-widest shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98]" />}>
            {t('filters.apply')}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

