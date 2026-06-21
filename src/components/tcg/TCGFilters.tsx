'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type ComponentType, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
  Filter,
  RotateCcw,
  Box,
  Trophy,
  Sparkles,
  Shield,
  Zap,
  BadgeDollarSign,
  PenLine,
} from 'lucide-react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { TCGCardCategoryFilter, TCGCardFilters, TCGFilterOptions } from '@/types/tcg';
import {
  DEFAULT_TCG_CARD_FILTERS,
  TCG_ENERGY_TYPES,
  TCG_POKEMON_STAGES,
  TCG_POKEMON_TYPES,
  TCG_TRAINER_TYPES,
  getFilterOptions,
  getRaritiesForSet,
} from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { PokeballIcon } from '@/components/ui/PokeballIcon';
import { getCanonicalTcgRarity, isSameTcgRarity } from '@/lib/tcg-rarity';

interface TCGFiltersProps {
  filters: TCGCardFilters;
  onChange: (filters: TCGCardFilters) => void;
  mode?: 'simple' | 'advanced';
  onSimpleSetChange?: (setId: string) => void;
  onSimpleCategoryChange?: (category: TCGCardCategoryFilter) => void;
  onSimpleRarityChange?: (rarity: string) => void;
  autoApplyInitialSet?: boolean;
}

