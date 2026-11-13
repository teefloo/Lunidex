import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUp, GripVertical, MoreHorizontal, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import type { TCGCustomCollectionCardDetail } from '@/lib/api/tcg';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import { getCardMarketValue } from '@/lib/tcg-collection';
import { getTCGCardLanguageName } from '@/lib/tcg-language';
import type { TCGDisplayCurrency } from '@/types/tcg';
import type { TCGCustomCollectionCard, TCGCustomCollectionLayoutCardRef } from '@primedex/core/lib/tcg-custom-collections';
import { useSortable } from '@dnd-kit/react/sortable';
import { TCGImageWithFallback } from './TCGImageWithFallback';

export type TCGCustomCollectionCardMove =
  | { kind: 'step'; direction: -1 | 1 }
  | { kind: 'page'; page: number };

export function getTCGCustomCollectionSortableId(card: TCGCustomCollectionLayoutCardRef): string {
  return `binder-card:${encodeURIComponent(card.cardId)}:${card.language}:${card.copyIndex ?? 0}`;
}

export type TCGCustomCollectionBinderCardDetail = TCGCustomCollectionCardDetail & {
  layoutRef: TCGCustomCollectionLayoutCardRef;
};

export interface TCGCustomCollectionBinderPageProps {
  collectionName: string;
  cards: readonly TCGCustomCollectionBinderCardDetail[];
  page: number;
  pageCount: number;
  capacity: number;
  emptySlots: number;
  columns: number;
  rows: number;
  totalCards: number;
  canReorder: boolean;
  focusCardId?: string | null;
  onFocusRestored?: (cardId: string) => void;
  displayCurrency: TCGDisplayCurrency;
  onQuantityCommit: (card: TCGCustomCollectionCard, quantity: number) => boolean;
  onRemove: (card: TCGCustomCollectionCard) => void;
  onMoveCard: (card: TCGCustomCollectionLayoutCardRef, move: TCGCustomCollectionCardMove) => void;
  loading?: boolean;
}

type PocketSlot =
  | { kind: 'card'; detail: TCGCustomCollectionBinderCardDetail; index: number }
  | { kind: 'empty'; index: number };

type BinderActionsPresentation = 'sidebar' | 'dialog' | 'sheet';

const BINDER_ACTIONS_PANEL_ID = 'binder-card-actions-panel';

function getBinderActionsTriggerId(cardId: string): string {
  return `binder-card-actions-trigger-${encodeURIComponent(cardId)}`;
}

