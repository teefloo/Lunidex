'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TCGCard,
  TCGCardLanguage,
  TCGCollectionCardOwnership,
  TCGPhysicalVariant,
} from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import { hasSyncAccess, requestSyncAccess } from '@/store/sync-access';
import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getTCGCard } from '@/lib/api/tcg';
import { getTCGValueInCurrency, getTCGVariantValue, toCollectionCard } from '@/lib/tcg-collection';
import {
  getTCGCollectionCardOwnerships,
  getTCGDefaultPhysicalVariant,
  MAX_TCG_COLLECTION_PHYSICAL_CARDS,
  TCG_PHYSICAL_VARIANTS,
} from '@primedex/core/lib/tcg-collections';

interface TCGCollectionVariantSheetProps {
  card: TCGCard;
  collectionKey: string;
  language: TCGCardLanguage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOwnershipChange?: (owned: boolean) => void;
}

const VARIANT_LABELS: Record<TCGPhysicalVariant, string> = {
  normal: 'tcg.collection_variant_normal',
  reverse: 'tcg.collection_variant_reverse',
  holo: 'tcg.collection_variant_holo',
};

const VARIANT_HINTS: Record<TCGPhysicalVariant, string> = {
  normal: 'tcg.collection_variant_normal_hint',
  reverse: 'tcg.collection_variant_reverse_hint',
  holo: 'tcg.collection_variant_holo_hint',
};

