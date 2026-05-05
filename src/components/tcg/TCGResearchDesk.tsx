'use client';

import { useEffect, useMemo, useState, useCallback, type ComponentType } from 'react';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  Database,
  Filter,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Table2,
  SlidersHorizontal,
  Star,
  X,
  Bookmark,
  ArrowRightLeft,
  Wand2,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getFilterOptions, getTCGCard, searchCards } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import type {
  TCGCard,
  TCGCardFilters,
  TCGCardViewMode,
} from '@/types/tcg';
import { parseTCGSearchState, serializeTCGSearchState, summarizeSearch } from '@/lib/tcg-research';
import { TCGFilters } from './TCGFilters';
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { TCGCardItem } from './TCGCardItem';

const PAGE_SIZE = 36;

export function TCGResearchDesk() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = usePrimeDexStore();
  const {
    tcgCompareList,
    addTCGCompare,
    removeTCGCompare,
    clearTCGCompare,
    tcgSavedSearches,
    saveTCGSearch,
    tcgOwnedCards,
    tcgWishlistCards,
    tcgWatchlistCards,
  } = usePrimeDexStore();

  const resolvedLang = mounted ? (language === 'auto' ? 'en' : language) : 'en';
  const initialSearchState = parseTCGSearchState(searchParams);

  const [filters, setFilters] = useState<TCGCardFilters>(() => ({
    ...DEFAULT_TCG_CARD_FILTERS,
    ...initialSearchState.filters,
  }));
  const [viewMode, setViewMode] = useState<TCGCardViewMode>(initialSearchState.viewMode);
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);

  useEffect(() => {
    const nextQuery = serializeTCGSearchState({
      filters: normalizedFilters,
      viewMode,
      compare: tcgCompareList,
    });
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [normalizedFilters, pathname, router, searchParams, tcgCompareList, viewMode]);

  const { data: filterOptions } = useQuery({
    queryKey: tcgKeys.filterOptions(resolvedLang),
    queryFn: () => getFilterOptions(resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

  const {
    data: cardsData,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: tcgKeys.catalog(normalizedFilters, resolvedLang, PAGE_SIZE),
    queryFn: async ({ pageParam = 1, signal }) => searchCards(normalizedFilters, resolvedLang, pageParam, PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  const cards = useMemo(() => cardsData?.pages.flatMap((page) => page.cards) ?? [], [cardsData]);
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const compareQueries = useQueries({
    queries: tcgCompareList.map((cardId) => ({
      queryKey: tcgKeys.card(cardId, resolvedLang),
      queryFn: () => getTCGCard(cardId, resolvedLang),
      enabled: mounted && !cardMap.has(cardId),
      staleTime: 30 * 60 * 1000,
    })),
  });

  const compareCards = useMemo(() => {
    return tcgCompareList
      .map((cardId, index) => cardMap.get(cardId) ?? compareQueries[index]?.data ?? null)
      .filter((card): card is TCGCard => Boolean(card));
  }, [cardMap, compareQueries, tcgCompareList]);

  const setOptions = useMemo(() => {
    const sets = filterOptions?.sets ?? [];
    return [...sets].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : Number.NEGATIVE_INFINITY;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : Number.NEGATIVE_INFINITY;
      return dateB - dateA;
    });
  }, [filterOptions?.sets]);

  const latestSet = setOptions[0] ?? null;
  const selectedSet = setOptions.find((set) => set.id === normalizedFilters.selectedSet) ?? latestSet;
  const totalCards = cards.length;
  const setCount = new Set(cards.map((card) => card.set?.id).filter(Boolean)).size;
  const typeCounts = useMemo(() => makeCounts(cards.flatMap((card) => card.types ?? []).length ? cards.flatMap((card) => card.types ?? []) : ['Unknown']), [cards]);
  const ownedCount = tcgOwnedCards.length;
  const wishlistCount = tcgWishlistCards.length;
  const watchlistCount = tcgWatchlistCards.length;

  const handleCardClick = useCallback((card: TCGCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_TCG_CARD_FILTERS,
      selectedSet: latestSet?.id ?? null,
      ownedState: 'all',
    });
  }, [latestSet?.id]);

  const saveCurrentSearch = useCallback(() => {
    const search = summarizeSearch(cards, normalizedFilters);
    saveTCGSearch({
      ...search,
      name: normalizedFilters.searchTerm?.trim() || selectedSet?.name || t('tcg.saved_search_default', { defaultValue: 'Saved search' }),
      viewMode,
    });
  }, [cards, normalizedFilters, saveTCGSearch, selectedSet?.name, t, viewMode]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="glass-surface rounded-[2rem] p-8">
          <div className="h-12 w-64 rounded-full bg-card/55 animate-pulse" />
          <div className="mt-4 h-5 w-2/3 rounded-full bg-card/45 animate-pulse" />
          <div className="mt-8 h-14 w-full rounded-2xl bg-card/45 animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)_320px]">
          <div className="h-[70vh] rounded-[2rem] bg-card/45 animate-pulse" />
          <div className="h-[70vh] rounded-[2rem] bg-card/45 animate-pulse" />
          <div className="h-[70vh] rounded-[2rem] bg-card/45 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <section className="page-surface relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(227,53,13,0.16),transparent_28%),radial-gradient(circle_at_left,rgba(12,194,181,0.12),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent_24%,transparent_76%,rgba(0,0,0,0.08))]" />

        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div className="space-y-4">
            <p className="page-eyebrow">
              <Database className="h-3.5 w-3.5" />
              {t('tcg.research_eyebrow', { defaultValue: 'TCG Research Desk' })}
            </p>
            <div className="space-y-3">
              <h1 className="page-title text-4xl leading-none sm:text-5xl xl:text-6xl">
                {t('tcg.research_title', { defaultValue: 'Search, compare, and track every card.' })}
              </h1>
              <p className="page-subtitle max-w-2xl">
                {t('tcg.research_subtitle', {
                  defaultValue: 'A dense but readable research surface for set hunting, market checks, collection work, and fast comparisons.',
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="glass-control inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-foreground/80"
              >
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                {t('tcg.save_search', { defaultValue: 'Save search' })}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="glass-control inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-foreground/55"
              >
                <X className="h-3.5 w-3.5" />
                {t('filters.reset')}
              </button>
              <div className="rounded-full border border-border/50 bg-card/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                {isFetching ? t('tcg.syncing_catalog', { defaultValue: 'Refreshing search' }) : t('tcg.catalog_ready')}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MiniStat label={t('tcg.results', { defaultValue: 'Results' })} value={String(totalCards)} accent />
            <MiniStat label={t('tcg.sets', { defaultValue: 'Sets' })} value={String(setCount)} />
            <MiniStat label={t('tcg.compare', { defaultValue: 'Compare' })} value={String(tcgCompareList.length)} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
            <input
              type="text"
              value={normalizedFilters.searchTerm ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, searchTerm: event.target.value || undefined }))}
              placeholder={t('tcg.search_placeholder')}
              className="h-14 w-full rounded-[1.2rem] border border-border/55 bg-card/55 pl-11 pr-4 text-sm font-semibold text-foreground placeholder:text-foreground/30 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <QuickModeButton active={viewMode === 'visual'} icon={LayoutGrid} label={t('tcg.grid_view')} onClick={() => setViewMode('visual')} />
            <QuickModeButton active={viewMode === 'compact'} icon={List} label={t('tcg.list_view')} onClick={() => setViewMode('compact')} />
            <QuickModeButton active={viewMode === 'table'} icon={Table2} label={t('tcg.table_view', { defaultValue: 'Table' })} onClick={() => setViewMode('table')} />
            <QuickModeButton active={viewMode === 'scan'} icon={SlidersHorizontal} label={t('tcg.scan_view', { defaultValue: 'Scan' })} onClick={() => setViewMode('scan')} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {setOptions.slice(0, 8).map((set) => (
          <button
            key={set.id}
            type="button"
            onClick={() => setFilters((current) => ({ ...current, selectedSet: current.selectedSet === set.id ? null : set.id }))}
            className={cn(
              'glass-control inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
              normalizedFilters.selectedSet === set.id ? 'text-primary' : 'text-foreground/55',
            )}
          >
            <span className="truncate max-w-[10rem]">{set.name}</span>
            <span className="text-foreground/25">{set.totalCards}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)_320px] xl:grid-cols-[400px_minmax(0,1fr)_340px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto scrollbar-premium">
            <TCGFilters filters={normalizedFilters} onChange={setFilters} />
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-border/50 bg-card/45 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
              <Star className="h-3.5 w-3.5 text-primary" />
              <span>{t('tcg.catalog_workspace', { defaultValue: 'Catalog workspace' })}</span>
              <span className="rounded-full border border-border/50 bg-card/55 px-2 py-0.5 text-foreground/50">
                {totalCards}
              </span>
            </div>

            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    className="glass-control inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70 lg:hidden"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {t('tcg.filters', { defaultValue: 'Filters' })}
                  </button>
                }
              />
              <SheetContent side="bottom" className="rounded-t-[2rem] p-0 lg:hidden">
                <SheetHeader className="border-b border-border/50 px-5 py-4">
                  <SheetTitle className="flex items-center gap-2 text-base font-black uppercase tracking-[0.2em]">
                    <Wand2 className="h-4 w-4 text-primary" />
                    {t('tcg.filters', { defaultValue: 'Filters' })}
                  </SheetTitle>
                </SheetHeader>
                <div className="max-h-[80dvh] overflow-y-auto p-4">
                  <TCGFilters filters={normalizedFilters} onChange={setFilters} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="aspect-[2.5/3.5] rounded-[1.25rem] bg-card/50 animate-pulse" />
              ))}
            </div>
          ) : cards.length > 0 ? (
            <>
              <ResultView
                cards={cards}
                viewMode={viewMode}
                onCardClick={handleCardClick}
                onCompareToggle={(cardId) => (tcgCompareList.includes(cardId) ? removeTCGCompare(cardId) : addTCGCompare(cardId))}
              />

              {hasNextPage && (
                <div className="flex justify-center pb-4">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="glass-control inline-flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-foreground/70 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                    {isFetchingNextPage ? t('tcg.loading_more', { defaultValue: 'Loading more' }) : t('tcg.load_more_cards')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="glass-surface flex flex-col items-center justify-center rounded-[2rem] border-dashed px-6 py-24 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/8 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-[0.22em]">{t('tcg.no_cards')}</h3>
              <p className="mt-3 max-w-md text-sm leading-7 text-foreground/45">
                {t('tcg.no_cards_desc')}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="glass-control mt-8 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em]"
              >
                {t('filters.reset')}
              </button>
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <div className="glass-surface rounded-[1.75rem] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {t('tcg.insights', { defaultValue: 'Insights' })}
            </div>
            <div className="grid gap-3">
              <InsightRow label={t('tcg.latest_set', { defaultValue: 'Latest set' })} value={selectedSet?.name ?? t('tcg.unknown')} />
              <InsightRow label={t('tcg.cards_loaded', { defaultValue: 'Cards loaded' })} value={String(totalCards)} />
              <InsightRow label={t('tcg.active_searches', { defaultValue: 'Saved searches' })} value={String(tcgSavedSearches.length)} />
              <InsightRow label={t('tcg.compare_tray', { defaultValue: 'Compare tray' })} value={String(tcgCompareList.length)} />
              <InsightRow label={t('tcg.collection', { defaultValue: 'Collection' })} value={`${ownedCount}/${wishlistCount}/${watchlistCount}`} />
            </div>
          </div>

          <div className="glass-surface rounded-[1.75rem] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
              {t('tcg.compare_tray', { defaultValue: 'Compare tray' })}
            </div>
            {compareCards.length > 0 ? (
              <div className="space-y-3">
                {compareCards.map((card) => (
                  <div
                    key={card.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardClick(card)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleCardClick(card);
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card/45 p-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black uppercase tracking-tight">{card.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-foreground/35">
                        {card.set?.name ?? t('tcg.unknown')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeTCGCompare(card.id);
                      }}
                      className="rounded-full border border-border/50 bg-card/65 p-2 text-foreground/40"
                      aria-label={t('common.remove', { defaultValue: 'Remove' })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={clearTCGCompare}
                  className="glass-control w-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/55"
                >
                  {t('common.clear', { defaultValue: 'Clear' })}
                </button>
              </div>
            ) : (
              <p className="text-sm leading-7 text-foreground/45">
                {t('tcg.compare_empty', { defaultValue: 'Pick 2 to 4 cards to compare their stats, rarity, and set context.' })}
              </p>
            )}
          </div>

          <div className="glass-surface rounded-[1.75rem] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t('tcg.saved_searches', { defaultValue: 'Saved searches' })}
            </div>
            {tcgSavedSearches.length > 0 ? (
              <div className="space-y-2">
                {tcgSavedSearches.slice(0, 6).map((search) => (
                  <button
                    key={search.id}
                    type="button"
                    onClick={() => setFilters({ ...DEFAULT_TCG_CARD_FILTERS, ...search.filters })}
                    className="flex w-full items-center justify-between rounded-2xl border border-border/50 bg-card/45 px-3 py-2 text-left"
                  >
                    <span className="min-w-0 truncate text-xs font-bold uppercase tracking-tight">{search.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-foreground/30">{search.viewMode}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-foreground/45">
                {t('tcg.saved_searches_empty', { defaultValue: 'Save a search to bring it back with one tap.' })}
              </p>
            )}
          </div>

          <div className="glass-surface rounded-[1.75rem] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              {t('tcg.top_types', { defaultValue: 'Top types' })}
            </div>
            <div className="space-y-2">
              {typeCounts.slice(0, 5).map(([label, count]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/35 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <TCGCardDetailModal card={selectedCard} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
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
    ownedState: filters.ownedState ?? 'all',
    legalities: filters.legalities ?? [],
  };
}

function ResultView({
  cards,
  viewMode,
  onCardClick,
  onCompareToggle,
}: {
  cards: TCGCard[];
  viewMode: TCGCardViewMode;
  onCardClick: (card: TCGCard) => void;
  onCompareToggle: (cardId: string) => void;
}) {
  if (viewMode === 'table' || viewMode === 'scan') {
    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/35">
        <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_auto] gap-3 border-b border-border/50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">
          <span>Name</span>
          <span>Set</span>
          <span>Rarity</span>
          <span>HP</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-border/30">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onCardClick(card)}
              className="grid w-full grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_auto] gap-3 px-4 py-3 text-left transition-colors hover:bg-card/65"
            >
              <span className="min-w-0 truncate text-sm font-bold">{card.name}</span>
              <span className="min-w-0 truncate text-xs uppercase tracking-[0.14em] text-foreground/45">{card.set?.name ?? '—'}</span>
              <span className="text-xs uppercase tracking-[0.14em] text-foreground/45">{card.rarity ?? '—'}</span>
              <span className="text-xs uppercase tracking-[0.14em] text-foreground/45">{card.hp ?? '—'}</span>
              <span className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCompareToggle(card.id);
                  }}
                  className="rounded-full border border-border/50 bg-card/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/55"
                >
                  Compare
                </button>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', viewMode === 'visual' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
      {cards.map((card, index) => (
        <div key={card.id} className="relative">
          <TCGCardItem card={card} index={index} variant={viewMode === 'compact' ? 'list' : 'default'} onClick={onCardClick} />
          <button
            type="button"
            onClick={() => onCompareToggle(card.id)}
            className="absolute right-3 top-3 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/65 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.5)]"
          >
            Compare
          </button>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('glass-control rounded-[1.25rem] px-4 py-3', accent && 'border-primary/30')}>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/35">{label}</div>
      <div className="mt-1 text-xl font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function QuickModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'glass-control inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
        active && 'border-primary/30 text-primary',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/45 bg-card/40 px-3 py-2">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">{label}</span>
      <span className="max-w-[55%] truncate text-xs font-bold text-foreground/80">{value}</span>
    </div>
  );
}

function makeCounts(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
