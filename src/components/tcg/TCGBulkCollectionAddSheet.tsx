'use client';

import { useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { getTCGCard } from '@/lib/api/tcg';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { hasSyncAccess, requestSyncAccess } from '@/store/sync-access';
import type { TCGCard, TCGPhysicalVariant } from '@/types/tcg';
import { getTCGCollectionCardQuantity, MAX_TCG_COLLECTION_PHYSICAL_CARDS, TCG_PHYSICAL_VARIANTS } from '@/lib/tcg-collections';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface TCGBulkCollectionAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionKey: string;
  language: string;
  cards: TCGCard[];
  onRemoveCard: (cardId: string) => void;
  onApplied: (newlyOwnedCardCount: number) => void;
}

interface CardDraft {
  variant: TCGPhysicalVariant | '';
  quantity: string;
}

interface UndoEntry {
  cardId: string;
  variant: TCGPhysicalVariant;
  expectedQuantity: number;
  previousQuantity: number;
}

type SheetStep = 'configure' | 'review' | 'applied' | 'undone';

const PAGE_SIZE = 12;
const VARIANT_LABELS: Record<TCGPhysicalVariant, string> = {
  normal: 'tcg.collection_variant_normal',
  reverse: 'tcg.collection_variant_reverse',
  holo: 'tcg.collection_variant_holo',
};

