'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Filter,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getFilterOptions, searchCards } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import type { TCGCard, TCGCardFilters } from '@/types/tcg';
import { parseTCGSearchState, serializeTCGSearchState } from '@/lib/tcg-research';
import { cn } from '@/lib/utils';
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { TCGCardItem } from './TCGCardItem';
import { TCGFilters } from './TCGFilters';
import { usePrimeDexStore } from '@/store/primedex';

const PAGE_SIZE = 24;

export function TCGResearchDesk() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = usePrimeDexStore();
  const parsedState = useMemo(() => parseTCGSearchState(searchParams), [searchParams]);
  const resolvedLang = mounted ? (language === 'auto' ? 'en' : language) : 'en';

  const [filters, setFilters] = useState<TCGCardFilters>(() => normalizeFilters({
    ...DEFAULT_TCG_CARD_FILTERS,
    ...parsedState.filters,
  }));
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimpleFiltersOpen, setIsSimpleFiltersOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [hasUserEditedFilters, setHasUserEditedFilters] = useState(Boolean(
    parsedState.filters.selectedSet
    || parsedState.filters.searchTerm
    || (parsedState.filters.selectedCategory && parsedState.filters.selectedCategory !== 'all')
    || parsedState.filters.selectedRarity
    || (parsedState.filters.selectedTypes?.length ?? 0) > 0
    || parsedState.filters.selectedPhase
    || (parsedState.filters.selectedTrainerTypes?.length ?? 0) > 0
    || (parsedState.filters.selectedEnergyTypes?.length ?? 0) > 0
    || typeof parsedState.filters.minHp === 'number'
    || typeof parsedState.filters.maxHp === 'number'
    || parsedState.filters.illustrator
    || parsedState.filters.regulationMark
    || (parsedState.filters.legalities?.length ?? 0) > 0
    || typeof parsedState.filters.priceMin === 'number'
    || typeof parsedState.filters.priceMax === 'number'
    || parsedState.filters.releaseStart
    || parsedState.filters.releaseEnd
    || (parsedState.filters.ownedState && parsedState.filters.ownedState !== 'all')
  ));

  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);

  const { data: filterOptions } = useQuery({
    queryKey: tcgKeys.filterOptions(resolvedLang),
    queryFn: () => getFilterOptions(resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

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

  const latestSet = setOptions[0] ?? null;
  const latestSetId = latestSet?.id ?? null;
  const effectiveFilters = useMemo(() => normalizeFilters({
    ...normalizedFilters,
    selectedSet: normalizedFilters.selectedSet ?? (hasUserEditedFilters ? null : latestSetId),
  }), [hasUserEditedFilters, latestSetId, normalizedFilters]);
  const selectedSet = setOptions.find((set) => set.id === effectiveFilters.selectedSet) ?? latestSet;
  const summarySetName = effectiveFilters.selectedSet ? selectedSet?.name ?? t('tcg.unknown') : null;

  useEffect(() => {
    const query = serializeTCGSearchState({
      filters: effectiveFilters,
      viewMode: 'visual',
      compare: [],
    });
    const current = searchParams.toString();
    if (query === current) return;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [effectiveFilters, pathname, router, searchParams]);

  const { data: cardsData, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: tcgKeys.catalog(effectiveFilters, resolvedLang, PAGE_SIZE),
    queryFn: async ({ pageParam = 1, signal }) => searchCards(effectiveFilters, resolvedLang, pageParam, PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  const cards = useMemo(() => cardsData?.pages.flatMap((page) => page.cards) ?? [], [cardsData]);
  const totalCards = cards.length;

  const updateFilters = useCallback((next: TCGCardFilters) => {
    setHasUserEditedFilters(true);
    setFilters(normalizeFilters(next));
  }, []);

  const updateSimpleSet = useCallback((setId: string) => {
    setHasUserEditedFilters(true);
    setFilters((current) => normalizeFilters({
      ...current,
      selectedSet: current.selectedSet === setId ? null : setId,
      selectedCategory: 'all',
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
    }));
  }, []);

  const updateSimpleCategory = useCallback((category: TCGCardFilters['selectedCategory']) => {
    setHasUserEditedFilters(true);
    setFilters((current) => {
      const currentCategory = current.selectedCategory ?? 'all';
      const resolvedCategory = currentCategory === category ? 'all' : category;
      const isPokemon = resolvedCategory === 'Pokemon';
      const isTrainer = resolvedCategory === 'Trainer';
      const isEnergy = resolvedCategory === 'Energy';

      return normalizeFilters({
        ...current,
        selectedCategory: resolvedCategory,
        selectedSet: null,
        selectedRarity: null,
        selectedTypes: isPokemon ? current.selectedTypes : [],
        selectedPhase: isPokemon ? current.selectedPhase : null,
        selectedTrainerTypes: isTrainer ? current.selectedTrainerTypes : [],
        selectedEnergyTypes: isEnergy ? current.selectedEnergyTypes : [],
        minHp: isPokemon ? current.minHp : undefined,
        maxHp: isPokemon ? current.maxHp : undefined,
      });
    });
  }, []);

  const updateSimpleRarity = useCallback((rarity: string) => {
    setHasUserEditedFilters(true);
    setFilters((current) => normalizeFilters({
      ...current,
      selectedRarity: current.selectedRarity === rarity ? null : rarity,
      selectedSet: null,
      selectedCategory: current.selectedCategory ?? 'all',
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setHasUserEditedFilters(true);
    setFilters({
      ...DEFAULT_TCG_CARD_FILTERS,
      selectedSet: null,
      selectedCategory: 'all',
      selectedRarity: null,
      searchTerm: undefined,
    });
  }, []);

  const openCard = useCallback((card: TCGCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  }, []);

  const openSimpleFilters = useCallback(() => setIsSimpleFiltersOpen(true), []);
  const openAdvancedFilters = useCallback(() => setIsAdvancedFiltersOpen(true), []);

  const applyQuickPreset = useCallback((preset: 'latest' | 'pokemon' | 'trainer' | 'pikachu') => {
    setHasUserEditedFilters(true);

    const resetQuickPresetFilters = (current: TCGCardFilters, next: Partial<TCGCardFilters>): TCGCardFilters => normalizeFilters({
      ...current,
      searchTerm: undefined,
      selectedSet: null,
      selectedCategory: 'all',
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
      ...next,
    });

    if (preset === 'latest') {
      setFilters((current) => resetQuickPresetFilters(current, {
        selectedSet: latestSetId ?? current.selectedSet ?? null,
      }));
      return;
    }

    if (preset === 'pokemon') {
      setFilters((current) => resetQuickPresetFilters(current, {
        selectedCategory: 'Pokemon',
      }));
      return;
    }

    if (preset === 'trainer') {
      setFilters((current) => resetQuickPresetFilters(current, {
        selectedCategory: 'Trainer',
      }));
      return;
    }

    setFilters((current) => resetQuickPresetFilters(current, {
      searchTerm: 'Pikachu',
      selectedCategory: 'Pokemon',
    }));
  }, [latestSetId]);

  return (
    <div className="space-y-6 pb-24">
      <DiscoveryHero
        title={t('tcg.discover_title', { defaultValue: 'Trouve une carte' })}
        subtitle={t('tcg.discover_subtitle', {
          defaultValue: 'Cherche une carte, explore les dernières extensions et ouvre les détails en un geste.',
        })}
        activeCategory={parsedState.filters.selectedCategory ?? 'all'}
        searchTerm={effectiveFilters.searchTerm ?? ''}
        latestSetName={latestSet?.name ?? t('tcg.unknown')}
        onSearchChange={(value) => updateFilters({
          ...effectiveFilters,
          searchTerm: value.trim() ? value : undefined,
          selectedSet: value.trim() ? null : effectiveFilters.selectedSet,
        })}
        onClearSearch={() => updateFilters({ ...effectiveFilters, searchTerm: undefined, selectedSet: null })}
        onOpenFilters={openSimpleFilters}
        onOpenAdvanced={openAdvancedFilters}
        onQuickPreset={applyQuickPreset}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto pr-1 scrollbar-premium">
              <SimpleFilterBar
              filters={effectiveFilters}
                onChange={updateFilters}
                onSimpleSetChange={updateSimpleSet}
                onSimpleCategoryChange={updateSimpleCategory}
                onSimpleRarityChange={updateSimpleRarity}
            />
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <ResultSummary
            count={totalCards}
            activeSetName={summarySetName}
            isFetching={isFetching}
          />

          {isLoading ? (
            <CardGridSkeleton />
          ) : cards.length > 0 ? (
            <>
              <CardResults
                cards={cards}
                onCardClick={openCard}
              />

              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-border/50 bg-card/55 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/65 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                    {isFetchingNextPage
                      ? t('tcg.loading_more', { defaultValue: 'Chargement' })
                      : t('tcg.load_more_cards', { defaultValue: 'Voir plus' })}
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              onClear={clearFilters}
              onLatest={() => applyQuickPreset('latest')}
              onPikachu={() => applyQuickPreset('pikachu')}
            />
          )}
        </main>
      </div>

      <Sheet open={isSimpleFiltersOpen} onOpenChange={setIsSimpleFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] p-0 lg:hidden">
          <SheetHeader className="border-b border-border/50 px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-base font-black uppercase tracking-[0.2em]">
              <Filter className="h-4 w-4 text-primary" />
              {t('tcg.simple_filters_title', { defaultValue: 'Filtres simples' })}
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[78dvh] overflow-y-auto p-4">
            <SimpleFilterBar
              filters={effectiveFilters}
              onChange={updateFilters}
              onSimpleSetChange={updateSimpleSet}
              onSimpleCategoryChange={updateSimpleCategory}
              onSimpleRarityChange={updateSimpleRarity}
              onOpenAdvanced={() => {
                setIsSimpleFiltersOpen(false);
                setIsAdvancedFiltersOpen(true);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-[480px] p-0">
          <SheetHeader className="border-b border-border/50 px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-base font-black uppercase tracking-[0.2em]">
              <Wand2 className="h-4 w-4 text-primary" />
              {t('tcg.advanced_filters_title', { defaultValue: 'Options avancées' })}
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto p-4">
            <TCGFilters
              mode="advanced"
              filters={effectiveFilters}
              onChange={updateFilters}
            />
          </div>
        </SheetContent>
      </Sheet>

      <TCGCardDetailModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

function DiscoveryHero({
  title,
  subtitle,
  activeCategory,
  searchTerm,
  latestSetName,
  onSearchChange,
  onClearSearch,
  onOpenFilters,
  onOpenAdvanced,
  onQuickPreset,
}: {
  title: string;
  subtitle: string;
  activeCategory: TCGCardFilters['selectedCategory'];
  searchTerm: string;
  latestSetName: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenFilters: () => void;
  onOpenAdvanced: () => void;
  onQuickPreset: (preset: 'latest' | 'pokemon' | 'trainer' | 'pikachu') => void;
}) {
  return (
    <section className="page-surface px-5 py-6 sm:px-8 sm:py-7">
      <div className="space-y-4">
        <div className="page-eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          {latestSetName}
        </div>
        <div className="space-y-3">
          <h1 className="page-title text-4xl leading-none sm:text-5xl xl:text-6xl">
            {title}
          </h1>
          <p className="page-subtitle max-w-2xl">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="relative isolate">
          <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/45 bg-card/75 text-primary/80 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.45)]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Chercher une carte..."
            className="h-14 w-full rounded-[1.25rem] border border-border/55 bg-card/55 pl-14 pr-4 text-sm font-semibold text-foreground placeholder:text-foreground/30 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickPreset('latest')}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Dernières cartes
          </button>
          <button
            type="button"
            onClick={() => onQuickPreset('pokemon')}
            aria-pressed={activeCategory === 'Pokemon'}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/10 hover:text-emerald-500',
              activeCategory === 'Pokemon' && 'border-emerald-500/35 bg-emerald-500/15 text-emerald-500',
            )}
          >
            Pokémon
          </button>
          <button
            type="button"
            onClick={() => onQuickPreset('trainer')}
            aria-pressed={activeCategory === 'Trainer'}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-amber-500/25 hover:bg-amber-500/10 hover:text-amber-500',
              activeCategory === 'Trainer' && 'border-amber-500/35 bg-amber-500/15 text-amber-500',
            )}
          >
            Dresseur
          </button>
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary lg:hidden"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtres
          </button>
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Options avancees
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={onClearSearch}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45 transition-colors hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-500"
            >
              Effacer
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function SimpleFilterBar({
  filters,
  onChange,
  onOpenAdvanced,
  onSimpleSetChange,
  onSimpleCategoryChange,
  onSimpleRarityChange,
}: {
  filters: TCGCardFilters;
  onChange: (filters: TCGCardFilters) => void;
  onOpenAdvanced?: () => void;
  onSimpleSetChange?: (setId: string) => void;
  onSimpleCategoryChange?: (category: TCGCardFilters['selectedCategory']) => void;
  onSimpleRarityChange?: (rarity: string) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/50 bg-card/45 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">
            Filtres simples
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground/70">
            Les 3 choix les plus utiles.
          </div>
        </div>
        {onOpenAdvanced && (
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border/45 bg-card/55 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/55 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Avanc�
          </button>
        )}
      </div>

      <TCGFilters
        mode="simple"
        filters={filters}
        onChange={onChange}
        onSimpleSetChange={onSimpleSetChange}
        onSimpleCategoryChange={onSimpleCategoryChange}
        onSimpleRarityChange={onSimpleRarityChange}
      />
    </div>
  );
}

function ResultSummary({
  count,
  activeSetName,
  isFetching,
}: {
  count: number;
  activeSetName: string | null;
  isFetching: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/50 bg-card/45 px-4 py-3">
      <div className="space-y-1">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">
          {isFetching ? 'Actualisation des cartes' : 'Cartes trouvees'}
        </div>
        <div className="text-sm font-semibold text-foreground/70">
          {activeSetName ? `${formatCount(count)} cartes dans ${activeSetName}` : `${formatCount(count)} cartes`}
        </div>
      </div>
    </div>
  );
}

function CardResults({
  cards,
  onCardClick,
}: {
  cards: TCGCard[];
  onCardClick: (card: TCGCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
      {cards.map((card, index) => (
        <TCGCardItem key={card.id} card={card} index={index} onClick={onCardClick} />
      ))}
    </div>
  );
}

function EmptyState({
  onClear,
  onLatest,
  onPikachu,
}: {
  onClear: () => void;
  onLatest: () => void;
  onPikachu: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/50 bg-card/35 px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
      <h2 className="text-2xl font-black uppercase tracking-[0.16em] text-foreground">
        Aucun resultat
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-foreground/50">
        Essaie sans filtre, ou pars d’une carte connue pour retrouver rapidement ce que tu cherches.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 items-center rounded-full border border-border/45 bg-card/55 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          Effacer les filtres
        </button>
        <button
          type="button"
          onClick={onLatest}
          className="inline-flex h-11 items-center rounded-full border border-border/45 bg-card/55 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          Voir les derni�res cartes
        </button>
        <button
          type="button"
          onClick={onPikachu}
          className="inline-flex h-11 items-center rounded-full border border-border/45 bg-card/55 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          Chercher Pikachu
        </button>
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="aspect-[2.05/2.88] rounded-[1rem] border border-border/40 bg-card/45 animate-pulse"
        />
      ))}
    </div>
  );
}

function formatCount(count: number) {
  return new Intl.NumberFormat().format(count);
}

function normalizeFilters(filters: TCGCardFilters): TCGCardFilters {
  return {
    ...DEFAULT_TCG_CARD_FILTERS,
    ...filters,
    selectedCategory: filters.selectedCategory ?? 'all',
    selectedSet: filters.selectedSet ?? null,
    selectedRarity: filters.selectedRarity ?? null,
    selectedTypes: filters.selectedTypes ?? [],
    selectedPhase: filters.selectedPhase ?? null,
    selectedTrainerTypes: filters.selectedTrainerTypes ?? [],
    selectedEnergyTypes: filters.selectedEnergyTypes ?? [],
    legalities: filters.legalities ?? [],
    ownedState: filters.ownedState ?? 'all',
  };
}