function formatPrice(amount: number | undefined, currency: string | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function quantityForVariant(
  ownerships: readonly TCGCollectionCardOwnership[],
  variant: TCGPhysicalVariant,
): number {
  return ownerships.find((ownership) => ownership.variant === variant)?.quantity ?? 0;
}

export function TCGCollectionVariantSheet({
  card,
  collectionKey,
  language,
  open,
  onOpenChange,
  onOwnershipChange,
}: TCGCollectionVariantSheetProps) {
  const { t } = useTranslation();
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const setVariantQuantity = usePrimeDexStore((state) => state.setTCGCollectionVariantQuantity);
  const adjustVariantQuantity = usePrimeDexStore((state) => state.adjustTCGCollectionVariantQuantity);
  const qualifyVariant = usePrimeDexStore((state) => state.qualifyTCGCollectionCardVariant);
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const ownerships = useMemo(
    () => getTCGCollectionCardOwnerships(collectionKey, collectionCards).filter((ownership) => ownership.cardId === card.id),
    [card.id, collectionCards, collectionKey],
  );
  const currentByVariant = useMemo(
    () => new Map(ownerships.map((ownership) => [ownership.variant, ownership.quantity])),
    [ownerships],
  );
  const totalOwnedQuantity = ownerships.reduce((sum, ownership) => sum + ownership.quantity, 0);
  const detailQuery = useQuery({
    queryKey: ['tcg', 'collection-card-detail-v2', card.id, language],
    queryFn: async ({ signal }) => {
      const detail = await getTCGCard(card.id, language, signal, { requirePricing: true });
      if (!detail) throw new Error('TCGdex card detail unavailable');
      return detail;
    },
    staleTime: 60 * 60 * 1000,
    enabled: open,
  });
  const detailCard = detailQuery.data ?? card;
  const hasLoadedDetail = Boolean(detailQuery.data);
  const defaultVariant = getTCGDefaultPhysicalVariant(detailCard.variants);
  const collectionCard = useMemo(
    () => toCollectionCard(detailCard, undefined, displayCurrency),
    [detailCard, displayCurrency],
  );
  const variantRows = useMemo(() => {
    // Set listings are summary-only. Until the lazy detail request succeeds,
    // never turn missing metadata into addable controls.
    const knownVariants = hasLoadedDetail
      ? TCG_PHYSICAL_VARIANTS.filter((variant) => detailCard.variants?.[variant] === true)
      : [];
    const ownedUnavailable = TCG_PHYSICAL_VARIANTS.filter((variant) => (
      (currentByVariant.get(variant) ?? 0) > 0 && !knownVariants.includes(variant)
    ));
    return [...knownVariants, ...ownedUnavailable] as TCGPhysicalVariant[];
  }, [currentByVariant, detailCard.variants, hasLoadedDetail]);

  useEffect(() => {
    if (!open || !hasLoadedDetail || !defaultVariant) return;
    const liveOwnerships = getTCGCollectionCardOwnerships(
      collectionKey,
      usePrimeDexStore.getState().tcgCollectionCards,
    );
    if (liveOwnerships.some((ownership) => ownership.cardId === card.id && ownership.variant === 'unspecified' && ownership.quantity > 0)) {
      qualifyVariant(collectionKey, card.id, defaultVariant);
    }
  }, [card.id, collectionKey, defaultVariant, hasLoadedDetail, open, qualifyVariant]);

  const updateQuantity = (variant: TCGPhysicalVariant, quantity: number): boolean => {
    if (!hasSyncAccess()) {
      requestSyncAccess();
      return false;
    }
    const liveState = usePrimeDexStore.getState();
    const previousOwned = liveState.isTCGCollectionCardOwned(collectionKey, card.id);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return false;
    const currentQuantity = quantityForVariant(
      getTCGCollectionCardOwnerships(collectionKey, liveState.tcgCollectionCards).filter((ownership) => ownership.cardId === card.id),
      variant,
    );
    if ((!hasLoadedDetail || detailCard.variants?.[variant] !== true) && quantity > currentQuantity) return false;
    setVariantQuantity(collectionKey, card.id, variant, quantity);
    const nextState = usePrimeDexStore.getState();
    const nextQuantity = quantityForVariant(
      getTCGCollectionCardOwnerships(collectionKey, nextState.tcgCollectionCards).filter((ownership) => ownership.cardId === card.id),
      variant,
    );
    if (nextQuantity !== quantity) return false;
    const nextOwned = nextState.isTCGCollectionCardOwned(collectionKey, card.id);
    onOwnershipChange?.(!previousOwned && nextOwned);
    return true;
  };

  const adjustQuantity = (variant: TCGPhysicalVariant, delta: number): boolean => {
    if (!hasSyncAccess()) {
      requestSyncAccess();
      return false;
    }
    if (delta > 0 && (!hasLoadedDetail || detailCard.variants?.[variant] !== true)) return false;

    const liveState = usePrimeDexStore.getState();
    const previousOwned = liveState.isTCGCollectionCardOwned(collectionKey, card.id);
    const currentQuantity = quantityForVariant(
      getTCGCollectionCardOwnerships(collectionKey, liveState.tcgCollectionCards).filter((ownership) => ownership.cardId === card.id),
      variant,
    );
    const expectedQuantity = currentQuantity + delta;
    if (expectedQuantity < 0 || expectedQuantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return false;
    adjustVariantQuantity(collectionKey, card.id, variant, delta);
    const nextState = usePrimeDexStore.getState();
    const nextQuantity = quantityForVariant(
      getTCGCollectionCardOwnerships(collectionKey, nextState.tcgCollectionCards).filter((ownership) => ownership.cardId === card.id),
      variant,
    );
    if (nextQuantity !== expectedQuantity) return false;
    const nextOwned = nextState.isTCGCollectionCardOwned(collectionKey, card.id);
    onOwnershipChange?.(!previousOwned && nextOwned);
    return true;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={`tcg-collection-variants-${card.id}`}
        side="right"
        overlayClassName="z-[400]"
        className="z-[401] w-[92vw] max-w-[480px] p-0"
      >
        <SheetHeader className="border-b border-border/40 px-5 py-4 pr-16">
          <SheetTitle className="flex min-w-0 flex-col gap-1 text-base font-black uppercase tracking-[0.08em]">
            <span className="truncate">{card.name}</span>
            <span className="text-[11px] font-bold tracking-[0.12em] text-foreground/45">#{card.localId}</span>
          </SheetTitle>
          <SheetDescription className="text-xs leading-5">
            {t('tcg.collection_variant_section_hint', { defaultValue: 'Track each finish separately. Changes are saved automatically.' })}
          </SheetDescription>
        </SheetHeader>
        <section
          aria-labelledby={`tcg-collection-variants-title-${card.id}`}
          className="space-y-3 p-5 pt-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 id={`tcg-collection-variants-title-${card.id}`} className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/80">
              {t('tcg.collection_variant_section_title', { defaultValue: 'Card finishes' })}
            </h3>
            <span className="shrink-0 rounded-sm border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-black tabular-nums text-primary" aria-live="polite">
              {t('tcg.collection_variant_total', { count: totalOwnedQuantity, defaultValue: `Total: ${totalOwnedQuantity}` })}
            </span>
          </div>
          {detailQuery.isPending && <p className="text-[11px] font-bold text-foreground/55" aria-busy="true">{t('tcg.collection_loading')}</p>}
          {detailQuery.isError && (
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-rose-300" role="alert">
              <span>{t('tcg.collection_variant_error', { defaultValue: 'Variant data unavailable.' })}</span>
              <button type="button" onClick={() => void detailQuery.refetch()} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm border border-rose-300/40 px-2 hover:bg-rose-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                {t('common.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          )}
          {variantRows.map((variant) => {
            const available = hasLoadedDetail && detailCard.variants?.[variant] === true;
            const value = available
              ? getTCGValueInCurrency(
                getTCGVariantValue(detailCard, variant, displayCurrency)
                  ?? getTCGValueInCurrency(collectionCard.variantValues?.[variant], displayCurrency),
                displayCurrency,
              )
              : null;
            return (
              <VariantQuantityRow
                key={variant}
                inputId={`tcg-variant-${card.id}-${variant}`}
                variant={variant}
                quantity={currentByVariant.get(variant) ?? 0}
                value={value}
                label={t(VARIANT_LABELS[variant], { defaultValue: variant })}
                hint={t(VARIANT_HINTS[variant], { defaultValue: variant })}
                disabled={!available}
                onChange={(quantity) => updateQuantity(variant, quantity)}
                onAdjust={(delta) => adjustQuantity(variant, delta)}
              />
            );
          })}
          {!detailQuery.isPending && !detailQuery.isError && variantRows.length === 0 && (
            <p className="text-[11px] font-bold text-foreground/55">
              {t('tcg.collection_variant_unknown', { defaultValue: 'No variant information is available for this card.' })}
            </p>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}

function VariantQuantityRow({
  inputId,
  variant,
  quantity,
  value,
  label,
  hint,
  disabled = false,
  onChange,
  onAdjust,
}: {
  inputId: string;
  variant: TCGPhysicalVariant;
  quantity: number;
  value: { amount: number; currency: string } | null;
  label: string;
  hint: string;
  disabled?: boolean;
  onChange: (quantity: number) => boolean;
  onAdjust: (delta: number) => boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(String(quantity));
  const maxQuantity = MAX_TCG_COLLECTION_PHYSICAL_CARDS;
  const unitPrice = value ? formatPrice(value.amount, value.currency) : t('tcg.collection_value_unavailable');
  const subtotal = value ? formatPrice(value.amount * quantity, value.currency) : t('tcg.collection_value_unavailable');

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const commitDraft = () => {
    const normalized = draft.trim();
    if (!normalized) {
      setDraft(String(quantity));
      return;
    }
    const nextQuantity = Number(normalized);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0 || nextQuantity > maxQuantity) {
      setDraft(String(quantity));
      return;
    }
    setDraft(String(nextQuantity));
    if (nextQuantity !== quantity && !onChange(nextQuantity)) setDraft(String(quantity));
  };

  const handleDraftChange = (nextValue: string) => {
    if (nextValue === '' || /^\d{0,5}$/.test(nextValue)) setDraft(nextValue);
  };

  return (
    <fieldset
      className={cn(
        'space-y-2 rounded-sm border p-2.5 transition-colors',
        quantity > 0 ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border/20 bg-card/35',
        disabled && 'border-border/15 bg-card/20',
      )}
      data-variant={variant}
    >
      <legend className="sr-only">{label}</legend>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <label htmlFor={inputId} className="text-[10px] font-black uppercase tracking-[0.06em] text-foreground/80">
              {label}
            </label>
            {disabled && (
              <span className="rounded-sm border border-border/25 px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-foreground/40">
                {t('tcg.collection_variant_unavailable', { defaultValue: 'Unavailable' })}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] leading-4 text-foreground/50">{hint}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-black uppercase tabular-nums',
            quantity > 0 ? 'bg-emerald-500/15 text-emerald-200' : 'bg-card/60 text-foreground/40',
          )}
          aria-live="polite"
        >
          {quantity > 0 ? `×${quantity}` : t('tcg.collection_variant_none', { defaultValue: 'None' })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          disabled={quantity <= 0}
          aria-label={t('tcg.collection_variant_decrease', { variant: label, defaultValue: `Decrease ${label}` })}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border/35 text-foreground/65 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          id={inputId}
          type="number"
          min={0}
          max={disabled ? quantity : maxQuantity}
          step={1}
          inputMode="numeric"
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitDraft();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(String(quantity));
              event.currentTarget.blur();
            }
          }}
          aria-label={t('tcg.collection_variant_quantity', { variant: label, defaultValue: `${label} quantity` })}
          className="h-11 min-w-0 flex-1 rounded-sm border border-border/35 bg-background/50 px-1 text-center text-sm font-black tabular-nums text-foreground transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => onAdjust(1)}
          disabled={disabled || quantity >= maxQuantity}
          aria-label={t('tcg.collection_variant_increase', { variant: label, defaultValue: `Increase ${label}` })}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border/35 text-foreground/65 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-t border-border/15 pt-1.5 text-[10px] font-bold text-foreground/45">
        <span>{t('tcg.collection_variant_unit_price')}: {unitPrice}</span>
        <span className="text-foreground/70">{t('tcg.collection_variant_subtotal')}: {subtotal}</span>
      </div>
    </fieldset>
  );
}
