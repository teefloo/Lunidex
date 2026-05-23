'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { cn } from '@/lib/utils';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGHolographicCard } from './TCGHolographicCard';

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
  const isList = variant === 'list';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.02, 0.22), ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex h-full flex-col gap-3',
        isList && 'sm:flex-row sm:items-start',
      )}
    >
      <TCGHolographicCard
        card={card}
        onClick={onClick}
        priority={index < 6}
        noFrame={isList}
        className={cn(
          'w-full',
          isList && 'sm:w-[128px] sm:shrink-0',
        )}
        sizes={isList ? '128px' : '(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 92vw'}
      />

      <div className={cn('min-w-0 flex-1 space-y-3', isList && 'py-1')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[9px] font-black uppercase tracking-tight text-foreground sm:text-[10px]">
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

        <div className="flex flex-nowrap items-center gap-1 overflow-hidden text-[6px] font-black uppercase tracking-[0.08em] text-foreground/40 sm:text-[7px]">
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

        <div className="flex items-center gap-1">
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
      </div>
    </motion.article>
  );
});

export const TCGCardItemSkeleton = () => {
  return <div className="aspect-[2.15/3] rounded-[0.95rem] bg-card/50 animate-pulse" />;
};

export type { TCGCardItemProps };
