'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { Accessibility, KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom';
import { DragDropProvider, useDroppable, type DragEndEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { useMounted } from '@/hooks/useMounted';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { fetchCustomCollectionValue, getTCGCustomCollectionCardDetails } from '@/lib/api/tcg';
import type { TCGCustomCollectionCardDetail } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import {
  filterAndSortTCGCustomCollectionCards,
  getTCGCustomCollectionPageNavigationTarget,
  hasTCGCustomCollectionCardViewTransform,
} from '@/lib/tcg-custom-collection-view';
import { getTCGCardLanguageName, isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { getTCGCustomCollectionDragEndAnnouncement } from '@/lib/tcg-custom-collection-dnd';
import {
  compressTCGCustomCollectionLayoutCardRefs,
  getTCGCustomCollectionGridDimensions,
  getTCGCustomCollectionLayout,
  getTCGCustomCollectionLayoutCardCount,
  getTCGCustomCollectionLayoutCardIndex,
  getTCGCustomCollectionLayoutPage,
  moveTCGCustomCollectionLayoutCard,
  type TCGCustomCollectionGridPreset,
  type TCGCustomCollectionLayoutCardRef,
} from '@primedex/core/lib/tcg-custom-collections';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGCustomCollectionFormDialog } from './TCGCustomCollectionFormDialog';
import { TCGCustomCollectionAddPanel } from './TCGCustomCollectionAddPanel';
import { getTCGCustomCollectionSortableId, TCGCustomCollectionBinderPage, type TCGCustomCollectionBinderCardDetail, type TCGCustomCollectionCardMove } from './TCGCustomCollectionBinderPage';
import { TCGPageTabs } from './TCGPageTabs';

interface TCGCustomCollectionDetailProps {
  collectionId: string;
}

export function TCGCustomCollectionDetail({ collectionId }: TCGCustomCollectionDetailProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const interfaceLanguage = useClientLanguage();
  const { user, loading: authLoading } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const collection = usePrimeDexStore((state) => state.tcgCustomCollections.find((entry) => entry.id === collectionId));
  const allReferences = usePrimeDexStore((state) => state.tcgCustomCollectionCards);
  const references = useMemo(() => allReferences.filter((entry) => entry.collectionId === collectionId), [allReferences, collectionId]);
  const layouts = usePrimeDexStore((state) => state.tcgCustomCollectionLayouts);
  const setGridPreset = usePrimeDexStore((state) => state.setTCGCustomCollectionGridPreset);
  const reorderCards = usePrimeDexStore((state) => state.reorderTCGCustomCollectionCards);
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const setQuantity = usePrimeDexStore((state) => state.setTCGCustomCollectionCardQuantity);
  const removeCard = usePrimeDexStore((state) => state.removeTCGCustomCollectionCard);
  const deleteCollection = usePrimeDexStore((state) => state.deleteTCGCustomCollection);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<TCGCardLanguage | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [priceOrder, setPriceOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const ownedPhysicalCount = useMemo(() => references.reduce((total, reference) => {
    const quantity = reference.quantity ?? 1;
    return Number.isSafeInteger(quantity) && quantity > 0 ? total + quantity : total;
  }, 0), [references]);
  const binderPocketCount = useMemo(() => references.reduce((total, reference) => total + Math.max(1, reference.quantity ?? 1), 0), [references]);
  const valuationReferencesKey = useMemo(() => JSON.stringify(references
    .map((reference) => [reference.language, reference.cardId, reference.quantity ?? 1] as const)
    .sort((left, right) => `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`))), [references]);
  const [pageSelection, setPageSelection] = useState({ referenceKey: '', page: 1 });
  const [pendingFocusCardId, setPendingFocusCardId] = useState<string | null>(null);
  const handleCardFocusRestored = useCallback((cardId: string) => {
    setPendingFocusCardId((current) => current === cardId ? null : current);
  }, []);
  const [formOpen, setFormOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const addPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const returnHref = localeHref('/tcg/collection?view=custom');
  const referenceKey = useMemo(() => references.map((ref) => `${ref.language}:${ref.cardId}`).join('|'), [references]);
  const page = pageSelection.referenceKey === referenceKey ? pageSelection.page : 1;
  const setPage = (next: number | ((current: number) => number)) => {
    setPageSelection((currentSelection) => {
      const currentPage = currentSelection.referenceKey === referenceKey ? currentSelection.page : 1;
      return { referenceKey, page: typeof next === 'function' ? next(currentPage) : next };
    });
  };
  const manualLayout = useMemo(
    () => getTCGCustomCollectionLayout(collectionId, layouts, references),
    [collectionId, layouts, references],
  );
  const manualOrderReferences = useMemo(() => {
    const referencesByKey = new Map(references.map((reference) => [`${reference.language}:${reference.cardId.toLocaleLowerCase()}`, reference]));
    const seen = new Set<string>();
    return manualLayout.cardOrder.flatMap((reference) => {
      const key = `${reference.language}:${reference.cardId.toLocaleLowerCase()}`;
      if (seen.has(key)) return [];
      seen.add(key);
      const member = referencesByKey.get(key);
      return member ? [member] : [];
    });
  }, [manualLayout, references]);
  const metadataRequired = filtersOpen || Boolean(rarityFilter || setFilter || priceOrder !== 'none');
  const metadataQuery = useQuery({
    queryKey: [...tcgKeys.all(), 'custom-collection-index', collectionId, referenceKey],
    queryFn: ({ signal }) => getTCGCustomCollectionCardDetails(references, signal),
    enabled: mounted && syncStatus === 'ready' && Boolean(collection) && references.length > 0 && metadataRequired,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const metadataDetails = useMemo(() => metadataQuery.data ?? [], [metadataQuery.data]);
  const metadataFiltersAvailable = metadataQuery.data !== undefined;
  const rarities = useMemo(() => [...new Set(metadataDetails.map(({ card }) => card.rarity).filter((value): value is string => Boolean(value)))].sort((left, right) => left.localeCompare(right)), [metadataDetails]);
  const sets = useMemo(() => {
    const byId = new Map<string, string>();
    for (const { card } of metadataDetails) {
      if (card.set?.id && card.set.name && !byId.has(card.set.id)) byId.set(card.set.id, card.set.name);
    }
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [metadataDetails]);
  const viewFilters = useMemo(() => ({
    search,
    language: languageFilter,
    rarity: metadataFiltersAvailable ? rarityFilter : '',
    setId: metadataFiltersAvailable ? setFilter : '',
    priceOrder: metadataFiltersAvailable ? priceOrder : 'none',
    displayCurrency,
  }), [search, languageFilter, metadataFiltersAvailable, rarityFilter, setFilter, priceOrder, displayCurrency]);
  const sortedReferences = useMemo(
    () => filterAndSortTCGCustomCollectionCards(manualOrderReferences, metadataDetails, viewFilters),
    [manualOrderReferences, metadataDetails, viewFilters],
  );
  const viewPocketCount = useMemo(() => sortedReferences.reduce((total, reference) => total + Math.max(1, reference.quantity ?? 1), 0), [sortedReferences]);
  const isTemporaryView = hasTCGCustomCollectionCardViewTransform(viewFilters);
  const viewLayout = useMemo(() => isTemporaryView ? ({
    ...manualLayout,
    cardOrder: compressTCGCustomCollectionLayoutCardRefs(sortedReferences.map((reference) => ({
      cardId: reference.cardId,
      language: reference.language,
      copyIndex: 0,
      copyCount: Math.max(1, reference.quantity ?? 1),
    }))),
  }) : manualLayout, [manualLayout, sortedReferences, isTemporaryView]);
  const pageData = getTCGCustomCollectionLayoutPage(viewLayout, page);
  const pageNumber = pageData.page;
  const pageCount = pageData.pageCount;
  const gridDimensions = getTCGCustomCollectionGridDimensions(manualLayout.gridPreset);
  const visibleReferences = useMemo(() => {
    const referencesByKey = new Map(sortedReferences.map((reference) => [`${reference.language}:${reference.cardId.toLocaleLowerCase()}`, reference]));
    return pageData.cardOrder
      .map((reference) => referencesByKey.get(`${reference.language}:${reference.cardId.toLocaleLowerCase()}`))
      .filter((reference): reference is (typeof sortedReferences)[number] => Boolean(reference));
  }, [pageData, sortedReferences]);
  const visibleUniqueReferences = useMemo(() => [...new Map(visibleReferences.map((reference) => [
    `${reference.language}:${reference.cardId.toLocaleLowerCase()}`,
    reference,
  ])).values()], [visibleReferences]);
  const detailQuery = useQuery({
    queryKey: [
      ...tcgKeys.all(), 'custom-collection-page', collectionId,
      visibleUniqueReferences.map((ref) => `${ref.language}:${ref.cardId}`),
    ],
    queryFn: ({ signal }) => getTCGCustomCollectionCardDetails(visibleUniqueReferences, signal),
    enabled: mounted && syncStatus === 'ready' && Boolean(collection) && visibleReferences.length > 0
      && !metadataQuery.data && (!metadataRequired || metadataQuery.isError),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const valuationQuery = useQuery({
    queryKey: [...tcgKeys.all(), 'custom-collection-value', collectionId, valuationReferencesKey, displayCurrency],
    queryFn: ({ signal }) => fetchCustomCollectionValue(references, signal, displayCurrency, { concurrency: 3 }),
    enabled: mounted && syncStatus === 'ready' && Boolean(collection) && ownedPhysicalCount > 0,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const remove = (reference: (typeof references)[number]) => {
    setError('');
    if (!removeCard(collectionId, reference.cardId, reference.language)) setError(t('tcg.custom_collections.remove_error'));
  };

  const updateQuantity = (reference: (typeof references)[number], quantity: number) => {
    const saved = setQuantity(collectionId, reference.cardId, reference.language, quantity);
    setError(saved ? '' : t('tcg.custom_collections.save_error'));
    return saved;
  };

  const updateGridPreset = (value: string) => {
    if (value !== '2x2' && value !== '3x3' && value !== '4x3' && value !== '4x4') return;
    if (setGridPreset(collectionId, value as TCGCustomCollectionGridPreset)) {
      setError('');
      setPage(1);
    } else {
      setError(t('tcg.custom_collections.save_error'));
    }
  };

  const findLayoutIndex = (card: TCGCustomCollectionLayoutCardRef) => getTCGCustomCollectionLayoutCardIndex(manualLayout.cardOrder, card);

  const moveCardToPosition = (card: TCGCustomCollectionLayoutCardRef, requestedIndex: number, targetPage?: number) => {
    if (isTemporaryView) return;
    const move = moveTCGCustomCollectionLayoutCard(manualLayout.cardOrder, card, requestedIndex);
    if (!move || move.destinationIndex === move.sourceIndex) return;

    if (!reorderCards(collectionId, move.cardOrder)) {
      setError(t('tcg.custom_collections.save_error'));
      setMoveAnnouncement('');
      return;
    }

    const pageSize = getTCGCustomCollectionGridDimensions(manualLayout.gridPreset).capacity;
    const destinationPage = targetPage ?? Math.floor(move.destinationIndex / pageSize) + 1;
    const cardName = references.find((entry) => entry.language === card.language
      && entry.cardId.toLocaleLowerCase() === card.cardId.toLocaleLowerCase())?.cardName ?? card.cardId;
    setError('');
    if (destinationPage !== pageNumber) setPendingFocusCardId(getTCGCustomCollectionSortableId(card));
    setPage(destinationPage);
    setMoveAnnouncement(targetPage
      ? t('tcg.custom_collections.drag_drop_page', { name: cardName, page: targetPage })
      : t('tcg.custom_collections.drag_drop_position', { name: cardName, position: move.destinationIndex + 1, total: pageData.totalCards }));
  };

  const moveCard = (card: TCGCustomCollectionLayoutCardRef, move: TCGCustomCollectionCardMove) => {
    const sourceIndex = findLayoutIndex(card);
    if (sourceIndex < 0 || isTemporaryView) return;

    if (move.kind === 'step') {
      moveCardToPosition(card, sourceIndex + move.direction);
      return;
    }

    if (move.page === pageNumber) return;
    const pageSize = getTCGCustomCollectionGridDimensions(manualLayout.gridPreset).capacity;
    moveCardToPosition(card, (move.page - 1) * pageSize, move.page);
  };

  const finishCardDrag = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source, target } = event.operation;
    if (!source || !isSortable(source)) return;

    const identity = pageData.cardOrder.find((card) => getTCGCustomCollectionSortableId(card) === String(source.id));
    if (!identity) return;

    const dropPage = getBinderPageFromDropTarget(target?.id);
    if (dropPage !== null) {
      if (dropPage === pageNumber) return;
      const pageSize = getTCGCustomCollectionGridDimensions(manualLayout.gridPreset).capacity;
      moveCardToPosition(identity, (dropPage - 1) * pageSize, dropPage);
      return;
    }

    const boundedIndex = Math.max(0, Math.min(source.index, Math.max(0, pageData.cardOrder.length - 1)));
    moveCardToPosition(identity, ((pageNumber - 1) * pageData.capacity) + boundedIndex);
  };

  const currentDragAnnouncements = {
    dragstart: ({ operation }: { operation: { source: { data: Record<string, unknown> } | null } }) => {
      const name = operation.source?.data.name;
      return t('tcg.custom_collections.drag_start', { name: typeof name === 'string' ? name : '' });
    },
    dragover: ({ operation }: { operation: { source: { data: Record<string, unknown>; index?: number } | null; target: { id: string | number } | null } }) => {
      const { source, target } = operation;
      if (!source) return undefined;
      const name = typeof source.data.name === 'string' ? source.data.name : '';
      const dropPage = getBinderPageFromDropTarget(target?.id);
      if (dropPage !== null) return t('tcg.custom_collections.drag_over_page', { name, page: dropPage });
      if (typeof source.index === 'number') {
        return t('tcg.custom_collections.drag_over_position', {
          name,
          position: ((pageNumber - 1) * pageData.capacity) + source.index + 1,
          total: getTCGCustomCollectionLayoutCardCount(manualLayout.cardOrder),
        });
      }
      return undefined;
    },
    dragend: (event: DragEndEvent) => getTCGCustomCollectionDragEndAnnouncement(event, t('tcg.custom_collections.drag_cancelled')),
  };

  const confirmDelete = () => {
    if (!deleteCollection(collectionId)) {
      setError(t('tcg.custom_collections.delete_error'));
      setDeleteOpen(false);
      return;
    }
    router.push(returnHref);
  };

  const openAddPanel = (event: MouseEvent<HTMLButtonElement>) => {
    addPanelTriggerRef.current = event.currentTarget;
    setAddPanelOpen(true);
  };

  // Query data contains catalogue details. Always read quantities from the current store.
  const currentReferences = new Map(references.map((ref) => [`${ref.language}:${ref.cardId.toLocaleLowerCase()}`, ref]));
  const detailByKey = new Map<string, TCGCustomCollectionCardDetail>();
  for (const result of [...(metadataQuery.data ?? []), ...(detailQuery.data ?? [])]) {
    detailByKey.set(`${result.ref.language}:${result.ref.cardId}`, result);
  }
  const cardResults: TCGCustomCollectionBinderCardDetail[] = pageData.cardOrder.flatMap((layoutRef) => {
    const key = `${layoutRef.language}:${layoutRef.cardId.toLocaleLowerCase()}`;
    const result = detailByKey.get(key);
    const currentReference = currentReferences.get(key);
    return result && currentReference ? [{ ...result, ref: currentReference, layoutRef }] : [];
  });
  const loading = authLoading || !mounted || !hasHydrated || syncStatus === 'checking';

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell page-shell--header-offset relative space-y-6 pb-40" aria-labelledby="custom-collection-title">
        <TCGPageTabs context="collection" />
        <Breadcrumbs
          items={[
            { label: t('common.home'), href: localeHref('/') },
            { label: t('tcg.collection_title'), href: localeHref('/tcg/collection') },
            { label: collection?.name ?? t('tcg.custom_collections.title') },
          ]}
          homeLabel={t('common.home')}
          className="!px-0 !pt-0 mb-6"
        />
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true" role="status">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <span className="sr-only">{t('tcg.custom_collections.loading')}</span>
          </div>
        ) : !user || syncStatus === 'unauthenticated' ? (
          <SyncRequiredPanel headingLevel={1} />
        ) : syncStatus !== 'ready' ? (
          <SyncStatusPanel status={syncStatus} headingLevel={1} />
        ) : !collection ? (
          <section className="mx-auto max-w-2xl rounded-sm border border-border/60 bg-card/40 px-5 py-10 text-center">
            <h1 id="custom-collection-title" className="text-2xl font-black">{t('tcg.custom_collections.not_found')}</h1>
            <Link href={returnHref} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-primary/40 px-4 font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.return')}
            </Link>
          </section>
        ) : (
          <>
            <Link href={returnHref} className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.return')}
            </Link>
            <header className="flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 id="custom-collection-title" className="break-words text-2xl font-black tracking-tight sm:text-3xl">{collection.name}</h1>
                {collection.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-foreground/65">{collection.description}</p>}
                <p className="mt-3 text-sm font-bold text-primary">{t('tcg.custom_collections.cards_count', { count: binderPocketCount })}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button ref={addPanelTriggerRef} type="button" onClick={openAddPanel} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.add_cards')}
                </button>
                <button type="button" onClick={() => setFormOpen(true)} aria-label={`${t('tcg.custom_collections.edit_title')}: ${collection.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border px-3 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setDeleteOpen(true)} aria-label={`${t('tcg.custom_collections.delete')}: ${collection.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border px-3 hover:border-destructive/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <section className="rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 p-5" aria-labelledby="custom-collection-value-title" aria-busy={ownedPhysicalCount > 0 && valuationQuery.isPending}>
              <h2 id="custom-collection-value-title" className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">
                {t('tcg.custom_collections.estimated_value')}
              </h2>
              <p className="mt-1 text-xs leading-5 text-foreground/55">{t('tcg.custom_collections.estimated_value_disclaimer')}</p>
              {ownedPhysicalCount === 0 ? (
                <p className="mt-3 text-sm font-bold text-foreground/55">{t('tcg.collection_value_none_owned')}</p>
              ) : valuationQuery.isPending ? (
                <p className="mt-3 text-sm font-bold text-foreground/55" aria-live="polite">{t('tcg.collection_loading')}</p>
              ) : valuationQuery.isError ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold text-foreground/55">{t('tcg.collection_value_unavailable')}</p>
                  <button type="button" onClick={() => void valuationQuery.refetch()} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {t('tcg.custom_collections.retry')}
                  </button>
                </div>
              ) : valuationQuery.data?.groups.length ? (
                <>
                  <p className="mt-3 break-words text-2xl font-black tabular-nums text-primary">
                    {valuationQuery.data.groups.map((group) => formatCustomCollectionCurrency({ currency: group.currency, amount: group.total }, interfaceLanguage)).join(' · ')}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-foreground/55" aria-live="polite">
                    {t('tcg.collection_value_coverage', { priced: valuationQuery.data.pricedCount, owned: valuationQuery.data.ownedCount })}
                  </p>
                  {(valuationQuery.data.unpricedCount ?? 0) > 0 && (
                    <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-200/80">
                      {t('tcg.collection_value_partial', { count: valuationQuery.data.unpricedCount })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-bold text-foreground/55">{t('tcg.collection_value_unavailable')}</p>
                  <p className="mt-1 text-[11px] font-bold text-foreground/55">
                    {t('tcg.collection_value_coverage', { priced: valuationQuery.data?.pricedCount ?? 0, owned: valuationQuery.data?.ownedCount ?? ownedPhysicalCount })}
                  </p>
                  {(valuationQuery.data?.unpricedCount ?? ownedPhysicalCount) > 0 && (
                    <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-200/80">
                      {t('tcg.collection_value_partial', { count: valuationQuery.data?.unpricedCount ?? ownedPhysicalCount })}
                    </p>
                  )}
                </>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <label className="block w-full max-w-xl space-y-2 text-sm font-bold" htmlFor="custom-collection-card-filter">
                <span>{t('tcg.custom_collections.search_cards')}</span>
                <Input
                  id="custom-collection-card-filter"
                  type="search"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder={t('tcg.custom_collections.search_cards_placeholder')}
                />
              </label>
              <label className="space-y-2 text-sm font-bold">
                <span>{t('tcg.card_language')}</span>
                <select aria-label={t('tcg.card_language')} value={languageFilter} onChange={(event) => { const value = event.target.value; if (value === '' || isTCGCardLanguage(value)) { setLanguageFilter(value); setPage(1); } }} className="block min-h-11 w-full rounded-sm border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="">{t('tcg.custom_collections.all_languages')}</option>
                  {[...new Set(references.map((ref) => ref.language))].sort().map((language) => <option key={language} value={language}>{getTCGCardLanguageName(language, interfaceLanguage)}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border px-3 text-xs font-black hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Filter className="h-4 w-4" aria-hidden="true" />{t('tcg.catalog_filters')}
                {Boolean(search || languageFilter || rarityFilter || setFilter || priceOrder !== 'none') && <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-primary">{[search, languageFilter, rarityFilter, setFilter, priceOrder !== 'none' ? 'price' : ''].filter(Boolean).length}</span>}
              </button>
            </div>

            {filtersOpen && (
              <section className="rounded-sm border border-border/50 bg-card/35 p-3 sm:p-4" aria-label={t('tcg.catalog_filters')}>
                {references.length > 0 && metadataQuery.isPending ? (
                  <p role="status" aria-busy="true" className="text-sm text-muted-foreground">{t('tcg.custom_collections.loading')}</p>
                ) : metadataQuery.isError ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p>{t('tcg.custom_collections.load_error')}</p>
                    <button type="button" onClick={() => void metadataQuery.refetch()} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-3 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('tcg.custom_collections.retry')}</button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
                    <label className="space-y-1.5 text-xs font-bold">
                      <span>{t('tcg.filter_rarity')}</span>
                      <select value={rarityFilter} onChange={(event) => { setRarityFilter(event.target.value); setPage(1); }} className="block min-h-11 w-full rounded-sm border border-border bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <option value="">{t('tcg.custom_collections.all_rarities')}</option>
                        {rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1.5 text-xs font-bold">
                      <span>{t('tcg.filter_set')}</span>
                      <select value={setFilter} onChange={(event) => { setSetFilter(event.target.value); setPage(1); }} className="block min-h-11 w-full rounded-sm border border-border bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <option value="">{t('tcg.custom_collections.all_sets')}</option>
                        {sets.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1.5 text-xs font-bold">
                      <span>{t('tcg.sort_label')}</span>
                      <select value={priceOrder} onChange={(event) => { const value = event.target.value; if (value === 'none' || value === 'asc' || value === 'desc') { setPriceOrder(value); setPage(1); } }} className="block min-h-11 w-full rounded-sm border border-border bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <option value="none">{t('tcg.custom_collections.sort_added')}</option>
                        <option value="asc">{t('tcg.sort_price_asc')}</option>
                        <option value="desc">{t('tcg.sort_price_desc')}</option>
                      </select>
                    </label>
                    {(search || languageFilter || rarityFilter || setFilter || priceOrder !== 'none') && (
                      <button type="button" onClick={() => { setSearch(''); setLanguageFilter(''); setRarityFilter(''); setSetFilter(''); setPriceOrder('none'); setPage(1); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border px-3 text-xs font-bold hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t('filters.reset')}
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground sm:col-span-2 xl:col-span-full">{t('tcg.custom_collections.price_per_card')} · {displayCurrency}</p>
                  </div>
                )}
              </section>
            )}

            <p className="-mt-3 text-sm text-muted-foreground" aria-live="polite">
              {t('tcg.custom_collections.cards_count', { count: viewPocketCount })}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="block w-full max-w-xs space-y-2 text-sm font-bold" htmlFor="custom-collection-grid-preset">
                <span>{t('tcg.custom_collections.grid_layout')}</span>
                <select
                  id="custom-collection-grid-preset"
                  value={manualLayout.gridPreset}
                  onChange={(event) => updateGridPreset(event.target.value)}
                  className="block min-h-11 w-full rounded-sm border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="2x2">2 × 2</option>
                  <option value="3x3">3 × 3</option>
                  <option value="4x3">4 × 3</option>
                  <option value="4x4">4 × 4</option>
                </select>
              </label>
              {isTemporaryView && (
                <p role="status" className="max-w-2xl rounded-sm border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground/75">
                  {t('tcg.custom_collections.view_only')}
                </p>
              )}
            </div>

            {error && <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

            {detailQuery.isError && !metadataQuery.data ? (
              <div role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-5 text-sm">
                <p>{t('tcg.custom_collections.load_error')}</p>
                <button type="button" onClick={() => void detailQuery.refetch()} className="mt-3 min-h-11 rounded-sm border border-primary/40 px-4 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {t('tcg.custom_collections.retry')}
                </button>
              </div>
            ) : (
              <>
                {sortedReferences.length === 0 && (
                  <div className="rounded-sm border border-dashed border-primary/30 bg-card/30 px-5 py-6 text-center">
                    <p className="text-lg font-black">{references.length > 0 ? t('tcg.custom_collections.no_results') : t('tcg.custom_collections.no_cards')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {references.length > 0 ? t('tcg.custom_collections.no_matching_cards') : t('tcg.custom_collections.empty_binder_hint')}
                    </p>
                    {references.length === 0 && <button type="button" onClick={openAddPanel} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/45 px-4 font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.add_cards')}</button>}
                  </div>
                )}

                <DragDropProvider
                  sensors={(defaults) => [
                    ...defaults.filter((sensor) => sensor !== PointerSensor && sensor !== KeyboardSensor),
                    PointerSensor.configure({
                      activationConstraints: (event) => event.pointerType === 'touch'
                        ? [new PointerActivationConstraints.Delay({ value: 300, tolerance: 5 })]
                        : [new PointerActivationConstraints.Distance({ value: 5 })],
                      preventActivation: (event) => {
                        const target = event.target;
                        if (!(target instanceof Element) || target.closest('[data-sortable-handle="true"]')) return false;
                        return Boolean(target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]'));
                      },
                    }),
                    KeyboardSensor.configure({ offset: { x: 120, y: 120 } }),
                  ]}
                  plugins={(defaults) => defaults.map((plugin) => plugin === Accessibility
                    ? Accessibility.configure({
                      id: `tcg-custom-binder-${collectionId}`,
                      screenReaderInstructions: { draggable: t('tcg.custom_collections.drag_instructions') },
                      announcements: currentDragAnnouncements,
                    })
                    : plugin)}
                  onDragEnd={finishCardDrag}
                >
                  <TCGCustomCollectionBinderPage
                    collectionName={collection.name}
                    cards={cardResults}
                    page={pageNumber}
                    pageCount={pageCount}
                    capacity={pageData.capacity}
                    emptySlots={pageData.emptySlots}
                    columns={gridDimensions.columns}
                    rows={gridDimensions.rows}
                    totalCards={pageData.totalCards}
                    canReorder={!isTemporaryView}
                    focusCardId={pendingFocusCardId}
                    onFocusRestored={handleCardFocusRestored}
                    displayCurrency={displayCurrency}
                    loading={!metadataQuery.data && detailQuery.isPending && visibleReferences.length > 0}
                    onQuantityCommit={updateQuantity}
                    onRemove={remove}
                    onMoveCard={moveCard}
                  />
                  <nav className="flex flex-col gap-3 border-t border-border/50 pt-4" aria-label={t('tcg.custom_collections.title')}>
                    <div className="flex items-center justify-between gap-3">
                      <BinderPageDropTargetButton
                        targetKey="previous"
                        pageNumber={getTCGCustomCollectionPageNavigationTarget(pageNumber, pageCount, 'previous')}
                        activePage={pageNumber}
                        disabled={pageNumber <= 1}
                        onSelect={() => setPage(getTCGCustomCollectionPageNavigationTarget(pageNumber, pageCount, 'previous'))}
                        label={t('tcg.custom_collections.previous')}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.previous')}
                      </BinderPageDropTargetButton>
                      <span className="text-center text-xs font-bold text-muted-foreground" aria-live="polite">{t('tcg.custom_collections.page_status', { page: pageNumber, total: pageCount })}</span>
                      <BinderPageDropTargetButton
                        targetKey="next"
                        pageNumber={getTCGCustomCollectionPageNavigationTarget(pageNumber, pageCount, 'next')}
                        activePage={pageNumber}
                        disabled={pageNumber >= pageCount}
                        onSelect={() => setPage(getTCGCustomCollectionPageNavigationTarget(pageNumber, pageCount, 'next'))}
                        label={t('tcg.custom_collections.next')}
                      >
                        {t('tcg.custom_collections.next')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </BinderPageDropTargetButton>
                    </div>
                  </nav>
                  <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{moveAnnouncement}</p>
                </DragDropProvider>
              </>
            )}
          </>
        )}

        {collection && (
          <>
            {formOpen && <TCGCustomCollectionFormDialog open={formOpen} onOpenChange={setFormOpen} collection={collection} />}
            <TCGCustomCollectionAddPanel open={addPanelOpen} onOpenChange={setAddPanelOpen} returnFocusRef={addPanelTriggerRef} collectionId={collection.id} initialLanguage={browseLanguage} />
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('tcg.custom_collections.delete_confirm', { name: collection.name })}</DialogTitle>
                  <DialogDescription>{t('tcg.custom_collections.delete_inventory')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <button type="button" onClick={() => setDeleteOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('tcg.custom_collections.cancel')}</button>
                  <button type="button" onClick={confirmDelete} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-destructive px-4 font-black text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive">{t('tcg.custom_collections.delete')}</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
}

function BinderPageDropTargetButton({
  targetKey,
  pageNumber,
  activePage,
  current = false,
  disabled = false,
  onSelect,
  label,
  children,
}: {
  targetKey: string;
  pageNumber: number;
  activePage: number;
  current?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `binder-page:${pageNumber}:${targetKey}`,
    type: 'tcg-custom-binder-page',
    accept: 'tcg-custom-binder-card',
    data: { kind: 'page', page: pageNumber },
    disabled: disabled || pageNumber === activePage,
  });

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      data-binder-page-drop-target={pageNumber}
      data-binder-drop-id={`binder-page:${pageNumber}:${targetKey}`}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-sm border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${current ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50 hover:text-primary'} ${isDropTarget ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
    >
      {children}
    </button>
  );
}

function getBinderPageFromDropTarget(id: string | number | undefined): number | null {
  if (typeof id !== 'string') return null;
  const match = /^binder-page:(\d+):[a-z0-9-]+$/.exec(id);
  if (!match) return null;
  const page = Number(match[1]);
  return Number.isSafeInteger(page) && page > 0 ? page : null;
}

function formatCustomCollectionCurrency(value: { currency: string; amount: number }, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(value.amount);
  } catch {
    return `${value.amount.toFixed(2)} ${value.currency}`;
  }
}
