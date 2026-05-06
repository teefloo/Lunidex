'use client';

import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Eye, Heart } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { cn } from '@/lib/utils';
import { usePrimeDexStore } from '@/store/primedex';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import { PokeballIcon } from '@/components/ui/PokeballIcon';

interface TCGCardItemProps {
  card: TCGCard;
  index?: number;
  onClick?: (card: TCGCard) => void;
  variant?: 'default' | 'compact' | 'list';
}

export const TCGCardItem = memo(function TCGCardItem({
  card,
  index = 0,
  onClick,
  variant = 'default',
}: TCGCardItemProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const store = usePrimeDexStore();
  const toggleTCGWishlist = store.toggleTCGWishlist ?? (() => undefined);
  const toggleTCGWatchlist = store.toggleTCGWatchlist ?? (() => undefined);
  const isTCGWishlist = store.isTCGWishlist ?? (() => false);
  const isTCGWatchlist = store.isTCGWatchlist ?? (() => false);

  const favorite = mounted ? isTCGWishlist(card.id) : false;
  const watchlisted = mounted ? isTCGWatchlist(card.id) : false;
  const imageCandidates = useMemo(() => getTCGCardImageCandidates(card), [card]);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const wrapperClassName = variant === 'list'
    ? 'flex min-h-[104px] flex-row gap-2.5 p-2 sm:p-2.5'
    : 'flex h-full flex-col';

  const imageClassName = variant === 'list'
    ? 'h-full w-full object-contain p-1'
    : 'h-full w-full object-contain p-1.5';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.02, 0.22), ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-[0.95rem] border border-border/50 bg-card/45 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.34)]"
      data-rarity={card.rarity?.toLowerCase() ?? undefined}
      data-set={card.set?.id ?? undefined}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(card)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.(card);
          }
        }}
        className={cn(
          'group flex w-full cursor-pointer text-left transition-colors hover:bg-card/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          wrapperClassName,
        )}
        aria-label={t('tcg.open_card_detail', { name: card.name })}
      >
        <div
          className={cn(
            'relative shrink-0 overflow-hidden border border-border/40 bg-muted/40',
            variant === 'list'
              ? 'h-18 w-12 rounded-[0.85rem]'
              : 'aspect-[2.15/3] w-full rounded-t-[0.9rem]',
          )}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_72%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-white/5" />
              <div className="relative z-10 flex flex-col items-center gap-1 text-[7px] font-black uppercase tracking-[0.2em] text-foreground/45">
                <PokeballIcon className="h-6 w-6 opacity-70" />
                <span>AperÃ§u</span>
              </div>
            </div>
          )}
          <Image
            src={imageCandidates[imageIndex] ?? imageCandidates.at(-1) ?? '/images/card-placeholder.svg'}
            alt={card.name}
            fill
            sizes={variant === 'list' ? '96px' : '(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 92vw'}
            priority={index < 6}
            loading={index < 6 ? 'eager' : 'lazy'}
            className={cn(imageClassName, 'transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageIndex((current) => {
                const nextIndex = Math.min(current + 1, imageCandidates.length - 1);
                if (nextIndex >= imageCandidates.length - 1) {
                  setImageLoaded(true);
                }
                return nextIndex;
              });
            }}
          />
        </div>

        <div className={cn('min-w-0 flex-1', variant === 'list' ? 'py-[1px]' : 'p-0.5 pt-[1px]')}>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <h3 className="truncate text-[9px] font-black uppercase tracking-tight text-foreground group-hover:text-primary sm:text-[10px]">
                {card.name}
              </h3>
              <p className="mt-0.5 truncate text-[6px] font-black uppercase tracking-[0.1em] text-foreground/35 sm:text-[7px]">
                {card.set?.name ?? t('tcg.unknown')}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border/50 bg-card/65 px-1 py-0.5 text-[6px] font-black uppercase tracking-[0.1em] text-foreground/40 sm:text-[7px]">
              {card.rarity ?? t('tcg.none')}
            </span>
          </div>

          <div className="mt-0.5 flex flex-nowrap items-center gap-1 overflow-hidden text-[6px] font-black uppercase tracking-[0.08em] text-foreground/40 sm:text-[7px]">
            {card.category && (
              <span className="shrink-0 rounded-full border border-border/40 bg-muted/40 px-0.75 py-0.5">
                {card.category}
              </span>
            )}
            {card.hp ? (
              <span className="shrink-0 rounded-full border border-border/40 bg-muted/40 px-0.75 py-0.5">
                HP {card.hp}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border/40 px-2 py-[0.5px]">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleTCGWishlist(card.id);
          }}
          className={cn(
            'inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-lg border text-[6px] font-black uppercase tracking-[0.08em] transition-colors',
            favorite
              ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
              : 'border-border/45 bg-card/60 text-foreground/45 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400',
          )}
          aria-label={t('tcg.mark_favorite', { defaultValue: 'Favorite' })}
        >
          <Heart className="h-2 w-2" />
          {t('tcg.favorite_short', { defaultValue: 'Favori' })}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleTCGWatchlist(card.id);
          }}
          className={cn(
            'inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-lg border text-[6px] font-black uppercase tracking-[0.08em] transition-colors',
            watchlisted
              ? 'border-primary/30 bg-primary/12 text-primary'
              : 'border-border/45 bg-card/60 text-foreground/45 hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
          )}
          aria-label={t('tcg.mark_watchlist', { defaultValue: 'Watchlist' })}
        >
          <Eye className="h-2 w-2" />
          {t('tcg.watchlist_short', { defaultValue: 'Suivi' })}
        </button>
      </div>
    </motion.article>
  );
});

export const TCGCardItemSkeleton = () => {
  return <div className="aspect-[2.15/3] rounded-[0.95rem] bg-card/50 animate-pulse" />;
};

export type { TCGCardItemProps };
