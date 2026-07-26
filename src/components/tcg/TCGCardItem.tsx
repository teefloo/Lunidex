'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { PackageCheck } from 'lucide-react';
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
  const toggleTCGOwned = store.toggleTCGOwned ?? (() => undefined);
  const isTCGOwned = store.isTCGOwned ?? (() => false);

  const owned = mounted ? isTCGOwned(card.id) : false;
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
        priority={index < 2}
        noFrame={isList}
        className={cn(
          'w-full',
          isList && 'sm:w-[128px] sm:shrink-0',
        )}
        sizes={isList ? '128px' : '(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 92vw'}
      />

      <div className={cn('min-w-0 flex-1 space-y-3', isList && 'py-1')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 max-w-full overflow-hidden break-words text-xs font-black uppercase tracking-tight text-foreground sm:text-[13px]">
              {card.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60 sm:text-xs">
              {card.set?.name ?? t('tcg.unknown')}
            </p>
          </div>

          <span className="min-w-0 max-w-[48%] break-words rounded-sm border border-border/50 bg-card/65 px-1 py-0.5 text-right text-[11px] font-black uppercase leading-tight tracking-[0.1em] text-foreground/70 sm:max-w-none sm:shrink-0 sm:text-xs">
            {card.rarity ?? t('tcg.none')}
          </span>
        </div>

        <div className="flex flex-nowrap items-center gap-1 overflow-hidden text-[11px] font-black uppercase tracking-[0.08em] text-foreground/65 sm:text-xs">
          {card.category && (
            <span className="shrink-0 rounded-sm border border-border/40 bg-muted/40 px-0.75 py-0.5">
              {card.category}
            </span>
          )}
          {card.hp ? (
            <span className="shrink-0 rounded-sm border border-border/40 bg-muted/40 px-0.75 py-0.5">
              HP {card.hp}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleTCGOwned(card.id);
          }}
          className={cn(
            'touch-target inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border text-[11px] font-black uppercase tracking-[0.08em] transition-[color,background-color,border-color]',
            owned
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
              : 'border-border/45 bg-card/60 text-foreground/45 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400',
          )}
          aria-label={t('tcg.owned_short')}
        >
          <PackageCheck className="h-2 w-2" />
          {t('tcg.owned_short')}
        </button>
      </div>
    </motion.article>
  );
});

export const TCGCardItemSkeleton = () => {
  return <div className="aspect-[2.15/3] rounded-[0.95rem] bg-card/50 animate-pulse" />;
};

export type { TCGCardItemProps };
