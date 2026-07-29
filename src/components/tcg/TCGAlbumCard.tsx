'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TCGCard } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import { useTranslation } from '@/lib/i18n';
import { TCGRarityBadge } from './TCGRarityBadge';
import { TCGCardImage } from './TCGCardImage';

interface TCGAlbumCardProps {
  card: TCGCard;
  owned: boolean;
  showMissing?: boolean;
  onView?: () => void;
  onOwnershipChange?: (owned: boolean) => void;
}

export function TCGAlbumCard({ card, owned, showMissing = true, onView, onOwnershipChange }: TCGAlbumCardProps) {
  const { t } = useTranslation();
  const toggleOwned = usePrimeDexStore((s) => s.toggleTCGOwned);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const handleOwnership = () => {
    if (owned && !confirmingRemoval) {
      setConfirmingRemoval(true);
      return;
    }

    toggleOwned(card.id);
    setConfirmingRemoval(false);
    onOwnershipChange?.(!owned);
  };

  if (!owned && !showMissing) return null;

  return (
    <article className={cn('group flex min-w-0 flex-col gap-2 rounded-sm border p-1.5 shadow-[var(--shadow-pixel-sm)]', owned ? 'border-emerald-500/30 bg-card/40' : 'border-border/15 bg-card/20')}>
      <button
        type="button"
        onClick={onView}
        className="relative aspect-[2.15/3] overflow-hidden rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        aria-label={t('tcg.open_card_detail', { name: card.name })}
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={handleOwnership} className={cn('min-h-11 rounded-sm border px-2 text-[11px] font-black uppercase tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70', owned ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' : 'border-primary/35 bg-primary/10 text-primary hover:bg-primary/15')}>
          {owned ? (confirmingRemoval ? t('tcg.activation.confirm_remove') : t('tcg.activation.remove_owned')) : t('tcg.activation.owned_action')}
        </button>
        <button type="button" onClick={onView} className="min-h-11 rounded-sm border border-border/40 bg-card/50 px-2 text-[11px] font-black uppercase tracking-[0.05em] text-foreground/70 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
          {t('tcg.activation.view_card')}
        </button>
      </div>
    </article>
  );
}
