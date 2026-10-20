'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { useMounted } from '@/hooks/useMounted';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { getTCGCustomCollectionCardDetails } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import { cn } from '@/lib/utils';
import { getTCGCardLanguageName, isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { filterTCGCustomCollectionCards, TCG_CUSTOM_COLLECTION_PAGE_SIZE } from '@primedex/core/lib/tcg-custom-collections';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGCustomCollectionFormDialog } from './TCGCustomCollectionFormDialog';
import { TCGCustomCollectionAddPanel } from './TCGCustomCollectionAddPanel';
import { TCGImageWithFallback } from './TCGImageWithFallback';

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
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const setQuantity = usePrimeDexStore((state) => state.setTCGCustomCollectionCardQuantity);
  const removeCard = usePrimeDexStore((state) => state.removeTCGCustomCollectionCard);
  const deleteCollection = usePrimeDexStore((state) => state.deleteTCGCustomCollection);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<TCGCardLanguage | ''>('');
  const filteredReferences = useMemo(() => languageFilter ? references.filter((ref) => ref.language === languageFilter) : references, [references, languageFilter]);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const returnHref = localeHref('/tcg/collection?view=custom');
  const pageData = useMemo(() => {
    const firstPage = filterTCGCustomCollectionCards(filteredReferences, search, 1, TCG_CUSTOM_COLLECTION_PAGE_SIZE);
    const lastPage = Math.max(1, Math.ceil(firstPage.total / TCG_CUSTOM_COLLECTION_PAGE_SIZE));
    return page > lastPage
      ? filterTCGCustomCollectionCards(filteredReferences, search, lastPage, TCG_CUSTOM_COLLECTION_PAGE_SIZE)
      : filterTCGCustomCollectionCards(filteredReferences, search, page, TCG_CUSTOM_COLLECTION_PAGE_SIZE);
  }, [page, filteredReferences, search]);
  const detailQuery = useQuery({
    queryKey: [
      ...tcgKeys.all(), 'custom-collection-page', collectionId,
      pageData.items.map((ref) => `${ref.language}:${ref.cardId}`),
    ],
    queryFn: ({ signal }) => getTCGCustomCollectionCardDetails(pageData.items, signal),
    enabled: mounted && syncStatus === 'ready' && Boolean(collection) && pageData.items.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const remove = (cardId: string, language: (typeof references)[number]['language']) => {
    setError('');
    if (!removeCard(collectionId, cardId, language)) setError(t('tcg.custom_collections.remove_error'));
  };

  const confirmDelete = () => {
    if (!deleteCollection(collectionId)) {
      setError(t('tcg.custom_collections.delete_error'));
      setDeleteOpen(false);
      return;
    }
    router.push(returnHref);
  };

  // Query data contains catalogue details. Always read quantities from the current store.
  const currentReferences = new Map(pageData.items.map((ref) => [`${ref.language}:${ref.cardId}`, ref]));
  const cardResults = (detailQuery.data ?? []).map((result) => ({ ...result, ref: currentReferences.get(`${result.ref.language}:${result.ref.cardId}`) ?? result.ref }));
  const loading = authLoading || !mounted || !hasHydrated || syncStatus === 'checking';

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell page-shell--header-offset relative space-y-6 pb-40" aria-labelledby="custom-collection-title">
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
                <h1 id="custom-collection-title" className="break-words text-2xl font-black uppercase tracking-tight sm:text-3xl">{collection.name}</h1>
                {collection.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-foreground/65">{collection.description}</p>}
                <p className="mt-3 text-sm font-bold text-primary">{t('tcg.custom_collections.cards_count', { count: references.length })}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => setAddPanelOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
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

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                <select aria-label={t('tcg.card_language')} value={languageFilter} onChange={(event) => { const value = event.target.value; if (value === '' || isTCGCardLanguage(value)) { setLanguageFilter(value); setPage(1); } }} className="block min-h-11 rounded-sm border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="">{t('tcg.custom_collections.all_languages')}</option>
                  {[...new Set(references.map((ref) => ref.language))].sort().map((language) => <option key={language} value={language}>{getTCGCardLanguageName(language, interfaceLanguage)}</option>)}
                </select>
              </label>
              <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
                {t('tcg.custom_collections.cards_count', { count: pageData.total })}
              </p>
            </div>

            {error && <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

            {detailQuery.isError ? (
              <div role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-5 text-sm">
                <p>{t('tcg.custom_collections.load_error')}</p>
                <button type="button" onClick={() => void detailQuery.refetch()} className="mt-3 min-h-11 rounded-sm border border-primary/40 px-4 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {t('tcg.custom_collections.retry')}
                </button>
              </div>
            ) : detailQuery.isPending && pageData.items.length > 0 ? (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-busy="true" role="status">
                {Array.from({ length: Math.min(pageData.items.length, 12) }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-sm bg-muted/40" />)}
              </div>
            ) : pageData.total === 0 ? (
              <div className="rounded-sm border border-dashed border-primary/30 bg-card/30 px-5 py-10 text-center">
                <p className="text-lg font-black">{search ? t('tcg.custom_collections.no_results') : t('tcg.custom_collections.no_cards')}</p>
                {!search && <button type="button" onClick={() => setAddPanelOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/45 px-4 font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.add_cards')}</button>}
              </div>
            ) : (
              <>
                <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-label={collection.name}>
                  {cardResults.map(({ ref, card, unavailable }) => {
                    const cardHref = `${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}?tcgLang=${encodeURIComponent(ref.language)}`;
                    const quantity = ref.quantity ?? 1;
                    const owned = quantity > 0;
                    const imageCandidates = getTCGCardImageCandidates(card, 'high', { allowLanguageFallback: false });
                    const imageContent = (
                      <>
                        <TCGImageWithFallback
                          candidates={imageCandidates}
                          alt={card.name}
                          fill
                          sizes="(min-width: 1280px) 160px, (min-width: 640px) 25vw, 45vw"
                          className={cn(
                            'object-contain p-1 transition-[filter,opacity,transform] duration-150 motion-reduce:transition-none',
                            !owned && 'grayscale opacity-70 group-hover/card:grayscale-0 group-hover/card:opacity-100 group-hover/card:scale-[1.02]',
                            owned && 'group-hover/card:scale-[1.02]',
                          )}
                        />
                        {!owned && (
                          <span aria-hidden="true" className="absolute left-1 top-1 inline-flex min-h-7 items-center gap-1 rounded-sm border border-emerald-300/35 bg-black/75 px-2 text-[10px] font-black uppercase tracking-[0.05em] text-emerald-100">
                            <Plus className="h-3 w-3" />{t('tcg.collection_add_card')}
                          </span>
                        )}
                      </>
                    );
                    const imageFrameClassName = 'relative block aspect-[2.5/3.5] w-full overflow-hidden rounded-sm bg-muted/30';
                    return (
                      <li key={`${ref.collectionId}:${ref.language}:${ref.cardId}`} className="flex min-w-0 flex-col rounded-sm border border-border/50 bg-card/50 p-2 shadow-[var(--shadow-pixel-sm)]">
                        {!owned ? (
                          <button
                            type="button"
                            onClick={() => { if (!setQuantity(collectionId, ref.cardId, ref.language, 1)) setError(t('tcg.custom_collections.save_error')); }}
                            className={cn(imageFrameClassName, 'group/card cursor-pointer touch-manipulation text-left transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shadow-pixel-sm)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 motion-reduce:transition-none')}
                            aria-label={t('tcg.activation.add_card_aria', { name: card.name })}
                          >
                            {imageContent}
                          </button>
                        ) : unavailable ? (
                          <div className={imageFrameClassName}>{imageContent}</div>
                        ) : (
                          <Link href={cardHref} className={cn(imageFrameClassName, 'group/card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary')} aria-label={card.name}>
                            {imageContent}
                          </Link>
                        )}
                        <div className="mt-2 min-w-0 flex-1">
                          {unavailable ? <h2 className="line-clamp-2 min-h-10 break-words text-xs font-black">{card.name}</h2> : <Link href={cardHref} className="line-clamp-2 min-h-10 break-words text-xs font-black hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{card.name}</Link>}
                          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{ref.cardId}</p>
                          <p className="mt-1 text-xs font-bold">{getTCGCardLanguageName(ref.language, interfaceLanguage)} · {ref.language.toUpperCase()}</p>
                          {card.set?.name && <p className="mt-1 text-xs text-muted-foreground">{card.set.name}</p>}
                          <label className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span>{t('tcg.custom_collections.quantity')}</span>
                            <BinderQuantityInput quantity={quantity} ariaLabel={`${t('tcg.custom_collections.quantity')}: ${card.name} (${ref.language})`} onCommit={(next) => {
                              const saved = setQuantity(collectionId, ref.cardId, ref.language, next);
                              setError(saved ? '' : t('tcg.custom_collections.save_error'));
                              return saved;
                            }} />
                          </label>
                          <p aria-live="polite" className="mt-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                            <span>{t('tcg.custom_collections.binder_ownership')}: </span>
                            <span className={owned ? 'text-emerald-700 dark:text-emerald-300' : ''}>{t(owned ? 'tcg.custom_collections.possession_owned' : 'tcg.custom_collections.possession_not_owned')}</span>
                          </p>
                          {unavailable && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-amber-700 dark:text-amber-300">{t('tcg.custom_collections.unavailable')}</p>}
                        </div>
                        <button type="button" onClick={() => remove(ref.cardId, ref.language)} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-2 text-xs font-bold text-foreground/75 hover:border-destructive/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive" aria-label={`${t('tcg.custom_collections.remove_from_collection')}: ${card.name}`}>
                          {t('tcg.custom_collections.remove')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <nav className="flex items-center justify-between gap-3 border-t border-border/50 pt-4" aria-label={t('tcg.custom_collections.title')}>
                  <button type="button" onClick={() => setPage(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border px-4 font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.previous')}
                  </button>
                  <span className="text-center text-xs font-bold text-muted-foreground">{pageData.page} / {Math.max(1, Math.ceil(pageData.total / TCG_CUSTOM_COLLECTION_PAGE_SIZE))}</span>
                  <button type="button" onClick={() => setPage(pageData.page + 1)} disabled={!pageData.hasNextPage} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border px-4 font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {t('tcg.custom_collections.next')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              </>
            )}
          </>
        )}

        {collection && (
          <>
            {formOpen && <TCGCustomCollectionFormDialog open={formOpen} onOpenChange={setFormOpen} collection={collection} />}
            <TCGCustomCollectionAddPanel open={addPanelOpen} onOpenChange={setAddPanelOpen} collectionId={collection.id} initialLanguage={browseLanguage} />
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


function BinderQuantityInput({ quantity, ariaLabel, onCommit }: {
  quantity: number;
  ariaLabel: string;
  onCommit: (quantity: number) => boolean;
}) {
  const [draft, setDraft] = useState({ quantity, value: String(quantity) });
  if (draft.quantity !== quantity) setDraft({ quantity, value: String(quantity) });
  const reset = () => setDraft({ quantity, value: String(quantity) });
  const commit = () => {
    const value = draft.value.trim();
    const next = value ? Number(value) : NaN;
    if (!Number.isSafeInteger(next) || next < 0 || next > 9_999 || (next !== quantity && !onCommit(next))) reset();
    else setDraft({ quantity: next, value: String(next) });
  };
  return <Input type="number" min={0} max={9999} step={1} value={draft.value} aria-label={ariaLabel} className="h-11 w-20"
    onChange={(event) => setDraft({ quantity, value: event.target.value })}
    onBlur={commit}
    onKeyDown={(event) => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); reset(); }
    }} />;
}