/** Renders one already-ordered physical page; layout ownership stays with its caller. */
export function TCGCustomCollectionBinderPage({
  collectionName,
  cards,
  page,
  pageCount,
  capacity,
  emptySlots,
  columns,
  rows,
  totalCards,
  canReorder,
  focusCardId = null,
  onFocusRestored,
  displayCurrency,
  onQuantityCommit,
  onRemove,
  onMoveCard,
  loading = false,
}: TCGCustomCollectionBinderPageProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const interfaceLanguage = useClientLanguage();
  const [actionsSelection, setActionsSelection] = useState<{ cardId: string; page: number } | null>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [actionsPresentation, setActionsPresentation] = useState<BinderActionsPresentation>('dialog');
  const pocketWidth = 232;
  const pageWidth = (columns * pocketWidth) + ((columns - 1) * 8);
  const actionsCardId = actionsSelection?.page === page && cards.some((detail) => getTCGCustomCollectionSortableId(detail.layoutRef) === actionsSelection.cardId)
    ? actionsSelection.cardId
    : null;
  const activeCardIndex = actionsCardId
    ? cards.findIndex((detail) => getTCGCustomCollectionSortableId(detail.layoutRef) === actionsCardId)
    : -1;
  const activeCard = activeCardIndex >= 0 ? cards[activeCardIndex] : null;
  const activeCardInstanceName = activeCard && (activeCard.ref.quantity ?? 1) > 1
    ? t('tcg.custom_collections.card_instance', { name: activeCard.card.name, copy: (activeCard.layoutRef.copyIndex ?? 0) + 1 })
    : activeCard?.card.name;
  const activeCardActionsLabel = activeCard
    ? t('tcg.custom_collections.card_actions', { name: activeCardInstanceName ?? activeCard.card.name })
    : null;
  const triggerId = actionsCardId ? getBinderActionsTriggerId(actionsCardId) : undefined;
  const closeActions = useCallback((restoreFocus = true) => {
    const trigger = actionsTriggerRef.current;
    setActionsSelection(null);
    if (restoreFocus && trigger) {
      window.requestAnimationFrame(() => {
        if (trigger.isConnected) trigger.focus();
      });
    }
  }, []);
  const toggleActions = useCallback((cardId: string, trigger: HTMLButtonElement) => {
    if (actionsCardId === cardId) {
      closeActions();
      return;
    }
    actionsTriggerRef.current = trigger;
    setActionsSelection({ cardId, page });
  }, [actionsCardId, closeActions, page]);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const sidebar = window.matchMedia('(min-width: 1320px)');
    const updatePresentation = () => {
      setActionsPresentation(sidebar.matches ? 'sidebar' : mobile.matches ? 'sheet' : 'dialog');
    };
    updatePresentation();
    mobile.addEventListener('change', updatePresentation);
    sidebar.addEventListener('change', updatePresentation);
    return () => {
      mobile.removeEventListener('change', updatePresentation);
      sidebar.removeEventListener('change', updatePresentation);
    };
  }, []);

  const slots: PocketSlot[] = loading
    ? Array.from({ length: capacity }, (_, index) => ({ kind: 'empty' as const, index }))
    : [
      ...cards.map((detail, index) => ({ kind: 'card' as const, detail, index })),
      ...Array.from({ length: Math.max(0, emptySlots) }, (_, index) => ({ kind: 'empty' as const, index })),
    ];

  return (
    <section
      aria-label={t('tcg.custom_collections.page_status', { page, total: pageCount })}
      aria-busy={loading}
      data-page={page}
      data-page-count={pageCount}
      data-capacity={capacity}
      data-columns={columns}
      data-rows={rows}
      className="min-w-0"
    >
      <div
        data-binder-actions-presentation={actionsPresentation}
        className="mx-auto grid w-full max-w-[80rem] grid-cols-1 gap-4 min-[1320px]:grid-cols-[minmax(0,952px)_minmax(16.5rem,1fr)]"
      >
        <ol
          aria-label={collectionName}
          data-binder-pocket-target={pocketWidth}
          data-binder-page-target={pageWidth}
          className="mx-auto grid w-full min-w-0 gap-2 md:w-[var(--binder-page-width)]"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            '--binder-page-width': `min(100%, ${pageWidth}px)`,
          } as CSSProperties}
        >
          {slots.map((slot) => {
            if (slot.kind === 'empty') {
              return (
                <li
                  key={`empty-${page}-${slot.index}`}
                  aria-label={loading ? undefined : t('tcg.custom_collections.empty_pocket')}
                  aria-hidden={loading ? true : undefined}
                  className="flex min-h-28 min-w-0 items-center justify-center rounded-sm border border-dashed border-border/70 bg-muted/15 px-1.5 text-center text-[10px] font-bold text-muted-foreground shadow-inner sm:min-h-40 sm:px-3 sm:text-xs md:min-h-0 md:py-2"
                >
                  {loading ? (
                    <span className="h-2/3 w-2/3 animate-pulse rounded-sm bg-muted/35 motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <span>{t('tcg.custom_collections.empty_pocket')}</span>
                  )}
                </li>
              );
            }

            const cardId = getTCGCustomCollectionSortableId(slot.detail.layoutRef);
            return (
              <BinderPocketCard
                key={cardId}
                detail={slot.detail}
                index={slot.index}
                page={page}
                canReorder={canReorder && !loading}
                shouldRestoreFocus={focusCardId === cardId}
                onFocusRestored={onFocusRestored}
                actionsExpanded={actionsCardId === cardId}
                actionsPanelId={actionsPresentation === 'sidebar' ? BINDER_ACTIONS_PANEL_ID : undefined}
                onToggleActions={toggleActions}
                onQuantityCommit={onQuantityCommit}
                localeHref={localeHref}
                interfaceLanguage={interfaceLanguage}
                translate={t}
              />
            );
          })}
        </ol>

        {actionsPresentation === 'sidebar' && (
          <aside
            id={BINDER_ACTIONS_PANEL_ID}
            aria-label={activeCardActionsLabel ?? t('tcg.custom_collections.card_actions_heading')}
            className="sticky top-24 self-start rounded-sm border border-border/70 bg-card/75 p-4 shadow-inner"
          >
            {activeCard && activeCardActionsLabel ? (
              <>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-black leading-snug">{activeCardActionsLabel}</h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {activeCard.card.set?.name ? `${activeCard.card.set.name} · ${activeCard.card.localId || activeCard.ref.cardId}` : activeCard.card.localId || activeCard.ref.cardId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => closeActions()}
                    aria-label={t('common.close')}
                    title={t('common.close')}
                    className="inline-flex h-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-background/70 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <BinderCardActionsFields
                  detail={activeCard}
                  index={activeCardIndex}
                  page={page}
                  pageCount={pageCount}
                  capacity={capacity}
                  totalCards={totalCards}
                  canReorder={canReorder && !loading}
                  displayCurrency={displayCurrency}
                  interfaceLanguage={interfaceLanguage}
                  onQuantityCommit={onQuantityCommit}
                  onRemove={onRemove}
                  onMoveCard={onMoveCard}
                  onClose={closeActions}
                  translate={t}
                />
              </>
            ) : (
              <div className="flex min-h-36 flex-col justify-center gap-2">
                <h2 className="text-base font-black">{t('tcg.custom_collections.card_actions_heading')}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{t('tcg.custom_collections.card_actions_hint')}</p>
              </div>
            )}
          </aside>
        )}
      </div>

      <Dialog
        open={Boolean(activeCard) && actionsPresentation === 'dialog'}
        triggerId={triggerId ?? null}
        onOpenChange={(open) => { if (!open) closeActions(); }}
      >
        {activeCard && activeCardActionsLabel && actionsPresentation === 'dialog' && (
          <DialogContent className="max-h-[85dvh] sm:max-w-md">
            <DialogHeader className="pr-8">
              <DialogTitle>{activeCardActionsLabel}</DialogTitle>
              <DialogDescription>{activeCard.card.set?.name ? `${activeCard.card.set.name} · ${activeCard.card.localId || activeCard.ref.cardId}` : activeCard.card.localId || activeCard.ref.cardId}</DialogDescription>
            </DialogHeader>
            <BinderCardActionsFields
              detail={activeCard}
              index={activeCardIndex}
              page={page}
              pageCount={pageCount}
              capacity={capacity}
              totalCards={totalCards}
              canReorder={canReorder && !loading}
              displayCurrency={displayCurrency}
              interfaceLanguage={interfaceLanguage}
              onQuantityCommit={onQuantityCommit}
              onRemove={onRemove}
              onMoveCard={onMoveCard}
              onClose={closeActions}
              translate={t}
            />
          </DialogContent>
        )}
      </Dialog>

      <Sheet
        open={Boolean(activeCard) && actionsPresentation === 'sheet'}
        triggerId={triggerId ?? null}
        onOpenChange={(open) => { if (!open) closeActions(); }}
      >
        {activeCard && activeCardActionsLabel && actionsPresentation === 'sheet' && (
          <SheetContent side="bottom" className="max-h-[82dvh] px-4 pt-6 sm:px-6">
            <SheetHeader className="p-0 pb-2 pr-12">
              <SheetTitle>{activeCardActionsLabel}</SheetTitle>
              <SheetDescription>{activeCard.card.set?.name ? `${activeCard.card.set.name} · ${activeCard.card.localId || activeCard.ref.cardId}` : activeCard.card.localId || activeCard.ref.cardId}</SheetDescription>
            </SheetHeader>
            <BinderCardActionsFields
              detail={activeCard}
              index={activeCardIndex}
              page={page}
              pageCount={pageCount}
              capacity={capacity}
              totalCards={totalCards}
              canReorder={canReorder && !loading}
              displayCurrency={displayCurrency}
              interfaceLanguage={interfaceLanguage}
              onQuantityCommit={onQuantityCommit}
              onRemove={onRemove}
              onMoveCard={onMoveCard}
              onClose={closeActions}
              translate={t}
            />
          </SheetContent>
        )}
      </Sheet>
    </section>
  );
}

