'use client';

import { memo } from 'react';
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

interface TCGAlbumCardProps {
  card: TCGCard;
  owned: boolean;
  ownerships?: readonly TCGCollectionCardOwnership[];
  showMissing?: boolean;
  onView?: (card: TCGCard) => void;
  onOwnershipChange?: (owned: boolean) => void;
  collectionKey?: string;
  language?: TCGCardLanguage;
  priority?: boolean;
}

const VARIANT_LABELS: Record<TCGPhysicalVariant, string> = {
  normal: 'tcg.collection_variant_normal',
  reverse: 'tcg.collection_variant_reverse',
  holo: 'tcg.collection_variant_holo',
};

export const TCGAlbumCard = memo(function TCGAlbumCard({
  card,
  owned,
  ownerships = [],
  showMissing = true,
  onView,
  onOwnershipChange,
  collectionKey,
  priority = false,
}: TCGAlbumCardProps) {
  const { t } = useTranslation();
  const toggleOwned = usePrimeDexStore((state) => state.toggleTCGOwned);
  const toggleCollectionCard = usePrimeDexStore((state) => state.toggleTCGCollectionCard);
  const totalOwnedQuantity = ownerships.reduce((sum, ownership) => sum + ownership.quantity, 0);

  const handleCardClick = () => {
    if (!hasSyncAccess()) {
      requestSyncAccess();
      return;
    }

    const liveState = usePrimeDexStore.getState();
    const previousOwned = collectionKey
      ? liveState.isTCGCollectionCardOwned(collectionKey, card.id)
      : liveState.isTCGOwned(card.id);

    if (collectionKey) toggleCollectionCard(collectionKey, card.id);
    else toggleOwned(card.id);

    const nextState = usePrimeDexStore.getState();
    const nextOwned = collectionKey
      ? nextState.isTCGCollectionCardOwned(collectionKey, card.id)
      : nextState.isTCGOwned(card.id);
    onOwnershipChange?.(!previousOwned && nextOwned);
  };

  if (!owned && !showMissing) return null;

  return (
    <article className={cn(
      'tcg-album-card group flex min-w-0 flex-col gap-2 rounded-sm border p-1.5 shadow-[var(--shadow-pixel-sm)]',
      owned ? 'border-emerald-500/30 bg-card/40' : 'border-border/15 bg-card/20',
    )}>
      <button
        type="button"
        onClick={handleCardClick}
        className="group/card relative aspect-[2.15/3] cursor-pointer touch-manipulation overflow-hidden rounded-sm text-left transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shadow-pixel-sm)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        aria-label={t(owned ? 'tcg.activation.remove_card_aria' : 'tcg.activation.add_card_aria', { name: card.name })}
        aria-pressed={owned}
      >
        <TCGCardImage
          card={card}
          priority={priority}
          sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 45vw"
          className={cn('object-contain p-1 transition-transform group-hover/card:scale-105', !owned && 'grayscale opacity-70 group-hover/card:grayscale-0 group-hover/card:opacity-100')}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
          <p className="truncate text-[11px] font-black uppercase text-white drop-shadow-md">{card.name}</p>
          <p className="text-[11px] text-white/60">#{card.localId}</p>
        </div>
        <div className="absolute right-1 top-1"><TCGRarityBadge rarity={card.rarity} /></div>
      </button>

      {collectionKey && ownerships.length > 0 && (
        <div className="space-y-1.5" aria-label={t('tcg.collection_owned_variants', { defaultValue: 'Owned variants' })}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-foreground/45">
              {t('tcg.collection_total_owned')}
            </span>
            <span className="tabular-nums text-[11px] font-black text-primary">×{totalOwnedQuantity}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {ownerships.map((ownership) => {
              const isUnspecified = ownership.variant === 'unspecified';
              const label = ownership.variant === 'unspecified'
                ? t('tcg.collection_variant_unspecified', { defaultValue: 'Unspecified' })
                : t(VARIANT_LABELS[ownership.variant], { defaultValue: ownership.variant });
              return (
                <span
                  key={ownership.variant}
                  className={cn(
                    'rounded-sm border px-1.5 py-0.5 text-[10px] font-black uppercase',
                    isUnspecified
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
                  )}
                >
                  {label} ×{ownership.quantity}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => onView?.(card)}
          aria-label={t('detail.view_card_aria', { name: card.name })}
          className="min-h-11 w-full rounded-sm border border-border/40 bg-card/50 px-2 text-[11px] font-black uppercase tracking-[0.05em] text-foreground/70 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          {t('tcg.activation.view_card')}
        </button>
      </div>
    </article>
  );
}, areTCGAlbumCardPropsEqual);

function areTCGAlbumCardPropsEqual(previous: TCGAlbumCardProps, next: TCGAlbumCardProps): boolean {
  return previous.card.id === next.card.id
    && previous.card.name === next.card.name
    && previous.card.localId === next.card.localId
    && previous.card.image === next.card.image
    && previous.card.imageUrl === next.card.imageUrl
    && previous.card.rarity === next.card.rarity
    && previous.owned === next.owned
    && previous.showMissing === next.showMissing
    && previous.collectionKey === next.collectionKey
    && previous.language === next.language
    && previous.priority === next.priority
    && sameOwnerships(previous.ownerships ?? [], next.ownerships ?? []);
}

function sameOwnerships(
  previous: readonly TCGCollectionCardOwnership[],
  next: readonly TCGCollectionCardOwnership[],
): boolean {
  if (previous.length !== next.length) return false;
  return previous.every((entry, index) => {
    const candidate = next[index];
    return entry.cardId === candidate.cardId
      && entry.variant === candidate.variant
      && entry.quantity === candidate.quantity;
  });
}
