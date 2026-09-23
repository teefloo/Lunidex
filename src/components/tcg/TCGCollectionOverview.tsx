'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { ChevronDown, Search, Trophy } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { usePrimeDexStore } from '@/store/primedex';
import { useTranslation } from '@/lib/i18n';
import { fetchCollectionValue } from '@/lib/api/tcg';
import {
  countPhysicalTCGCards,
  encodeTCGCollectionKey,
  getTCGCollectionCardIds,
  getTCGCollectionCardOwnerships,
} from '@/lib/tcg-collections';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import {
  getSetCompletionFromSet,
  type TCGCollectionValueGroup,
  type TCGOwnedVariant,
} from '@/lib/tcg-collection';
import {
  filterTCGCollectionOverviewEntries,
  getTCGCollectionCatalogDisplay,
  parseTCGCollectionUrlState,
  serializeTCGCollectionUrlState,
  TCG_COLLECTION_CATALOG_BATCH_SIZE,
  type TCGCollectionOverviewEntry,
  type TCGCollectionOverviewEntryWithProgress,
  type TCGCollectionSortMode,
  type TCGCollectionUrlState,
  type TCGCollectionView,
} from '@/lib/tcg-collection-overview';
import { TCGProgressBar } from './TCGProgressBar';
import { TCGCollectionSetRow } from './TCGCollectionSetRow';
import { TCGLanguageSelector } from './TCGLanguageSelector';
import {
  parseTCGCollectionScrollPosition,
  TCG_COLLECTION_HISTORY_TARGET_KEY,
  TCG_COLLECTION_SCROLL_POSITION_KEY,
  TCG_COLLECTION_SCROLL_RESTORE_KEY,
} from '@/lib/tcg-collection-navigation';

export type { TCGCollectionOverviewEntry } from '@/lib/tcg-collection-overview';

interface TCGCollectionOverviewProps {
  collections: TCGCollectionOverviewEntry[];
  legacyOwnedCards?: string[];
}

function formatCurrency(group: TCGCollectionValueGroup, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: group.currency,
      maximumFractionDigits: 2,
    }).format(group.total);
  } catch {
    return `${group.total.toFixed(2)} ${group.currency}`;
  }
}

function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