export function TCGFilters({
  filters,
  onChange,
  mode = 'advanced',
  onSimpleSetChange,
  onSimpleRarityChange,
  autoApplyInitialSet = true,
}: TCGFiltersProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { language, systemLanguage } = usePrimeDexStore();
  const [activeSection, setActiveSection] = useState<'set' | 'rarity' | 'pokemon' | 'trainer' | 'energy' | 'research' | null>('set');
  const searchTimeoutRef = useRef<number | null>(null);
  const didApplyInitialSetRef = useRef(false);

  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const { data: filterOptions, isLoading } = useQuery<TCGFilterOptions>({
    queryKey: tcgKeys.filterOptions(resolvedLang),
    queryFn: () => getFilterOptions(resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

  const selectedSet = filters.selectedSet || null;
  const shouldFetchSetRarities = mounted && !!selectedSet && (
    mode === 'simple'
    || activeSection === 'rarity'
    || Boolean(filters.selectedRarity)
  );
  const { data: setRarities = [], isLoading: raritiesLoading } = useQuery<string[]>({
    queryKey: tcgKeys.rarities(selectedSet, resolvedLang),
    queryFn: () => getRaritiesForSet(selectedSet as string, resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: shouldFetchSetRarities,
  });

  // Assumes `value` matches the type expected by `key` — callers are internal filter controls only.
  const updateFilter = useCallback(
    (key: keyof TCGCardFilters, value: TCGCardFilters[keyof TCGCardFilters]) => {
      onChange({ ...filters, [key]: value } as TCGCardFilters);
    },
    [filters, onChange],
  );

  const clearSearchTimeout = useCallback(() => {
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  const scheduleSearchTerm = useCallback(
    (value: string) => {
      clearSearchTimeout();
      searchTimeoutRef.current = window.setTimeout(() => {
        updateFilter('searchTerm', value.trim() ? value.trim() : undefined);
        searchTimeoutRef.current = null;
      }, 250);
    },
    [clearSearchTimeout, updateFilter],
  );

  const clearSearchTerm = useCallback(() => {
    clearSearchTimeout();
    updateFilter('searchTerm', undefined);
  }, [clearSearchTimeout, updateFilter]);

  const setOptions = useMemo(() => {
    const sets = filterOptions?.sets ?? [];
    if (sets.length === 0) return [];

    const hasReleaseDates = sets.some((set) => Boolean(set.releaseDate));
    if (!hasReleaseDates) {
      return [...sets].reverse();
    }

    return [...sets].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : Number.NEGATIVE_INFINITY;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : Number.NEGATIVE_INFINITY;
      return dateB - dateA;
    });
  }, [filterOptions?.sets]);

  const latestSetId = useMemo(() => {
    const sets = filterOptions?.sets ?? [];
    let latestId: string | null = null;
    let latestTime = Number.NEGATIVE_INFINITY;

    for (const set of sets) {
      if (!set.releaseDate) continue;
      const time = new Date(set.releaseDate).getTime();
      if (Number.isNaN(time)) continue;
      if (time > latestTime) {
        latestTime = time;
        latestId = set.id;
      }
    }

    return latestId ?? setOptions[0]?.id ?? null;
  }, [filterOptions?.sets, setOptions]);

  const clearAllFilters = useCallback(() => {
    clearSearchTimeout();
    onChange({
      ...DEFAULT_TCG_CARD_FILTERS,
      searchTerm: undefined,
      selectedSet: latestSetId,
      selectedRarity: null,
      selectedTypes: [],
      selectedPhase: null,
      selectedTrainerTypes: [],
      selectedEnergyTypes: [],
      minHp: undefined,
      maxHp: undefined,
      illustrator: undefined,
      regulationMark: undefined,
      legalities: [],
      priceMin: undefined,
      priceMax: undefined,
      releaseStart: undefined,
      releaseEnd: undefined,
      ownedState: 'all',
    });
    didApplyInitialSetRef.current = true;
    setActiveSection('set');
  }, [clearSearchTimeout, latestSetId, onChange]);

  const buildUniqueRarityOptions = useCallback((values: string[]) => {
    const seen = new Set<string>();

    return values.filter((rarity) => {
      const key = getCanonicalTcgRarity(rarity);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, []);

  const allRarityOptions = useMemo(() => {
    return buildUniqueRarityOptions(filterOptions?.rarities ?? []).sort((a, b) => a.localeCompare(b));
  }, [buildUniqueRarityOptions, filterOptions?.rarities]);

  const rarityOptions = useMemo(() => {
    const source = selectedSet ? setRarities : allRarityOptions;
    return buildUniqueRarityOptions(source).sort((a, b) => a.localeCompare(b));
  }, [allRarityOptions, buildUniqueRarityOptions, selectedSet, setRarities]);

  const rarityOptionsReady = selectedSet ? !raritiesLoading : Boolean(filterOptions);

  useEffect(() => {
    return () => clearSearchTimeout();
  }, [clearSearchTimeout]);

  useEffect(() => {
    if (mode === 'simple') return;
    if (!autoApplyInitialSet) return;
    if (!didApplyInitialSetRef.current && mounted && latestSetId && filters.selectedSet == null) {
      didApplyInitialSetRef.current = true;
      onChange({
        ...filters,
        selectedSet: latestSetId,
      });
    }
  }, [autoApplyInitialSet, filters, latestSetId, mounted, mode, onChange]);

  useEffect(() => {
    if (
      filters.selectedRarity &&
      rarityOptionsReady &&
      !rarityOptions.some((rarity) => isSameTcgRarity(rarity, filters.selectedRarity))
    ) {
      onChange({ ...filters, selectedRarity: null });
    }
  }, [filters, onChange, rarityOptions, rarityOptionsReady]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.searchTerm ? 1 : 0,
      filters.selectedCategory && filters.selectedCategory !== 'all' ? 1 : 0,
      filters.selectedSet ? 1 : 0,
      filters.selectedRarity ? 1 : 0,
      filters.selectedTypes?.length ?? 0,
      filters.selectedPhase ? 1 : 0,
      filters.selectedTrainerTypes?.length ?? 0,
      filters.selectedEnergyTypes?.length ?? 0,
      typeof filters.minHp === 'number' ? 1 : 0,
      typeof filters.maxHp === 'number' ? 1 : 0,
      filters.illustrator ? 1 : 0,
      filters.regulationMark ? 1 : 0,
      filters.legalities?.length ?? 0,
      typeof filters.priceMin === 'number' ? 1 : 0,
      typeof filters.priceMax === 'number' ? 1 : 0,
      filters.releaseStart ? 1 : 0,
      filters.releaseEnd ? 1 : 0,
      filters.ownedState && filters.ownedState !== 'all' ? 1 : 0,
    ].reduce((count, value) => count + value, 0);
  }, [filters]);

  const pokemonTypes = filterOptions?.pokemonTypes ?? TCG_POKEMON_TYPES;
  const trainerTypes = filterOptions?.trainerTypes ?? TCG_TRAINER_TYPES;
  const energyTypes = filterOptions?.energyTypes ?? TCG_ENERGY_TYPES;
  const stages = filterOptions?.stages ?? TCG_POKEMON_STAGES;

  const phaseTranslationKeys: Record<string, string> = useMemo(
    () => ({
      Basic: 'tcg.phase_basic',
      Stage1: 'tcg.phase_stage_1',
      Stage2: 'tcg.phase_stage_2',
      LevelX: 'tcg.phase_level_x',
      V: 'tcg.phase_v',
      VSTAR: 'tcg.phase_vstar',
      VMAX: 'tcg.phase_vmax',
      EX: 'tcg.phase_ex',
      GX: 'tcg.phase_gx',
      MEGA: 'tcg.phase_mega',
    }),
    [],
  );

  const getStageLabel = useCallback(
    (stage: string) => {
      const key = phaseTranslationKeys[stage];
      return key ? t(key) : stage;
    },
    [phaseTranslationKeys, t],
  );

  const getPokemonTypeLabel = useCallback(
    (type: string) => {
      const labelKey: Record<string, string> = {
        Colorless: 'tcg.pokemon_type_colorless',
        Fire: 'tcg.pokemon_type_fire',
        Water: 'tcg.pokemon_type_water',
        Lightning: 'tcg.pokemon_type_lightning',
        Grass: 'tcg.pokemon_type_grass',
        Fighting: 'tcg.pokemon_type_fighting',
        Psychic: 'tcg.pokemon_type_psychic',
        Darkness: 'tcg.pokemon_type_darkness',
        Dragon: 'tcg.pokemon_type_dragon',
        Fairy: 'tcg.pokemon_type_fairy',
        Metal: 'tcg.pokemon_type_metal',
      };

      return labelKey[type] ? t(labelKey[type]) : type;
    },
    [t],
  );

  const getTrainerTypeLabel = useCallback(
    (type: string) => {
      const labelKey: Record<string, string> = {
        Supporter: 'tcg.trainer_type_supporter',
        Item: 'tcg.trainer_type_item',
        Stadium: 'tcg.trainer_type_stadium',
        Tool: 'tcg.trainer_type_tool',
        'Ace Spec': 'tcg.trainer_type_ace_spec',
        'Technical Machine': 'tcg.trainer_type_technical_machine',
        'Goldenrod Game Corner': 'tcg.trainer_type_goldenrod_game_corner',
        'Rocket\'s Secret Machine': 'tcg.trainer_type_rockets_secret_machine',
      };

      return labelKey[type] ? t(labelKey[type]) : type;
    },
    [t],
  );

  const getEnergyTypeLabel = useCallback(
    (type: string) => {
      switch (type) {
        case 'Basic':
          return t('tcg.energy_type_basic');
        case 'Special':
          return t('tcg.energy_type_special');
        default:
          return type;
      }
    },
    [t],
  );

  if (mode === 'simple') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-4"
      >
        <div className="rounded-sm border border-border/40 bg-card/45 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">
              {t('tcg.simple_filters_title')}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/30">
              {activeFilterCount > 0 ? t('tcg.active_filters', { count: activeFilterCount }) : t('tcg.simple_filters_hint_compact')}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                {t('tcg.filter_set')}
              </div>
              <div className="max-h-56 overflow-y-auto pr-1 scrollbar-premium">
                <div className="space-y-2">
                  {setOptions.map((set) => {
                    const isActive = filters.selectedSet === set.id;
                    return (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => {
                          onSimpleSetChange?.(set.id);
                          if (!onSimpleSetChange) {
                            updateFilter('selectedSet', isActive ? null : set.id);
                          }
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left text-xs font-bold transition-colors',
                          isActive
                            ? 'border-primary/35 bg-primary/12 text-primary'
                            : 'border-border/45 bg-card/45 text-foreground/60 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                        )}
                      >
                        <span className="min-w-0 truncate">{set.name}</span>
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.18em] text-foreground/35">
                          {set.totalCards}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                {t('tcg.filter_rarity')}
              </div>
              <div className="flex flex-wrap gap-2">
                {rarityOptions.length === 0 ? (
                  <p className="text-[10px] italic text-foreground/30">
                    {t(selectedSet ? 'tcg.no_rarities_in_set' : 'tcg.no_rarities')}
                  </p>
                ) : (
                  rarityOptions.map((rarity) => {
                    const isActive = isSameTcgRarity(filters.selectedRarity, rarity);
                    return (
                      <button
                        key={rarity}
                        type="button"
                        onClick={() => updateFilter('selectedRarity', isActive ? null : rarity)}
                        className={cn(
                          'rounded-sm border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-colors',
                          isActive
                            ? 'border-amber-400/35 bg-amber-500/15 text-amber-300'
                            : 'border-border/45 bg-card/45 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                        )}
                      >
                        {rarity}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/30">
              {t('tcg.simple_filters_summary')}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/45 bg-card/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/55"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('filters.reset')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full space-y-4"
    >
      <div className="glass-surface rounded-sm p-4">
        <CatalogSearchInput
          key={filters.searchTerm ?? '__empty__'}
          initialValue={filters.searchTerm || ''}
          onChange={scheduleSearchTerm}
          onClear={clearSearchTerm}
          placeholder={t('tcg.search_placeholder')}
          clearLabel={t('search.clear')}
        />

        <div className="mt-4 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>{t('tcg.catalog_filters')}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex min-w-[4.25rem] items-center justify-center rounded-sm border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] leading-none whitespace-nowrap tabular-nums text-primary">
                {t('tcg.active_filters', { count: activeFilterCount })}
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45 transition-colors hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('filters.reset')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <FilterSection
          icon={Box}
          title={t('tcg.filter_set')}
          isOpen={activeSection === 'set'}
          onToggle={() => setActiveSection(activeSection === 'set' ? null : 'set')}
          badge={filters.selectedSet ? filters.selectedSet.toUpperCase() : null}
        >
          <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-2 scrollbar-premium">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-sm bg-card/50" />
              ))
            ) : (
              setOptions.map((set) => {
                const isActive = filters.selectedSet === set.id;
                const logoSrc = resolveTcgdexAssetSrc(set.logo) || resolveTcgdexAssetSrc(set.symbol);

                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => updateFilter('selectedSet', isActive ? null : set.id)}
                    className={cn(
                      'group relative flex items-center gap-3 overflow-hidden rounded-sm border p-3 text-left transition-all duration-300',
                      isActive
                        ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_30px_rgba(227,53,13,0.14)]'
                        : 'border-border/40 bg-card/35 text-foreground/65 hover:border-border/70 hover:bg-card/60 hover:text-foreground',
                    )}
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-border/40 bg-muted/50 p-2">
                      {logoSrc ? (
                        <Image
                          src={logoSrc}
                          alt={set.name}
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-sm bg-gradient-to-br from-primary/10 via-white/[0.03] to-transparent text-primary/70">
                          <PokeballIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-black uppercase tracking-tight">
                          {set.name}
                        </span>
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.18em] text-foreground/30">
                          {set.releaseDate ? new Date(set.releaseDate).getFullYear() : set.id.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 opacity-50">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em]">{set.id}</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-current" />
                        <span className="text-[9px] font-black tabular-nums">
                          {set.totalCards} {t('tcg.cards')}
                        </span>
                      </div>
                    </div>

                    {isActive && <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary animate-pulse" />}
                  </button>
                );
              })
            )}
          </div>
        </FilterSection>

        <FilterSection
          icon={Trophy}
          title={t('tcg.filter_rarity')}
          isOpen={activeSection === 'rarity'}
          onToggle={() => setActiveSection(activeSection === 'rarity' ? null : 'rarity')}
          badge={filters.selectedRarity}
        >
          <div className="flex flex-wrap gap-2">
            {raritiesLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-8 w-20 animate-pulse rounded-sm bg-card/50" />
              ))
            ) : rarityOptions.length === 0 ? (
              <p className="text-[10px] italic text-foreground/30">{t(selectedSet ? 'tcg.no_rarities_in_set' : 'tcg.no_rarities')}</p>
            ) : (
              rarityOptions.map((rarity) => {
                const isActive = isSameTcgRarity(filters.selectedRarity, rarity);
                return (
                  <button
                    key={rarity}
                    type="button"
                    onClick={() => {
                      onSimpleRarityChange?.(rarity);
                      if (!onSimpleRarityChange) {
                        updateFilter('selectedRarity', isActive ? null : rarity);
                      }
                    }}
                    className={cn(
                      'rounded-sm border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all min-h-[44px]',
                      isActive
                        ? 'border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.18)]'
                        : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                    )}
                  >
                    {rarity}
                  </button>
                );
              })
            )}
          </div>
        </FilterSection>

        <FilterSection
          icon={Sparkles}
          title={t('tcg.filter_pokemon')}
          isOpen={activeSection === 'pokemon'}
          onToggle={() => setActiveSection(activeSection === 'pokemon' ? null : 'pokemon')}
          badge={filters.selectedTypes?.length ? String(filters.selectedTypes.length) : null}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {pokemonTypes.map((type) => {
                const isActive = filters.selectedTypes?.includes(type) ?? false;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const nextTypes = filters.selectedTypes ?? [];
                      updateFilter(
                        'selectedTypes',
                        isActive
                          ? nextTypes.filter((entry) => entry !== type)
                          : [...nextTypes, type],
                      );
                    }}
                    className={cn(
                      'rounded-sm border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all min-h-[44px]',
                      isActive
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.18)]'
                        : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                    )}
                  >
                    {getPokemonTypeLabel(type)}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.hp_min')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={typeof filters.minHp === 'number' ? filters.minHp : ''}
                  onChange={(event) => updateFilter('minHp', event.target.value ? Number(event.target.value) : undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.hp_max')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="340"
                  value={typeof filters.maxHp === 'number' ? filters.maxHp : ''}
                  onChange={(event) => updateFilter('maxHp', event.target.value ? Number(event.target.value) : undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {stages.map((stage) => {
                const isActive = filters.selectedPhase === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => updateFilter('selectedPhase', isActive ? null : stage)}
                    className={cn(
                      'rounded-sm border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all min-h-[44px]',
                      isActive
                        ? 'border-primary/40 bg-primary/20 text-primary shadow-[0_0_16px_rgba(227,53,13,0.18)]'
                        : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                    )}
                  >
                    {getStageLabel(stage)}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterSection>

        <FilterSection
          icon={Shield}
          title={t('tcg.filter_trainer')}
          isOpen={activeSection === 'trainer'}
          onToggle={() => setActiveSection(activeSection === 'trainer' ? null : 'trainer')}
          badge={filters.selectedTrainerTypes?.length ? String(filters.selectedTrainerTypes.length) : null}
        >
          <div className="flex flex-wrap gap-2">
            {trainerTypes.map((type) => {
              const isActive = filters.selectedTrainerTypes?.includes(type) ?? false;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const nextTypes = filters.selectedTrainerTypes ?? [];
                    updateFilter(
                      'selectedTrainerTypes',
                      isActive
                        ? nextTypes.filter((entry) => entry !== type)
                        : [...nextTypes, type],
                    );
                  }}
                  className={cn(
                    'rounded-sm border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all min-h-[44px]',
                    isActive
                      ? 'border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.18)]'
                      : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                  )}
                >
                  {getTrainerTypeLabel(type)}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection
          icon={Zap}
          title={t('tcg.filter_energy')}
          isOpen={activeSection === 'energy'}
          onToggle={() => setActiveSection(activeSection === 'energy' ? null : 'energy')}
          badge={filters.selectedEnergyTypes?.length ? String(filters.selectedEnergyTypes.length) : null}
        >
          <div className="flex flex-wrap gap-2">
            {energyTypes.map((type) => {
              const isActive = filters.selectedEnergyTypes?.includes(type) ?? false;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const nextTypes = filters.selectedEnergyTypes ?? [];
                    updateFilter(
                      'selectedEnergyTypes',
                      isActive
                        ? nextTypes.filter((entry) => entry !== type)
                        : [...nextTypes, type],
                    );
                  }}
                  className={cn(
                    'rounded-sm border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all min-h-[44px]',
                    isActive
                      ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.18)]'
                      : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                    )}
                  >
                    {getEnergyTypeLabel(type)}
                  </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection
          icon={BadgeDollarSign}
          title={t('tcg.filter_market')}
          isOpen={activeSection === 'research'}
          onToggle={() => setActiveSection(activeSection === 'research' ? null : 'research')}
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.illustrator', { defaultValue: 'Illustrator' })}
                </label>
                <input
                  type="text"
                  placeholder={t('tcg.illustrator_placeholder', { defaultValue: 'Any illustrator' })}
                  value={filters.illustrator ?? ''}
                  onChange={(event) => updateFilter('illustrator', event.target.value || undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.regulation', { defaultValue: 'Regulation mark' })}
                </label>
                <input
                  type="text"
                  placeholder={t('tcg.regulation_placeholder', { defaultValue: 'G, H, I...' })}
                  value={filters.regulationMark ?? ''}
                  onChange={(event) => updateFilter('regulationMark', event.target.value || undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.price_min', { defaultValue: 'Price min' })}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={typeof filters.priceMin === 'number' ? filters.priceMin : ''}
                  onChange={(event) => updateFilter('priceMin', event.target.value ? Number(event.target.value) : undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.price_max', { defaultValue: 'Price max' })}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="999"
                  value={typeof filters.priceMax === 'number' ? filters.priceMax : ''}
                  onChange={(event) => updateFilter('priceMax', event.target.value ? Number(event.target.value) : undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.release_start', { defaultValue: 'Release from' })}
                </label>
                <input
                  type="date"
                  value={filters.releaseStart ?? ''}
                  onChange={(event) => updateFilter('releaseStart', event.target.value || undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                  {t('tcg.release_end', { defaultValue: 'Release to' })}
                </label>
                <input
                  type="date"
                  value={filters.releaseEnd ?? ''}
                  onChange={(event) => updateFilter('releaseEnd', event.target.value || undefined)}
                  className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                {t('tcg.owned_state', { defaultValue: 'Collection state' })}
              </label>
              <select
                value={filters.ownedState ?? 'all'}
                onChange={(event) => updateFilter('ownedState', event.target.value)}
                className="h-10 w-full rounded-sm border border-border/50 bg-card/50 px-3 text-xs font-bold uppercase tracking-[0.14em] transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                <option value="all">{t('tcg.owned_all', { defaultValue: 'All cards' })}</option>
                <option value="owned">{t('tcg.owned_owned', { defaultValue: 'Owned' })}</option>
                <option value="wishlist">{t('tcg.owned_wishlist', { defaultValue: 'Wishlist' })}</option>
                <option value="missing">{t('tcg.owned_missing', { defaultValue: 'Missing' })}</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/30">
                <PenLine className="h-3.5 w-3.5 text-primary" />
                {t('tcg.legalities', { defaultValue: 'Legalities' })}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['standard', 'expanded', 'unlimited'] as const).map((state) => {
                  const isActive = filters.legalities?.includes(state) ?? false;
                  return (
                    <button
                      key={state}
                      type="button"
                      onClick={() => {
                        const next = filters.legalities ?? [];
                        updateFilter(
                          'legalities',
                          isActive ? next.filter((item) => item !== state) : [...next, state],
                        );
                      }}
                      className={cn(
                        'rounded-sm border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                        isActive
                          ? 'border-primary/40 bg-primary/20 text-primary shadow-[0_0_16px_rgba(227,53,13,0.18)]'
                          : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
                      )}
                    >
                      {state}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </FilterSection>
      </div>

      <div className="rounded-sm border border-border/40 bg-card/35 p-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">
        {t('tcg.catalog_filters_hint')}
      </div>
    </motion.div>
  );
}

interface FilterSectionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string | null;
}

function FilterSection({ icon: Icon, title, isOpen, onToggle, children, badge }: FilterSectionProps) {
  return (
    <div className={cn(
      'overflow-hidden rounded-sm border transition-all duration-300',
      isOpen
        ? 'border-border/60 bg-card/55 shadow-[0_18px_60px_rgba(0,0,0,0.2)]'
        : 'border-border/40 bg-card/25 hover:bg-card/50',
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-sm border', isOpen ? 'border-primary/20 bg-primary/10' : 'border-border/50 bg-card/35')}>
            <Icon className={cn('h-4 w-4', isOpen ? 'text-primary' : 'text-foreground/35')} />
          </span>
          <div className="min-w-0">
            <span className={cn('block text-[11px] font-black uppercase tracking-[0.18em]', isOpen ? 'text-foreground' : 'text-foreground/60')}>
              {title}
            </span>
            {badge && !isOpen && (
              <span className="mt-1 inline-flex rounded-sm border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
                {badge}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-foreground/20 transition-transform duration-300', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-4 pb-4">
              <div className="mb-4 h-px w-full bg-card/60" />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CatalogSearchInputProps {
  initialValue: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  clearLabel: string;
}

function CatalogSearchInput({ initialValue, onChange, onClear, placeholder, clearLabel }: CatalogSearchInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="relative group">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Search className="h-4 w-4 text-foreground/30 transition-colors group-focus-within:text-primary" />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          onChange(nextValue);
        }}
        className="w-full rounded-sm border border-border/50 bg-muted/40 py-3.5 pl-11 pr-11 text-sm text-foreground placeholder:text-foreground/30 transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            onClear();
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-foreground/30 transition-colors hover:text-foreground"
          aria-label={clearLabel}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function resolveTcgdexAssetSrc(asset?: string | null) {
  if (!asset) return null;
  if (asset.endsWith('.webp') || asset.endsWith('.png')) return asset;
  return `${asset}.webp`;
}

export type { TCGFiltersProps };