export function TCGBulkCollectionAddSheet({
  open,
  onOpenChange,
  collectionKey,
  language,
  cards,
  onRemoveCard,
  onApplied,
}: TCGBulkCollectionAddSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const [page, setPage] = useState(1);
  const [step, setStep] = useState<SheetStep>('configure');
  const [drafts, setDrafts] = useState<Record<string, CardDraft>>({});
  const [error, setError] = useState('');
  const [undoEntries, setUndoEntries] = useState<UndoEntry[]>([]);
  const [collectionWasRegistered, setCollectionWasRegistered] = useState(false);
  const [selectedCopyCount, setSelectedCopyCount] = useState(0);
  const [appliedCardCount, setAppliedCardCount] = useState(0);

  const pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleCards = useMemo(
    () => cards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [cards, currentPage],
  );
  const detailQueries = useQueries({
    queries: visibleCards.map((card) => ({
      queryKey: ['tcg', 'bulk-add-card-detail', card.id, language],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const detail = await getTCGCard(card.id, language, signal, { requirePricing: false });
        if (!detail) throw new Error('Card detail unavailable');
        return detail;
      },
      staleTime: 60 * 60 * 1000,
      retry: false,
      enabled: open && step === 'configure',
    })),
  });

  const currentPageDetails = useMemo(() => new Map(visibleCards.flatMap((card, index) => {
    const detail = detailQueries[index]?.data;
    return detail ? [[card.id, detail] as const] : [];
  })), [detailQueries, visibleCards]);
  const availableVariants = useMemo(() => Object.fromEntries(cards.flatMap((card) => {
    const detail = currentPageDetails.get(card.id)
      ?? queryClient.getQueryData<TCGCard>(['tcg', 'bulk-add-card-detail', card.id, language]);
    if (!detail) return [];
    return [[card.id, TCG_PHYSICAL_VARIANTS.filter((variant) => detail.variants?.[variant] === true)]];
  })), [cards, currentPageDetails, language, queryClient]);

  const allConfigured = cards.length > 0 && cards.every((card) => {
    const draft = drafts[card.id];
    const quantity = Number(draft?.quantity);
    const available = availableVariants[card.id] ?? [];
    return Boolean(draft?.variant)
      && available.includes(draft.variant as TCGPhysicalVariant)
      && Number.isSafeInteger(quantity)
      && quantity > 0
      && quantity <= MAX_TCG_COLLECTION_PHYSICAL_CARDS;
  });

  const setDraft = (cardId: string, patch: Partial<CardDraft>) => {
    setDrafts((current) => ({
      ...current,
      [cardId]: { ...(current[cardId] ?? { variant: '', quantity: '' }), ...patch },
    }));
    setError('');
  };

  const prepareReview = () => {
    if (!allConfigured) return;
    setError('');
    setStep('review');
  };

  const applySelection = () => {
    if (!hasSyncAccess()) {
      requestSyncAccess();
          setError(t('tcg.custom_collections.bulk_sync_required'));
      return;
    }
    if (!allConfigured || cards.length === 0) {
      setError(t('tcg.custom_collections.bulk_configure_every_card'));
      setStep('configure');
      return;
    }

    const currentState = usePrimeDexStore.getState();
    const additions = cards.map((card) => {
      const draft = drafts[card.id];
      const variant = draft.variant as TCGPhysicalVariant;
      const previousQuantity = getTCGCollectionCardQuantity(
        collectionKey,
        card.id,
        variant,
        currentState.tcgCollectionCards,
      );
      const quantity = Number(draft.quantity);
      return {
        cardId: card.id,
        variant,
        quantity,
        previousQuantity,
        expectedQuantity: previousQuantity + quantity,
      };
    });

    const saved = currentState.addTCGCollectionVariantQuantities(
      collectionKey,
      additions.map(({ cardId, variant, quantity }) => ({ cardId, variant, quantity })),
    );
    if (!saved) {
      setError(t('tcg.custom_collections.bulk_apply_error'));
      return;
    }

    const newOwnedCount = cards.filter((card) => !currentState.isTCGCollectionCardOwned(collectionKey, card.id)).length;
    setUndoEntries(additions.map(({ cardId, variant, expectedQuantity, previousQuantity }) => ({
      cardId,
      variant,
      expectedQuantity,
      previousQuantity,
    })));
    setCollectionWasRegistered(currentState.tcgCollections.includes(collectionKey));
    setSelectedCopyCount(additions.reduce((sum, addition) => sum + addition.quantity, 0));
    setAppliedCardCount(cards.length);
    setStep('applied');
    setError('');
    onApplied(newOwnedCount);
  };

  const undoSelection = () => {
    if (!hasSyncAccess()) {
      requestSyncAccess();
      setError(t('tcg.custom_collections.bulk_sync_required'));
      return;
    }
    const restored = usePrimeDexStore.getState().restoreTCGCollectionVariantQuantities(
      collectionKey,
      undoEntries,
      collectionWasRegistered,
    );
    if (!restored) {
      setError(t('tcg.custom_collections.bulk_undo_conflict'));
      return;
    }
    setStep('undone');
    setError('');
  };

  const finish = () => {
    setError('');
    setStep('configure');
    setUndoEntries([]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl" aria-describedby="tcg-bulk-add-description">
        {step === 'applied' || step === 'undone' ? (
          <>
            <SheetHeader>
              <SheetTitle>{step === 'applied' ? t('tcg.custom_collections.bulk_applied_title') : t('tcg.custom_collections.bulk_undone_title')}</SheetTitle>
              <SheetDescription id="tcg-bulk-add-description">
                {step === 'applied'
                  ? t('tcg.custom_collections.bulk_applied_summary', { cards: appliedCardCount, copies: selectedCopyCount })
                  : t('tcg.custom_collections.bulk_undone_summary')}
              </SheetDescription>
            </SheetHeader>
            {step === 'applied' ? (
              <div className="space-y-3 px-5" role="status" aria-live="polite">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">{t('tcg.custom_collections.bulk_applied_hint')}</p>
                <button type="button" onClick={undoSelection} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-black text-amber-800 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-100">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.bulk_undo')}
                </button>
              </div>
            ) : <p className="px-5 text-sm font-bold text-foreground/65" role="status">{t('tcg.custom_collections.bulk_undo_done')}</p>}
            {error && <p className="mx-5 text-sm font-semibold text-destructive" role="alert">{error}</p>}
            <SheetFooter>
              <button type="button" onClick={finish} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('common.done', { defaultValue: 'Done' })}
              </button>
            </SheetFooter>
          </>
        ) : step === 'review' ? (
          <>
            <SheetHeader>
              <SheetTitle>{t('tcg.custom_collections.bulk_review_title')}</SheetTitle>
              <SheetDescription id="tcg-bulk-add-description">
                {t('tcg.custom_collections.bulk_review_summary', { cards: cards.length, copies: cards.reduce((sum, card) => sum + Number(drafts[card.id]?.quantity || 0), 0) })}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
              {cards.map((card) => {
                const draft = drafts[card.id];
                const variant = draft?.variant as TCGPhysicalVariant;
                const quantity = Number(draft?.quantity);
                const existingQuantity = getTCGCollectionCardQuantity(collectionKey, card.id, variant, collectionCards);
                return (
                  <div key={card.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border/40 bg-background/30 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-bold">{card.name} <span className="font-mono text-xs text-muted-foreground">#{card.localId}</span></span>
                    <span className="text-xs text-muted-foreground">{t(VARIANT_LABELS[variant])} · +{quantity}</span>
                    <span className="text-xs text-muted-foreground">{t('tcg.custom_collections.bulk_existing_quantity', { count: existingQuantity })}</span>
                  </div>
                );
              })}
            </div>
            {error && <p className="mx-5 text-sm font-semibold text-destructive" role="alert">{error}</p>}
            <SheetFooter className="sm:flex-row sm:justify-between">
              <button type="button" onClick={() => { setStep('configure'); setError(''); }} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-4 text-sm font-bold hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('tcg.custom_collections.bulk_back_to_edit')}
              </button>
              <button type="button" onClick={applySelection} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('tcg.custom_collections.bulk_apply', { count: cards.length })}
              </button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{t('tcg.custom_collections.bulk_configure_title')}</SheetTitle>
              <SheetDescription id="tcg-bulk-add-description">
                {t('tcg.custom_collections.bulk_configure_description', { count: cards.length })}
                {` ${t('tcg.custom_collections.bulk_cancel_hint')}`}
              </SheetDescription>
            </SheetHeader>
            {cards.length === 0 ? (
              <p className="px-5 text-sm text-muted-foreground">{t('tcg.custom_collections.bulk_empty_selection')}</p>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
                  {visibleCards.map((card, index) => {
                    const query = detailQueries[index];
                    const variants = availableVariants[card.id] ?? [];
                    const draft = drafts[card.id] ?? { variant: '', quantity: '' };
                    const selectedVariant = draft.variant as TCGPhysicalVariant | '';
                    const existingQuantity = selectedVariant
                      ? getTCGCollectionCardQuantity(collectionKey, card.id, selectedVariant, collectionCards)
                      : null;
                    return (
                      <article key={card.id} className="grid gap-2 rounded-sm border border-border/45 bg-background/25 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.8fr)_7rem_auto] sm:items-end">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black">{card.name}</h3>
                          <p className="font-mono text-xs text-muted-foreground">#{card.localId} · {card.id}</p>
                          {query?.isPending && <p role="status" className="mt-1 text-[11px] text-muted-foreground">{t('tcg.custom_collections.bulk_loading_variants')}</p>}
                          {query?.isError && (
                            <div className="mt-1 flex items-center gap-2" role="alert">
                              <p className="text-[11px] text-destructive">{t('tcg.custom_collections.bulk_variant_load_error')}</p>
                              <button type="button" onClick={() => void query.refetch()} className="min-h-8 rounded-sm border border-primary/40 px-2 text-[11px] font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                {t('common.retry')}
                              </button>
                            </div>
                          )}
                          {query?.data && variants.length === 0 && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-200">{t('tcg.custom_collections.bulk_no_variants')}</p>}
                        </div>
                        <label className="space-y-1 text-xs font-bold">
                          <span>{t('tcg.custom_collections.bulk_finish')}</span>
                          <select
                            value={selectedVariant}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setDraft(card.id, { variant: TCG_PHYSICAL_VARIANTS.includes(value as TCGPhysicalVariant) ? value as TCGPhysicalVariant : '' });
                            }}
                            disabled={!query?.data || variants.length === 0}
                            aria-label={t('tcg.custom_collections.bulk_finish_for', { name: card.name })}
                            className="block min-h-11 w-full rounded-sm border border-border bg-background px-2 text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <option value="">{t('tcg.custom_collections.bulk_choose_finish')}</option>
                            {variants.map((variant) => <option key={variant} value={variant}>{t(VARIANT_LABELS[variant])}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs font-bold">
                          <span>{t('tcg.custom_collections.bulk_quantity_to_add')}</span>
                          <input
                            type="number"
                            min={1}
                            max={MAX_TCG_COLLECTION_PHYSICAL_CARDS}
                            step={1}
                            inputMode="numeric"
                            value={draft.quantity}
                            onChange={(event) => setDraft(card.id, { quantity: event.currentTarget.value })}
                            aria-label={t('tcg.custom_collections.bulk_quantity_for', { name: card.name })}
                            className="block min-h-11 w-full rounded-sm border border-border bg-background px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </label>
                        <button type="button" onClick={() => onRemoveCard(card.id)} aria-label={t('tcg.custom_collections.bulk_remove_card', { name: card.name })} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {existingQuantity !== null && (
                          <p className="text-[11px] text-muted-foreground sm:col-span-4">{t('tcg.custom_collections.bulk_existing_quantity', { count: existingQuantity })}</p>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3">
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border px-3 text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t('common.previous')}
                  </button>
                  <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">{t('tcg.custom_collections.bulk_page_status', { page: currentPage, total: pageCount })}</p>
                  <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage >= pageCount} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border px-3 text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {t('common.next')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
            {error && <p className="mx-5 text-sm font-semibold text-destructive" role="alert">{error}</p>}
            <SheetFooter className="sm:flex-row sm:justify-between">
              <button type="button" onClick={finish} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-4 text-sm font-bold hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={prepareReview} disabled={!allConfigured} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('tcg.custom_collections.bulk_review_button')}
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