function BinderPocketCard({
  detail,
  index,
  page,
  canReorder,
  shouldRestoreFocus,
  onFocusRestored,
  actionsExpanded,
  actionsPanelId,
  onToggleActions,
  onQuantityCommit,
  localeHref,
  interfaceLanguage,
  translate,
}: {
  detail: TCGCustomCollectionBinderCardDetail;
  index: number;
  page: number;
  canReorder: boolean;
  shouldRestoreFocus: boolean;
  onFocusRestored?: (cardId: string) => void;
  actionsExpanded: boolean;
  actionsPanelId?: string;
  onToggleActions: (cardId: string, trigger: HTMLButtonElement) => void;
  onQuantityCommit: (card: TCGCustomCollectionCard, quantity: number) => boolean;
  localeHref: (path: string) => string;
  interfaceLanguage: string;
  translate: ReturnType<typeof useTranslation>['t'];
}) {
  const { ref, card, unavailable, layoutRef } = detail;
  const canonicalId = getTCGCustomCollectionSortableId(layoutRef);
  const dragHandleElementRef = useRef<HTMLButtonElement | null>(null);
  const { ref: sortableRef, handleRef, isDragging } = useSortable({
    id: canonicalId,
    index,
    group: `binder-page:${page}`,
    type: 'tcg-custom-binder-card',
    accept: 'tcg-custom-binder-card',
    data: { kind: 'card', cardId: ref.cardId, language: ref.language, copyIndex: layoutRef.copyIndex ?? 0, name: card.name },
    disabled: !canReorder,
    transition: { duration: 150, easing: 'ease', idle: false },
  });
  const setDragHandleRef = useCallback((element: Element | null) => {
    handleRef(element);
    dragHandleElementRef.current = element as HTMLButtonElement | null;
  }, [handleRef]);
  useEffect(() => {
    const dragHandle = dragHandleElementRef.current;
    if (!shouldRestoreFocus || !dragHandle || !onFocusRestored) return;
    dragHandle.focus();
    onFocusRestored(canonicalId);
  }, [canonicalId, onFocusRestored, shouldRestoreFocus]);
  const cardHref = `${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}?tcgLang=${encodeURIComponent(ref.language)}`;
  const quantity = ref.quantity ?? 1;
  const owned = quantity > 0;
  const imageCandidates = getTCGCardImageCandidates(card, 'high', { allowLanguageFallback: false });
  const image = (
    <>
      <TCGImageWithFallback
        candidates={imageCandidates}
        alt={card.name}
        fill
        sizes="(max-width: 767px) 44vw, 232px"
        className={`object-contain p-1 transition-transform duration-150 group-hover/card:scale-[1.02] motion-reduce:transition-none ${owned ? '' : 'grayscale'}`}
      />
      {!owned && (
        <span aria-hidden="true" className="absolute inset-x-1 bottom-1 inline-flex min-h-7 items-center justify-center gap-1 rounded-sm border border-emerald-300/35 bg-background/90 px-1 text-[9px] font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200 md:hidden">
          <Plus className="h-3 w-3" />{translate('tcg.collection_add_card')}
        </span>
      )}
    </>
  );
  const artworkClassName = 'group/card relative block aspect-[63/88] w-full min-w-0 overflow-hidden rounded-sm border border-border/50 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const localId = card.localId || ref.cardId;
  const setAndNumber = card.set?.name ? `${card.set.name} · ${localId}` : localId;
  const instanceName = quantity > 1
    ? translate('tcg.custom_collections.card_instance', { name: card.name, copy: (layoutRef.copyIndex ?? 0) + 1 })
    : card.name;
  const dragCardLabel = quantity > 1
    ? translate('tcg.custom_collections.drag_card_copy', { name: card.name, copy: (layoutRef.copyIndex ?? 0) + 1 })
    : translate('tcg.custom_collections.drag_card', { name: card.name });
  const cardActionsLabel = translate('tcg.custom_collections.card_actions', { name: instanceName });

  return (
    <li
      ref={sortableRef}
      data-sortable-id={canonicalId}
      className={`min-w-0 rounded-sm border border-border/60 bg-card/75 p-1 shadow-inner transition-[opacity,box-shadow] sm:p-1.5 motion-reduce:transition-none ${isDragging ? 'opacity-60 ring-2 ring-primary' : ''}`}
    >
      <article className="relative flex h-full min-w-0 flex-col gap-1 sm:gap-1.5">
        <div className="relative min-w-0">
          {!owned ? (
            <button
              type="button"
              onClick={() => { onQuantityCommit(ref, 1); }}
              className={`${artworkClassName} cursor-pointer touch-manipulation text-left`}
              aria-label={translate('tcg.activation.add_card_aria', { name: card.name })}
            >
              {image}
            </button>
          ) : unavailable ? (
            <div className={artworkClassName}>{image}</div>
          ) : (
            <Link href={cardHref} className={artworkClassName} aria-label={card.name}>
              {image}
            </Link>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-px">
          {unavailable ? (
            <h2 className="line-clamp-2 break-words text-xs font-black leading-tight sm:text-sm">{card.name}</h2>
          ) : (
            <Link href={cardHref} title={card.name} className="line-clamp-2 break-words text-xs font-black leading-tight hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm">
              {card.name}
            </Link>
          )}
          <p className="line-clamp-2 break-words text-[10px] leading-tight text-muted-foreground sm:text-[11px]" title={setAndNumber}>
            {setAndNumber}
          </p>
          <p className="truncate text-[10px] font-bold leading-3 text-foreground/65 sm:text-[11px]" aria-label={getTCGCardLanguageName(ref.language, interfaceLanguage)}>
            {getTCGCardLanguageName(ref.language, interfaceLanguage)}
          </p>
          {unavailable && <p className="line-clamp-2 text-[10px] leading-tight text-amber-700 dark:text-amber-300">{translate('tcg.custom_collections.unavailable')}</p>}
        </div>

        <div className="mt-1 flex min-w-0 items-center justify-between gap-1">
          <button
            ref={setDragHandleRef}
            type="button"
            data-sortable-handle="true"
            disabled={!canReorder}
            aria-label={dragCardLabel}
            title={dragCardLabel}
            className="inline-flex h-11 min-h-11 min-w-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-sm border border-border/60 bg-background/60 text-xs font-bold text-foreground/70 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GripVertical className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{dragCardLabel}</span>
          </button>
          <button
            id={getBinderActionsTriggerId(canonicalId)}
            type="button"
            aria-label={cardActionsLabel}
            aria-haspopup={actionsPanelId ? undefined : 'dialog'}
            aria-expanded={actionsExpanded}
            aria-controls={actionsExpanded ? actionsPanelId : undefined}
            title={cardActionsLabel}
            onClick={(event) => onToggleActions(canonicalId, event.currentTarget)}
            className="inline-flex h-11 min-h-11 min-w-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-background/60 p-0 text-xs font-bold text-foreground/75 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{cardActionsLabel}</span>
          </button>
        </div>

      </article>
    </li>
  );
}

function BinderCardActionsFields({
  detail,
  index,
  page,
  pageCount,
  capacity,
  totalCards,
  canReorder,
  displayCurrency,
  interfaceLanguage,
  onQuantityCommit,
  onRemove,
  onMoveCard,
  onClose,
  translate,
}: {
  detail: TCGCustomCollectionBinderCardDetail;
  index: number;
  page: number;
  pageCount: number;
  capacity: number;
  totalCards: number;
  canReorder: boolean;
  displayCurrency: TCGDisplayCurrency;
  interfaceLanguage: string;
  onQuantityCommit: (card: TCGCustomCollectionCard, quantity: number) => boolean;
  onRemove: (card: TCGCustomCollectionCard) => void;
  onMoveCard: (card: TCGCustomCollectionLayoutCardRef, move: TCGCustomCollectionCardMove) => void;
  onClose: (restoreFocus?: boolean) => void;
  translate: ReturnType<typeof useTranslation>['t'];
}) {
  const { ref, card, layoutRef } = detail;
  const copyRef = layoutRef;
  const quantity = ref.quantity ?? 1;
  const instanceName = quantity > 1
    ? translate('tcg.custom_collections.card_instance', { name: card.name, copy: (layoutRef.copyIndex ?? 0) + 1 })
    : card.name;
  const price = getCardMarketValue(card, displayCurrency);
  const absolutePosition = ((page - 1) * capacity) + index;
  const cardActionsLabel = translate('tcg.custom_collections.card_actions', { name: instanceName });

  return (
    <div role="group" aria-label={cardActionsLabel} data-binder-actions-fields className="mt-4 min-w-0 space-y-3">
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-bold text-muted-foreground">{translate('tcg.custom_collections.quantity')}</span>
        <BinderQuantityInput
          quantity={quantity}
          ariaLabel={`${translate('tcg.custom_collections.quantity')}: ${instanceName} (${ref.language})`}
          onCommit={(next) => onQuantityCommit(ref, next)}
        />
      </label>
      {price ? (
        <div className="min-w-0" aria-label={translate('tcg.custom_collections.price_per_card')}>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{translate('tcg.custom_collections.price_per_card')}</span>
          <span className="block break-words text-sm font-black tabular-nums text-primary">{formatCustomCollectionCurrency(price, interfaceLanguage)}</span>
        </div>
      ) : (
        <p
          role="img"
          aria-label={translate('tcg.custom_collections.price_missing', { currency: displayCurrency })}
          className="break-words text-xs font-bold text-muted-foreground"
        >
          {translate('tcg.custom_collections.price_missing', { currency: displayCurrency })}
        </p>
      )}
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onMoveCard(copyRef, { kind: 'step', direction: -1 });
          }}
          disabled={!canReorder || absolutePosition === 0}
          className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-sm border border-border px-3 text-xs font-bold text-foreground/80 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={translate('tcg.custom_collections.move_earlier', { name: card.name })}
        >
          <ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{translate('tcg.custom_collections.move_earlier_short')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onMoveCard(copyRef, { kind: 'step', direction: 1 });
          }}
          disabled={!canReorder || absolutePosition >= totalCards - 1}
          className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-sm border border-border px-3 text-xs font-bold text-foreground/80 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={translate('tcg.custom_collections.move_later', { name: card.name })}
        >
          <ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{translate('tcg.custom_collections.move_later_short')}</span>
        </button>
      </div>
      <label className="block min-w-0">
        <span className="sr-only">{translate('tcg.custom_collections.move_to_page', { name: card.name })}</span>
        <select
          value=""
          disabled={!canReorder || pageCount <= 1}
          onChange={(event) => {
            const nextPage = Number(event.target.value);
            if (Number.isSafeInteger(nextPage) && nextPage >= 1 && nextPage <= pageCount) {
              onClose();
              onMoveCard(copyRef, { kind: 'page', page: nextPage });
            }
          }}
          aria-label={translate('tcg.custom_collections.move_to_page', { name: card.name })}
          className="block min-h-11 w-full min-w-0 rounded-sm border border-border bg-background px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <option value="">{translate('tcg.custom_collections.move_to_page_short')}</option>
          {Array.from({ length: pageCount }, (_, pageIndex) => pageIndex + 1)
            .filter((pageNumber) => pageNumber !== page)
            .map((pageNumber) => (
              <option key={pageNumber} value={pageNumber}>
                {translate('tcg.custom_collections.page_number', { page: pageNumber })}
              </option>
            ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          onClose(false);
          onRemove(ref);
        }}
        className="inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-2 rounded-sm border border-border px-3 text-xs font-bold text-foreground/80 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        aria-label={`${translate('tcg.custom_collections.remove_from_collection')}: ${card.name}`}
        title={translate('tcg.custom_collections.remove')}
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{translate('tcg.custom_collections.remove')}</span>
      </button>
    </div>
  );
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
    const next = value ? Number(value) : Number.NaN;
    if (!Number.isSafeInteger(next) || next < 0 || next > 9_999 || (next !== quantity && !onCommit(next))) reset();
    else setDraft({ quantity: next, value: String(next) });
  };

  return (
    <Input
      type="number"
      min={0}
      max={9999}
      step={1}
      inputMode="numeric"
      value={draft.value}
      aria-label={ariaLabel}
      className="h-11 w-full min-w-0 px-1 text-center tabular-nums"
      onChange={(event) => setDraft({ quantity, value: event.target.value })}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          reset();
        }
      }}
    />
  );
}
