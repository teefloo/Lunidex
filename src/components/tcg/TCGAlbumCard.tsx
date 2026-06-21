'use client';

import { cn } from '@/lib/utils';
import type { TCGCard } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGRarityBadge } from './TCGRarityBadge';
import { TCGCardImage } from './TCGCardImage';

interface TCGAlbumCardProps {
  card: TCGCard;
  owned: boolean;
  showMissing?: boolean;
  onClick?: () => void;
}

export function TCGAlbumCard({ card, owned, showMissing = true, onClick }: TCGAlbumCardProps) {
  const toggleOwned = usePrimeDexStore((s) => s.toggleTCGOwned);

  const handleClick = () => {
    toggleOwned(card.id);
    onClick?.();
  };

  if (!owned && !showMissing) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group relative aspect-[2.15/3] overflow-hidden rounded-sm border transition-all duration-100 hover:border-primary/30 hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 shadow-[var(--shadow-pixel-sm)]',
        owned
          ? 'border-emerald-500/30 bg-card/40'
          : 'border-border/15 bg-card/20 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'
      )}
    >
      {card.image ? (
        <TCGCardImage
          card={card}
          sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 45vw"
          className="object-contain p-1 transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="text-[9px] font-bold uppercase text-foreground/30">{card.name}</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
        <p className="truncate text-[8px] font-black uppercase text-white drop-shadow-md">
          {card.name}
        </p>
        <p className="text-[7px] text-white/60">#{card.localId}</p>
      </div>
      <div className="absolute right-1 top-1">
        <TCGRarityBadge rarity={card.rarity} />
      </div>
      {owned && (
        <div className="absolute right-1 top-8">
          <div className="flex h-4 w-4 items-center justify-center rounded-none bg-emerald-500/80">
            <span className="text-[7px] font-black text-white">&#10003;</span>
          </div>
        </div>
      )}
    </button>
  );
}
