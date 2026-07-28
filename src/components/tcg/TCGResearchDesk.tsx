'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Search,
  Sparkles,
  Filter,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { persistLanguageCookie } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getFilterOptions, isTcgLangLimited, searchCards } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import type { TCGCard, TCGCardFilters, TCGSet } from '@/types/tcg';
import { parseTCGSearchState, serializeTCGSearchState } from '@/lib/tcg-research';
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { TCGCardItem } from './TCGCardItem';
import { TCGFilters } from './TCGFilters';
import { TCGDataLangBanner } from './TCGUnsupportedLangBanner';
import { usePrimeDexStore } from '@/store/primedex';

interface TCGResearchDeskProps {
  initialLatestSet?: {
    id: string;
    name: string;
  } | null;
}

export function TCGResearchDesk({ initialLatestSet = null }: TCGResearchDeskProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const visibleBatchSize = mounted && window.innerWidth < 768 ? 24 : 48;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, systemLanguage } = usePrimeDexStore();
  const tcgOwnedCards = usePrimeDexStore((s) => s.tcgOwnedCards);
  const tcgWishlistCards = usePrimeDexStore((s) => s.tcgWishlistCards);
  const ownedIds = useMemo(() => new Set(tcgOwnedCards), [tcgOwnedCards]);
  const wishlistIds = useMemo(() => new Set(tcgWishlistCards), [tcgWishlistCards]);
  const parsedState = useMemo(() => parseTCGSearchState(searchParams), [searchParams]);
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const [filters, setFilters] = useState<TCGCardFilters>(() => normalizeFilters({
    ...DEFAULT_TCG_CARD_FILTERS,
    ...parsedState.filters,
  }));
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [hasUserEditedFilters, setHasUserEditedFilters] = useState(Boolean(
    parsedState.filters.selectedSet
    || parsedState.filters.searchTerm
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
  const latestSetFallbackId = latestSetId ?? initialLatestSet?.id ?? null;
  const latestSetFallbackName = latestSet?.name ?? initialLatestSet?.name ?? t('tcg.unknown');
  const effectiveFilters = useMemo(() => normalizeFilters({
    ...normalizedFilters,
    selectedSet: normalizedFilters.selectedSet ?? (hasUserEditedFilters ? null : latestSetFallbackId),
  }), [hasUserEditedFilters, latestSetFallbackId, normalizedFilters]);
  const urlFilters = normalizedFilters;
  const selectedSet = setOptions.find((set) => set.id === effectiveFilters.selectedSet) ?? latestSet;
  const activeSetName = effectiveFilters.selectedSet
    ? selectedSet?.name ?? latestSetFallbackName
    : hasUserEditedFilters
      ? null
      : latestSetFallbackName;

  useEffect(() => {
    const query = serializeTCGSearchState({
      filters: urlFilters,
      viewMode: 'visual',
      compare: [],
    });
    const current = searchParams.toString();
    if (query === current) return;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, urlFilters]);

  const ownershipQueryKey = effectiveFilters.ownedState && effectiveFilters.ownedState !== 'all'
    ? { owned: tcgOwnedCards, wishlist: tcgWishlistCards }
    : undefined;
  const { data: cardsData, isLoading, isFetching, isError } = useQuery({
    queryKey: tcgKeys.catalog(effectiveFilters, resolvedLang, 48, ownershipQueryKey),
    queryFn: async ({ signal }) => searchCards(effectiveFilters, resolvedLang, 1, 48, signal, ownedIds, wishlistIds, true),
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  const cards = useMemo(() => cardsData?.cards ?? [], [cardsData]);
  const totalCards = cards.length;
  const [visibleCardCount, setVisibleCardCount] = useState(48);
  const loadMoreRef = useRef<HTMLButtonElement | null>(null);
  const visibleCards = useMemo(
    () => cards.slice(0, visibleCardCount),
    [cards, visibleCardCount],
  );
  const sortValue = `${effectiveFilters.sortBy ?? 'id'}-${effectiveFilters.sortOrder ?? 'asc'}`;

  useEffect(() => {
    const loadMoreButton = loadMoreRef.current;
    if (!loadMoreButton || visibleCardCount >= totalCards) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCardCount((current) => Math.min(current + visibleBatchSize, totalCards));
        }
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(loadMoreButton);
    return () => observer.disconnect();
  }, [totalCards, visibleCardCount, visibleBatchSize]);

  const updateFilters = useCallback((next: TCGCardFilters) => {
    setHasUserEditedFilters(true);
    setFilters(normalizeFilters(next));
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

  const openFilters = useCallback(() => setIsFiltersOpen(true), []);

  const applyQuickPreset = useCallback((preset: 'latest' | 'pikachu') => {
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
        selectedSet: latestSetFallbackId ?? current.selectedSet ?? null,
      }));
      return;
    }

    setFilters((current) => resetQuickPresetFilters(current, {
      searchTerm: 'Pikachu',
    }));
  }, [latestSetFallbackId]);

  return (
    <div className="space-y-6 pb-24">
      <TCGDataLangBanner resolvedLang={resolvedLang} />
      <DiscoveryHero
        title={t('tcg.discover_title')}
        subtitle={t('tcg.discover_subtitle')}
        searchTerm={effectiveFilters.searchTerm ?? ''}
        collections={setOptions}
        selectedCollectionId={effectiveFilters.selectedSet ?? null}
        sortValue={sortValue}
        onCollectionChange={(selectedSet) => updateFilters({
          ...effectiveFilters,
          selectedSet,
        })}
        onSortChange={(sortBy, sortOrder) => {
          updateFilters({
            ...effectiveFilters,
            sortBy,
            sortOrder,
          });
        }}
        onSearchChange={(value) => updateFilters({
          ...effectiveFilters,
          searchTerm: value.trim() ? value : undefined,
        })}
        onClearSearch={() => updateFilters({ ...effectiveFilters, searchTerm: undefined, selectedSet: null })}
        onOpenFilters={openFilters}
      />

      <div className="space-y-4">
        <main className="min-w-0 space-y-4">
          <ResultSummary
            count={totalCards}
            activeSetName={activeSetName}
            isFetching={isFetching}
          />

          {isLoading ? (
            <CardGridSkeleton />
          ) : isError ? (
            <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground/80">
              {t('tcg.catalog_load_error', { defaultValue: 'Unable to load cards. Please try again.' })}
            </p>
          ) : cards.length > 0 ? (
            <>
              <CardResults
                cards={visibleCards}
                onCardClick={openCard}
              />
              {visibleCards.length < totalCards && (
                <button
                  ref={loadMoreRef}
                  type="button"
                  onClick={() => setVisibleCardCount((current) => Math.min(current + visibleBatchSize, totalCards))}
                  className="mx-auto flex min-h-11 items-center justify-center rounded-sm border border-border/45 bg-card/55 px-5 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
                >
                  {t('tcg.load_more_cards', { defaultValue: 'Load more cards' })}
                </button>
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

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-[480px] p-0">
          <SheetHeader className="border-b border-border/50 px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-base font-black uppercase tracking-[0.2em]">
              <Filter className="h-4 w-4 text-primary" />
              {t('tcg.filters')}
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto p-4 space-y-4">
            <button
              type="button"
              onClick={() => {
                applyQuickPreset('latest');
                setIsFiltersOpen(false);
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-border/50 bg-card/50 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('tcg.latest_cards')}
            </button>
            <TCGFilters
              mode="advanced"
              filters={effectiveFilters}
              onChange={updateFilters}
              autoApplyInitialSet={false}
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
  searchTerm,
  collections,
  selectedCollectionId,
  sortValue,
  onCollectionChange,
  onSortChange,
  onSearchChange,
  onClearSearch,
  onOpenFilters,
}: {
  title: string;
  subtitle: string;
  searchTerm: string;
  collections: TCGSet[];
  selectedCollectionId: string | null;
  sortValue: string;
  onCollectionChange: (setId: string | null) => void;
  onSortChange: (sortBy: NonNullable<TCGCardFilters['sortBy']>, sortOrder: NonNullable<TCGCardFilters['sortOrder']>) => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenFilters: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="page-surface px-5 py-6 sm:px-8 sm:py-7">
      <div className="space-y-4">
        <div className="relative inline-flex max-w-full">
          <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
          <select
            value={selectedCollectionId ?? ''}
            onChange={(event) => onCollectionChange(event.target.value || null)}
            className="glass-control max-w-full cursor-pointer appearance-none px-3 py-2 pl-7 pr-8 text-sm font-semibold transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            aria-label={t('tcg.filter_set')}
          >
            <option value="">{t('tcg.all_collections')}</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/55" />
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
          <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm border border-border/45 bg-card/75 text-primary/80 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.45)]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('tcg.search_placeholder')}
            className="h-14 w-full rounded-[1.25rem] border border-border/55 bg-card/55 pl-14 pr-4 text-sm font-semibold text-foreground placeholder:text-foreground/30 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full md:w-[250px]">
            <div className="relative overflow-hidden rounded-sm">
              <select
                value={sortValue}
                onChange={(event) => {
                  const [sortBy, sortOrder] = event.target.value.split('-') as [
                    NonNullable<TCGCardFilters['sortBy']>,
                    NonNullable<TCGCardFilters['sortOrder']>,
                  ];
                  onSortChange(sortBy, sortOrder);
                }}
                className="h-11 w-full appearance-none rounded-sm border border-border/50 bg-card/50 px-4 pr-11 text-sm font-semibold text-foreground/75 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
                aria-label={t('tcg.sort_label')}
              >
                <option value="name-asc">{t('tcg.sort_name_asc')}</option>
                <option value="name-desc">{t('tcg.sort_name_desc')}</option>
                <option value="number-asc">{t('tcg.sort_number_asc')}</option>
                <option value="number-desc">{t('tcg.sort_number_desc')}</option>
                <option value="id-asc">{t('tcg.sort_id_asc')}</option>
                <option value="id-desc">{t('tcg.sort_id_desc')}</option>
                <option value="hp-desc">{t('tcg.sort_hp_desc')}</option>
                <option value="hp-asc">{t('tcg.sort_hp_asc')}</option>
                <option value="rarity-asc">{t('tcg.sort_rarity_asc')}</option>
                <option value="rarity-desc">{t('tcg.sort_rarity_desc')}</option>
                <option value="marketPrice-asc">{t('tcg.sort_price_asc')}</option>
                <option value="marketPrice-desc">{t('tcg.sort_price_desc')}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <ChevronDown className="h-4 w-4 text-foreground/30" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-border/50 bg-card/50 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
          >
            <Filter className="h-3.5 w-3.5" />
            {t('tcg.filters')}
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={onClearSearch}
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-border/50 bg-card/50 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/45 transition-colors hover:text-[var(--action-favorite)]"
            >
              {t('tcg.clear')}
            </button>
          )}
        </div>
      </div>
    </section>
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
  const { t } = useTranslation();
  return (
    <div className="rounded-[1.4rem] border border-border/50 bg-card/45 px-4 py-3">
      <div className="space-y-1">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/35">
          {isFetching ? t('tcg.refreshing') : t('tcg.cards_found')}
        </div>
        <div className="text-sm font-semibold text-foreground/70">
          {activeSetName
            ? t('tcg.card_count_in_set', { count, set: activeSetName })
            : t('tcg.results_count', { count })
          }
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
  const { t } = useTranslation();
  const setLanguage = usePrimeDexStore((s) => s.setLanguage);
  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const mounted = useMounted();
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';
  const isLimited = isTcgLangLimited(resolvedLang);

  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/50 bg-card/35 px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
      <h2 className="text-2xl font-black uppercase tracking-[0.16em] text-foreground">
        {t('tcg.no_cards')}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-foreground/50">
        {t('tcg.no_results_hint')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {isLimited && (
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              persistLanguageCookie('en');
            }}
            className="inline-flex h-11 items-center rounded-sm border border-primary/40 bg-primary/15 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:border-primary/60 hover:bg-primary/25"
          >
            {t('tcg.try_english')}
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 items-center rounded-sm border border-border/45 bg-card/55 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          {t('tcg.reset_filters')}
        </button>
        <button
          type="button"
          onClick={onLatest}
          className="inline-flex h-11 items-center rounded-sm border border-border/45 bg-card/55 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          {t('tcg.latest_cards')}
        </button>
        <button
          type="button"
          onClick={onPikachu}
          className="inline-flex h-11 items-center rounded-sm border border-border/45 bg-card/55 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
        >
          {t('tcg.search_pikachu')}
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