export function TCGCollectionOverview({ collections, legacyOwnedCards = [] }: TCGCollectionOverviewProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const legacyStoreCards = usePrimeDexStore((state) => state.tcgLegacyOwnedCards);
  const assignLegacy = usePrimeDexStore((state) => state.assignLegacyTCGSetLanguage);
  const transferCollectionCards = usePrimeDexStore((state) => state.transferTCGCollectionCards);
  const setBrowseLanguage = usePrimeDexStore((state) => state.setTCGBrowseLanguage);
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const searchId = useId();
  const sortId = useId();
  const setListId = useId();
  const urlState = useMemo(
    () => parseTCGCollectionUrlState(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );
  const collectionFilterKey = `${urlState.view}|${urlState.query}|${urlState.sort}|${urlState.incompleteOnly ? '1' : '0'}`;
  const [catalogDisplayState, setCatalogDisplayState] = useState({
    filterKey: '',
    visibleCount: TCG_COLLECTION_CATALOG_BATCH_SIZE,
  });
  const [expandedAnalysisState, setExpandedAnalysisState] = useState<{ filterKey: string; collectionKey: string | null }>({
    filterKey: '',
    collectionKey: null,
  });

  const replaceUrlState = useCallback((nextState: TCGCollectionUrlState) => {
    const params = new URLSearchParams(searchParamsString);
    for (const key of ['view', 'q', 'sort', 'incomplete']) params.delete(key);
    const serialized = new URLSearchParams(serializeTCGCollectionUrlState(nextState));
    serialized.forEach((value, key) => params.set(key, value));
    router.replace(withQuery(pathname, params.toString()), { scroll: false });
  }, [pathname, router, searchParamsString]);

  const effectiveLegacyCards = legacyOwnedCards.length > 0 ? legacyOwnedCards : legacyStoreCards;
  const physicalCount = useMemo(
    () => countPhysicalTCGCards(collectionCards, effectiveLegacyCards),
    [collectionCards, effectiveLegacyCards],
  );
  const entries = useMemo<TCGCollectionOverviewEntryWithProgress[]>(() => collections.map((entry) => {
    const ownedIds = new Set(getTCGCollectionCardIds(entry.collectionKey, collectionCards));
    const ownedVariants: TCGOwnedVariant[] = getTCGCollectionCardOwnerships(entry.collectionKey, collectionCards)
      .map(({ cardId, variant, quantity }) => ({ cardId, variant, quantity }));
    return {
      ...entry,
      ownedIds,
      ownedVariants,
      completion: getSetCompletionFromSet(entry.set, ownedIds),
    };
  }), [collectionCards, collections]);
  const startedEntries = useMemo(
    () => entries.filter((entry) => entry.ownedVariants.length > 0),
    [entries],
  );
  const collectionValueQueries = useQueries({
    queries: startedEntries.map((entry) => ({
      queryKey: ['tcg', 'collection-value-v6', entry.collectionKey, entry.ownedVariants, displayCurrency],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchCollectionValue(
        entry.ownedVariants,
        entry.language,
        signal,
        displayCurrency,
      ),
      staleTime: 60 * 60 * 1000,
      retry: false,
      enabled: mounted && entry.ownedVariants.length > 0,
    })),
  });
  const valueQueryByCollectionKey = useMemo(
    () => new Map(startedEntries.map((entry, index) => [entry.collectionKey, collectionValueQueries[index]])),
    [collectionValueQueries, startedEntries],
  );
  const totalValueGroups = useMemo(() => {
    const totals = new Map<string, TCGCollectionValueGroup>();
    for (const group of collectionValueQueries.flatMap((query) => query.data?.groups ?? [])) {
      if (group.currency.toUpperCase() !== displayCurrency) continue;
      const key = group.currency.toUpperCase();
      const existing = totals.get(key);
      totals.set(key, existing
        ? { ...existing, total: existing.total + group.total, count: existing.count + group.count }
        : group);
    }
    return [...totals.values()];
  }, [collectionValueQueries, displayCurrency]);
  const valuationCoverage = useMemo(() => {
    const priced = collectionValueQueries.reduce((sum, query) => sum + (query.data?.pricedCount ?? 0), 0);
    return { owned: physicalCount, priced, unpriced: Math.max(0, physicalCount - priced) };
  }, [collectionValueQueries, physicalCount]);
  const valuationPending = collectionValueQueries.some((query) => query.isFetching);
  const hasValuationResult = collectionValueQueries.some((query) => query.data !== undefined);
  const stats = useMemo(() => {
    const totalCards = startedEntries.reduce((sum, entry) => sum + entry.completion.total, 0);
    const ownedInCollections = startedEntries.reduce((sum, entry) => sum + entry.completion.owned, 0);
    const completeSets = startedEntries.filter((entry) => (
      entry.completion.total > 0 && entry.completion.owned >= entry.completion.total
    )).length;
    return {
      totalCards,
      ownedInCollections,
      completeSets,
      totalSets: startedEntries.length,
      percentage: totalCards > 0 ? Math.round((ownedInCollections / totalCards) * 100) : 0,
    };
  }, [startedEntries]);
  const selectedEntries = useMemo(
    () => filterTCGCollectionOverviewEntries(entries, urlState),
    [entries, urlState],
  );
  const catalogDisplay = useMemo(
    () => getTCGCollectionCatalogDisplay(
      selectedEntries,
      catalogDisplayState.filterKey === collectionFilterKey
        ? catalogDisplayState.visibleCount
        : TCG_COLLECTION_CATALOG_BATCH_SIZE,
    ),
    [catalogDisplayState, collectionFilterKey, selectedEntries],
  );
  const visibleEntries = urlState.view === 'all' ? catalogDisplay.entries : selectedEntries;
  const expandedCollectionKey = expandedAnalysisState.filterKey === collectionFilterKey
    ? expandedAnalysisState.collectionKey
    : null;
  const legacyGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const cardId of effectiveLegacyCards) {
      const separator = cardId.lastIndexOf('-');
      const setId = separator > 0 ? cardId.slice(0, separator) : cardId;
      groups.set(setId, [...(groups.get(setId) ?? []), cardId]);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [effectiveLegacyCards]);
  const returnQuery = useMemo(() => {
    const params = new URLSearchParams();
    const tcgLanguage = new URLSearchParams(searchParamsString).get('tcgLang');
    if (tcgLanguage) params.set('tcgLang', tcgLanguage);
    const overviewParams = new URLSearchParams(serializeTCGCollectionUrlState(urlState));
    overviewParams.forEach((value, key) => params.set(key, value));
    return params.toString();
  }, [searchParamsString, urlState]);

  const getAlbumHref = useCallback((entry: TCGCollectionOverviewEntryWithProgress) => {
    const params = new URLSearchParams();
    if (returnQuery) params.set('return', returnQuery);
    return withQuery(
      localeHref(`/tcg/collection/${entry.language}/${encodeURIComponent(entry.set.id)}`),
      params.toString(),
    );
  }, [localeHref, returnQuery]);

  const rememberCollectionReturnTarget = useCallback((href: string) => {
    try {
      window.sessionStorage.setItem(TCG_COLLECTION_HISTORY_TARGET_KEY, href);
      window.sessionStorage.setItem(TCG_COLLECTION_SCROLL_POSITION_KEY, JSON.stringify({
        collectionPath: `${window.location.pathname}${window.location.search}`,
        scrollY: Math.max(0, window.scrollY),
      }));
    } catch {
      // Keep normal link navigation available when session storage is disabled.
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let serializedPosition: string | null;
    try {
      serializedPosition = window.sessionStorage.getItem(TCG_COLLECTION_SCROLL_RESTORE_KEY);
    } catch {
      return;
    }
    if (!serializedPosition) return;

    const savedPosition = parseTCGCollectionScrollPosition(serializedPosition);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (!savedPosition || savedPosition.collectionPath !== currentPath) {
      try {
        window.sessionStorage.removeItem(TCG_COLLECTION_SCROLL_RESTORE_KEY);
      } catch {
        // Ignore unavailable session storage.
      }
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        try {
          if (window.sessionStorage.getItem(TCG_COLLECTION_SCROLL_RESTORE_KEY) !== serializedPosition) return;
          window.sessionStorage.removeItem(TCG_COLLECTION_SCROLL_RESTORE_KEY);
        } catch {
          // The in-memory target is still usable when session storage becomes unavailable.
        }
        window.scrollTo(0, savedPosition.scrollY);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [mounted, pathname, searchParamsString]);

  const openCollectionInLanguage = useCallback((entry: TCGCollectionOverviewEntryWithProgress, language: TCGCardLanguage): boolean => {
    const targetCollectionKey = encodeTCGCollectionKey(language, entry.set.id);
    if (!targetCollectionKey) return false;
    const sourceHasCards = getTCGCollectionCardOwnerships(entry.collectionKey, collectionCards).length > 0;
    if (sourceHasCards && !transferCollectionCards(entry.collectionKey, targetCollectionKey)) return false;
    setBrowseLanguage(language);
    const params = new URLSearchParams();
    if (returnQuery) params.set('return', returnQuery);
    const albumHref = withQuery(
      localeHref(`/tcg/collection/${language}/${encodeURIComponent(entry.set.id)}`),
      params.toString(),
    );
    rememberCollectionReturnTarget(albumHref);
    router.push(albumHref);
    return true;
  }, [collectionCards, localeHref, rememberCollectionReturnTarget, returnQuery, router, setBrowseLanguage, transferCollectionCards]);

  if (!mounted) return null;

  const changeView = (view: TCGCollectionView) => replaceUrlState({ ...urlState, view });
  const changeSort = (sort: TCGCollectionSortMode) => replaceUrlState({ ...urlState, sort });
  const toggleIncomplete = () => replaceUrlState({ ...urlState, incompleteOnly: !urlState.incompleteOnly });
  const noPersonalSets = startedEntries.length === 0;
  const hasActiveFilters = Boolean(urlState.query || urlState.incompleteOnly || urlState.sort !== 'release-newest');

  return (
    <div className="space-y-8">
      <section className="rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 p-5 shadow-[var(--shadow-pixel)]" aria-labelledby="tcg-collection-summary-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="tcg-collection-summary-title" className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">
              {t('tcg.collection_recap_title')}
            </h2>
          </div>
          <Link
            href={localeHref(`/tcg/start?tcgLang=${encodeURIComponent(browseLanguage)}`)}
            className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 bg-primary/15 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-primary transition-[background-color,color] duration-100 hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t('tcg.collection_add_set', { defaultValue: 'Add a set' })}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label={t('tcg.collection_physical_copies', { defaultValue: 'Physical copies' })}
            value={physicalCount}
            detail={t('tcg.collection_unique_cards_detail', { count: stats.ownedInCollections, defaultValue: `${stats.ownedInCollections} unique cards` })}
          />
          <Stat label={t('tcg.collection_sets_completed')} value={`${stats.completeSets}/${stats.totalSets}`} />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">{t('tcg.collection_overall_progress')}</p>
            <p className="mt-1 tabular-nums text-3xl font-black leading-none">{stats.percentage}%</p>
            <TCGProgressBar owned={stats.ownedInCollections} total={stats.totalCards} size="sm" className="mt-2 w-full" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">{t('tcg.collection_value_estimate')}</p>
            {valuationPending && !hasValuationResult ? (
              <p className="mt-1 text-sm font-bold text-foreground/55" aria-live="polite">{t('tcg.collection_loading')}</p>
            ) : totalValueGroups.length ? (
              <>
                <p className="mt-1 break-words text-2xl font-black tabular-nums text-primary">
                  {totalValueGroups.map((group) => formatCurrency(group, interfaceLanguage)).join(' · ')}
                </p>
                {valuationPending && <p className="text-[11px] font-bold text-foreground/55">{t('tcg.collection_loading')}</p>}
                {!valuationPending && valuationCoverage.unpriced > 0 && (
                  <p className="text-[11px] font-bold text-amber-200/70">{t('tcg.collection_value_partial', { count: valuationCoverage.unpriced })}</p>
                )}
              </>
            ) : physicalCount > 0 ? (
              <p className="mt-1 text-sm font-bold text-foreground/55">{t('tcg.collection_value_unavailable')}</p>
            ) : (
              <p className="mt-1 text-sm font-bold text-foreground/55">{t('tcg.collection_value_none_owned')}</p>
            )}
          </div>
        </div>
      </section>

      {legacyGroups.length > 0 && (
        <section className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-5" aria-labelledby="tcg-legacy-title">
          <div>
            <h2 id="tcg-legacy-title" className="text-sm font-black uppercase tracking-[0.12em] text-amber-100">
              {t('tcg.collection_legacy_title', { defaultValue: 'Historical cards need a language' })}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-100/70">
              {t('tcg.collection_legacy_description', { defaultValue: 'These cards were saved before language-aware collections. Attribute each set explicitly.' })}
            </p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {legacyGroups.map(([setId, cards]) => (
              <LegacySetAttributionRow
                key={setId}
                setId={setId}
                cards={cards}
                browseLanguage={browseLanguage}
                onAssign={assignLegacy}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="tcg-collection-sets-title">
        <div className="flex flex-col gap-4 rounded-sm border border-border/20 bg-card/20 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="tcg-collection-sets-title" className="text-base font-black tracking-tight text-balance">
                {t(urlState.view === 'mine' ? 'tcg.collection_my_sets' : 'tcg.collection_all_sets', {
                  defaultValue: urlState.view === 'mine' ? 'My sets' : 'All sets',
                })}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-foreground/55">
                {t(urlState.view === 'mine' ? 'tcg.collection_my_sets_description' : 'tcg.collection_all_sets_description', {
                  defaultValue: urlState.view === 'mine'
                    ? 'Your started sets, progress, and collection value.'
                    : 'Browse every available set without loading the whole catalog at once.',
                })}
              </p>
            </div>
            <div className="inline-flex min-h-11 rounded-sm border border-border/40 bg-card/50 p-1" role="group" aria-label={t('tcg.collection_view_mode', { defaultValue: 'Collection view' })}>
              <button
                type="button"
                onClick={() => changeView('mine')}
                aria-pressed={urlState.view === 'mine'}
                className={`min-h-9 rounded-sm px-3 text-[11px] font-black uppercase tracking-[0.07em] transition-[background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${urlState.view === 'mine' ? 'bg-primary text-primary-foreground' : 'text-foreground/60 hover:text-primary'}`}
              >
                {t('tcg.collection_my_sets', { defaultValue: 'My sets' })}
              </button>
              <button
                type="button"
                onClick={() => changeView('all')}
                aria-pressed={urlState.view === 'all'}
                className={`min-h-9 rounded-sm px-3 text-[11px] font-black uppercase tracking-[0.07em] transition-[background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${urlState.view === 'all' ? 'bg-primary text-primary-foreground' : 'text-foreground/60 hover:text-primary'}`}
              >
                {t('tcg.collection_all_sets', { defaultValue: 'All sets' })}
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-sm border border-border/35 bg-card/55 px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" />
              <label htmlFor={searchId} className="sr-only">{t('tcg.collection_search_sets')}</label>
              <input
                id={searchId}
                name="collection-set-search"
                autoComplete="off"
                value={urlState.query}
                onChange={(event) => replaceUrlState({ ...urlState, query: event.target.value })}
                placeholder={t('tcg.collection_search_sets_placeholder', { defaultValue: 'Search sets…' })}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:text-foreground/45 focus:outline-none"
              />
            </div>
            <div className="flex min-h-11 items-center gap-1 rounded-sm border border-border/35 bg-card/55 pl-3 pr-2">
              <label htmlFor={sortId} className="sr-only">{t('tcg.collection_sort_label')}</label>
              <select
                id={sortId}
                name="collection-set-sort"
                value={urlState.sort}
                onChange={(event) => changeSort(event.target.value as TCGCollectionSortMode)}
                className="min-h-11 min-w-0 appearance-none bg-card text-[11px] font-bold text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <option value="progress">{t('tcg.collection_sort_default')}</option>
                <option value="release-newest">{t('tcg.collection_sort_release_newest')}</option>
                <option value="release-oldest">{t('tcg.collection_sort_release_oldest')}</option>
                <option value="name-asc">{t('tcg.collection_sort_name_asc')}</option>
                <option value="name-desc">{t('tcg.collection_sort_name_desc')}</option>
              </select>
              <ChevronDown className="pointer-events-none h-4 w-4 text-foreground/45" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={toggleIncomplete}
              aria-pressed={urlState.incompleteOnly}
              aria-controls={setListId}
              className={`min-h-11 rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.07em] transition-[border-color,background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${urlState.incompleteOnly ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/35 bg-card/55 text-foreground/70 hover:border-primary/30 hover:text-primary'}`}
            >
              {t('tcg.collection_to_finish', { defaultValue: 'To finish' })}
            </button>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <EmptyCollectionState
            personal={urlState.view === 'mine' && noPersonalSets}
            hasActiveFilters={hasActiveFilters}
            onReset={() => {
              replaceUrlState({ view: urlState.view, query: '', sort: 'release-newest', incompleteOnly: false });
            }}
            startHref={localeHref(`/tcg/start?tcgLang=${encodeURIComponent(browseLanguage)}`)}
          />
        ) : (
          <>
            <div id={setListId} className="flex flex-col gap-3" aria-live="polite">
              {visibleEntries.map((entry) => {
                const valueQuery = valueQueryByCollectionKey.get(entry.collectionKey);
                const valuation = valueQuery?.data?.bySet[entry.set.id];
                const albumHref = getAlbumHref(entry);
                return (
                  <TCGCollectionSetRow
                    key={entry.collectionKey}
                    entry={entry}
                    view={urlState.view}
                    albumHref={albumHref}
                    onAlbumNavigate={rememberCollectionReturnTarget}
                    valuation={valuation}
                    valuationLoading={Boolean(valueQuery?.isFetching)}
                    analysisOpen={expandedCollectionKey === entry.collectionKey}
                    onAnalysisToggle={() => setExpandedAnalysisState((current) => ({
                      filterKey: collectionFilterKey,
                      collectionKey: current.filterKey === collectionFilterKey && current.collectionKey === entry.collectionKey
                        ? null
                        : entry.collectionKey,
                    }))}
                    onLanguageChange={(language) => openCollectionInLanguage(entry, language)}
                  />
                );
              })}
            </div>

            {urlState.view === 'all' && catalogDisplay.hasMore && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setCatalogDisplayState({
                    filterKey: collectionFilterKey,
                    visibleCount: catalogDisplay.entries.length + TCG_COLLECTION_CATALOG_BATCH_SIZE,
                  })}
                  className="min-h-11 rounded-sm border border-primary/35 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-primary transition-[background-color,color] duration-100 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {t('tcg.collection_show_more', { defaultValue: 'Show more' })}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">{label}</p>
      <p className="mt-1 tabular-nums text-3xl font-black leading-none">{value}</p>
      {detail && <p className="mt-1 text-[11px] font-bold text-foreground/50">{detail}</p>}
    </div>
  );
}

function EmptyCollectionState({
  personal,
  hasActiveFilters,
  onReset,
  startHref,
}: {
  personal: boolean;
  hasActiveFilters: boolean;
  onReset: () => void;
  startHref: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-border/30 bg-card/20 px-5 py-16 text-center" role="status" aria-live="polite">
      <p className="max-w-md text-base font-bold text-foreground/75">
        {personal
          ? t('tcg.collection_empty_personal', { defaultValue: 'No sets have cards yet.' })
          : t('tcg.collection_no_results', { defaultValue: 'No sets match these filters.' })}
      </p>
      <p className="max-w-md text-sm text-foreground/55">
        {personal
          ? t('tcg.collection_empty_personal_description', { defaultValue: 'Add a set, then track the physical cards you own.' })
          : t('tcg.collection_no_results_description', { defaultValue: 'Try a different name or reset the active filters.' })}
      </p>
      {personal ? (
        <Link
          href={startHref}
          className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-primary transition-[background-color,color] duration-100 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t('tcg.collection_add_set', { defaultValue: 'Add a set' })}
        </Link>
      ) : hasActiveFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-sm border border-primary/40 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-primary transition-[background-color,color] duration-100 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t('tcg.collection_reset_filters', { defaultValue: 'Reset filters' })}
        </button>
      ) : null}
    </div>
  );
}

function LegacySetAttributionRow({
  setId,
  cards,
  browseLanguage,
  onAssign,
}: {
  setId: string;
  cards: string[];
  browseLanguage: TCGCardLanguage;
  onAssign: (setId: string, language: TCGCardLanguage) => string;
}) {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<TCGCardLanguage | undefined>();
  const language = selectedLanguage ?? browseLanguage;

  return (
    <div className="flex min-h-12 flex-col gap-2 rounded-sm border border-amber-200/20 bg-card/35 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 truncate text-sm font-bold text-amber-50">
        {setId} <span className="tabular-nums text-amber-100/60">({cards.length})</span>
      </span>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <TCGLanguageSelector
          value={selectedLanguage}
          onChange={setSelectedLanguage}
          preserveQuery={false}
          ariaLabel={t('tcg.collection_language_for_set', { name: setId, defaultValue: `Language for ${setId}` })}
          className="bg-card/25"
        />
        <button
          type="button"
          onClick={() => onAssign(setId, language)}
          className="min-h-11 shrink-0 rounded-sm border border-amber-200/30 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-amber-100 hover:bg-amber-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70"
        >
          {t('tcg.collection_attribute', { defaultValue: 'Attribute' })}
        </button>
      </div>
    </div>
  );
}
