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
import { TCGRarityBadge } from './TCGRarityBadge';
import { TCGCardImage } from './TCGCardImage';
import { getTCGCard } from '@/lib/api/tcg';
import { getTCGValueInCurrency, getTCGVariantValue, toCollectionCard } from '@/lib/tcg-collection';
import {
  getTCGCollectionCardOwnerships,
  getTCGDefaultPhysicalVariant,
  TCG_DEFAULT_VARIANT_ORDER,
} from '@primedex/core/lib/tcg-collections';

interface TCGAlbumCardProps {
  card: TCGCard;
  owned: boolean;
  ownerships?: readonly TCGCollectionCardOwnership[];
  showMissing?: boolean;
  onView?: () => void;
  onOwnershipChange?: (owned: boolean) => void;
  collectionKey?: string;
  language?: TCGCardLanguage;
}

const VARIANT_LABELS: Record<TCGPhysicalVariant, string> = {
  normal: 'tcg.collection_variant_normal',
  reverse: 'tcg.collection_variant_reverse',
  holo: 'tcg.collection_variant_holo',
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

export function TCGAlbumCard({
  card,
  owned,
  ownerships = [],
  showMissing = true,
  onView,
  onOwnershipChange,
  collectionKey,
  language = 'en',
}: TCGAlbumCardProps) {
  const { t } = useTranslation();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const toggleOwned = usePrimeDexStore((s) => s.toggleTCGOwned);
  const setVariantQuantity = usePrimeDexStore((s) => s.setTCGCollectionVariantQuantity);
  const qualifyVariant = usePrimeDexStore((s) => s.qualifyTCGCollectionCardVariant);
  const displayCurrency = usePrimeDexStore((s) => s.tcgDisplayCurrency);
  const detailQuery = useQuery({
    queryKey: ['tcg', 'collection-card-detail', card.id, language],
    queryFn: async ({ signal }) => {
      const detail = await getTCGCard(card.id, language, signal, { requirePricing: true });
      if (!detail) throw new Error('TCGdex card detail unavailable');
      return detail;
    },
    staleTime: 60 * 60 * 1000,
    enabled: Boolean(collectionKey && isPanelOpen),
  });

  const detailCard = detailQuery.data ?? card;
  const hasLoadedDetail = Boolean(detailQuery.data);
  const defaultVariant = useMemo(
    () => getTCGDefaultPhysicalVariant(detailCard.variants),
    [detailCard.variants],
  );
  const collectionCard = useMemo(
    () => toCollectionCard(detailCard, undefined, displayCurrency),
    [detailCard, displayCurrency],
  );
  const currentByVariant = useMemo(
    () => new Map(ownerships.map((ownership) => [ownership.variant, ownership.quantity])),
    [ownerships],
  );
  const variantRows = useMemo(() => {
    // A set listing is intentionally summary-only. Until the lazy detail
    // request succeeds, never turn missing metadata into addable controls.
    const knownVariants = hasLoadedDetail
      ? TCG_DEFAULT_VARIANT_ORDER.filter((variant) => detailCard.variants?.[variant] === true)
      : [];
    const ownedUnavailable = TCG_DEFAULT_VARIANT_ORDER.filter((variant) => (
      (currentByVariant.get(variant) ?? 0) > 0 && !knownVariants.includes(variant)
    ));
    return [...knownVariants, ...ownedUnavailable] as TCGPhysicalVariant[];
  }, [currentByVariant, detailCard.variants, hasLoadedDetail]);
  const totalOwnedQuantity = ownerships.reduce((sum, ownership) => sum + ownership.quantity, 0);

  useEffect(() => {
    if (!collectionKey || !hasLoadedDetail || !defaultVariant) return;
    const liveOwnerships = getTCGCollectionCardOwnerships(
      collectionKey,
      usePrimeDexStore.getState().tcgCollectionCards,
    );
    if (liveOwnerships.some((ownership) => ownership.variant === 'unspecified' && ownership.quantity > 0)) {
      qualifyVariant(collectionKey, card.id, defaultVariant);
    }
  }, [card.id, collectionKey, defaultVariant, hasLoadedDetail, qualifyVariant]);

  const handleCardClick = () => {
    if (collectionKey) {
      if (!hasSyncAccess()) {
        requestSyncAccess();
        return;
      }
      setIsPanelOpen((value) => !value);
      return;
    }
    if (!hasSyncAccess()) {
      requestSyncAccess();
      return;
    }
    toggleOwned(card.id);
    onOwnershipChange?.(!owned);
  };

  const updateQuantity = (variant: TCGPhysicalVariant, quantity: number) => {
    if (!collectionKey || !hasSyncAccess()) {
      if (!hasSyncAccess()) requestSyncAccess();
      return;
    }
    const liveState = usePrimeDexStore.getState();
    const previousOwned = liveState.isTCGCollectionCardOwned(collectionKey, card.id);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10_000) return;
    const safeQuantity = quantity;
    const currentQuantity = quantityForVariant(
      getTCGCollectionCardOwnerships(collectionKey, liveState.tcgCollectionCards),
      variant,
    );
    if ((!hasLoadedDetail || detailCard.variants?.[variant] !== true) && safeQuantity > currentQuantity) return;
    setVariantQuantity(collectionKey, card.id, variant, safeQuantity);
    const nextOwned = usePrimeDexStore.getState().isTCGCollectionCardOwned(collectionKey, card.id);
    onOwnershipChange?.(!previousOwned && nextOwned);
  };

  const adjustQuantity = (variant: TCGPhysicalVariant, delta: number) => {
    if (!collectionKey) return;
    const currentQuantity = quantityForVariant(
      getTCGCollectionCardOwnerships(collectionKey, usePrimeDexStore.getState().tcgCollectionCards),
      variant,
    );
    updateQuantity(variant, currentQuantity + delta);
  };

  if (!owned && !showMissing) return null;

  return (
    <article className={cn('group flex min-w-0 flex-col gap-2 rounded-sm border p-1.5 shadow-[var(--shadow-pixel-sm)]', owned ? 'border-emerald-500/30 bg-card/40' : 'border-border/15 bg-card/20')}>
      <button
        type="button"
        onClick={handleCardClick}
        className="relative aspect-[2.15/3] cursor-pointer overflow-hidden rounded-sm text-left transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shadow-pixel-sm)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        aria-label={t(collectionKey ? 'tcg.collection_manage_variants' : (owned ? 'tcg.activation.remove_card_aria' : 'tcg.activation.add_card_aria'), { name: card.name, defaultValue: collectionKey ? `Manage variants for ${card.name}` : undefined })}
        aria-pressed={collectionKey ? isPanelOpen : owned}
        aria-expanded={collectionKey ? isPanelOpen : undefined}
        aria-controls={collectionKey ? `tcg-variants-${card.id}` : undefined}
      >
        {card.image ? (
          <TCGCardImage card={card} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 45vw" className={cn('object-contain p-1 transition-transform group-hover:scale-105', !owned && 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100')} />
        ) : (
          <div className="flex h-full items-center justify-center"><span className="text-[11px] font-bold uppercase text-foreground/30">{card.name}</span></div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
          <p className="truncate text-[11px] font-black uppercase text-white drop-shadow-md">{card.name}</p>
          <p className="text-[11px] text-white/60">#{card.localId}</p>
        </div>
        <div className="absolute right-1 top-1"><TCGRarityBadge rarity={card.rarity} /></div>
      </button>

      {collectionKey && ownerships.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label={t('tcg.collection_owned_variants', { defaultValue: 'Owned variants' })}>
          <span className="rounded-sm border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-primary">
            {t('tcg.collection_total_owned')} ×{totalOwnedQuantity}
          </span>
          {ownerships.map((ownership) => {
            if (ownership.variant === 'unspecified') return null;
            return (
              <span key={ownership.variant} className="rounded-sm border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-200">
                {t(VARIANT_LABELS[ownership.variant], { defaultValue: ownership.variant })} ×{ownership.quantity}
              </span>
            );
          })}
        </div>
      )}

      <div className="pt-0.5">
        <button type="button" onClick={onView} className="min-h-11 w-full rounded-sm border border-border/40 bg-card/50 px-2 text-[11px] font-black uppercase tracking-[0.05em] text-foreground/70 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
          {t('tcg.activation.view_card')}
        </button>
      </div>

      {collectionKey && isPanelOpen && (
        <div id={`tcg-variants-${card.id}`} role="region" aria-label={t('tcg.collection_manage_variants', { name: card.name, defaultValue: `Manage variants for ${card.name}` })} className="space-y-2 rounded-sm border border-primary/20 bg-primary/5 p-2">
          {detailQuery.isPending && <p className="text-[11px] font-bold text-foreground/55" aria-busy="true">{t('tcg.collection_loading')}</p>}
          {detailQuery.isError && <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-rose-300"><span>{t('tcg.collection_variant_error', { defaultValue: 'Variant data unavailable.' })}</span><button type="button" onClick={() => void detailQuery.refetch()} className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-rose-300/40 px-2 hover:bg-rose-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"><RefreshCw className="h-3 w-3" aria-hidden="true" />{t('common.retry', { defaultValue: 'Retry' })}</button></div>}
          {variantRows.map((variant) => {
            const available = hasLoadedDetail && detailCard.variants?.[variant] === true;
            const value = available
              ? getTCGValueInCurrency(
                getTCGVariantValue(detailCard, variant, displayCurrency)
                  ?? getTCGValueInCurrency(collectionCard.variantValues?.[variant], displayCurrency),
                displayCurrency,
              )
              : null;
            return <VariantQuantityRow key={variant} variant={variant} quantity={currentByVariant.get(variant) ?? 0} value={value} label={t(VARIANT_LABELS[variant], { defaultValue: variant })} disabled={!available} onChange={(quantity) => updateQuantity(variant, quantity)} onAdjust={(delta) => adjustQuantity(variant, delta)} />;
          })}
          {!detailQuery.isPending && !detailQuery.isError && variantRows.length === 0 && <p className="text-[11px] font-bold text-foreground/55">{t('tcg.collection_variant_unknown', { defaultValue: 'No variant information is available for this card.' })}</p>}
        </div>
      )}
    </article>
  );
}

function VariantQuantityRow({
  variant,
  quantity,
  value,
  label,
  disabled = false,
  onChange,
  onAdjust,
}: {
  variant: TCGPhysicalVariant;
  quantity: number;
  value: { amount: number; currency: string } | null;
  label: string;
  disabled?: boolean;
  onChange: (quantity: number) => void;
  onAdjust: (delta: number) => void;
}) {
  const { t } = useTranslation();
  const canAdd = !disabled;
  const unitPrice = value ? formatPrice(value.amount, value.currency) : t('tcg.collection_value_unavailable');
  const subtotal = value ? formatPrice(value.amount * quantity, value.currency) : t('tcg.collection_value_unavailable');
  return (
    <div className="space-y-1 rounded-sm border border-border/20 bg-card/40 p-1.5" data-variant={variant}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.06em] text-foreground/70">{label}</span>
        <div className="text-right text-[10px] font-bold text-foreground/50">
          <span className="block">{t('tcg.collection_variant_unit_price')}: {unitPrice}</span>
          <span className="block text-foreground/70">{t('tcg.collection_variant_subtotal')}: {subtotal}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onAdjust(-1)} disabled={quantity <= 0} aria-label={t('tcg.collection_variant_decrease', { variant: label, defaultValue: `Decrease ${label}` })} className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border/35 text-foreground/65 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"><Minus className="h-3 w-3" aria-hidden="true" /></button>
        <input type="number" min={0} max={disabled ? quantity : 10_000} step={1} value={quantity} onChange={(event) => onChange(Number(event.target.value))} aria-label={t('tcg.collection_variant_quantity', { variant: label, defaultValue: `${label} quantity` })} className="h-8 min-w-0 flex-1 rounded-sm border border-border/35 bg-background/50 px-1 text-center text-xs font-black text-foreground focus:border-primary/50 focus:outline-none" />
        <button type="button" onClick={() => onAdjust(1)} disabled={!canAdd || quantity >= 10_000} aria-label={t('tcg.collection_variant_increase', { variant: label, defaultValue: `Increase ${label}` })} className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border/35 text-foreground/65 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"><Plus className="h-3 w-3" aria-hidden="true" /></button>
      </div>
    </div>
  );
}
