'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertCircle, Swords, Shield, Zap, BadgeDollarSign, ChevronDown } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { tcgKeys } from '@/lib/api/keys';
import { getCardMarketValue } from '@/lib/tcg-collection';
import { cn } from '@/lib/utils';
import { TCGCardImage } from './TCGCardImage';
import { TCGRarityBadge } from './TCGRarityBadge';

interface TCGComparePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TCGComparePanel({ isOpen, onClose }: TCGComparePanelProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const store = usePrimeDexStore();
  const tcgCompareList = store.tcgCompareList;
  const removeTCGCompare = store.removeTCGCompare ?? (() => undefined);
  const clearTCGCompare = store.clearTCGCompare ?? (() => undefined);
  const [expandedAttacks, setExpandedAttacks] = useState<Record<string, boolean>>({});

  const { data, isFetching, error } = useQuery({
    queryKey: tcgKeys.compare(tcgCompareList),
    queryFn: async () => {
      const ids = tcgCompareList.map(encodeURIComponent).join(',');
      const res = await fetch(`/api/tcg/compare?ids=${ids}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ cards: TCGCard[] }>;
    },
    enabled: mounted && isOpen && tcgCompareList.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const toggleAttacks = useCallback((cardId: string) => {
    setExpandedAttacks((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }, []);

  if (!mounted || !isOpen) return null;

  const cards = data?.cards ?? [];
  const isEmpty = tcgCompareList.length === 0;
  const showLoading = isFetching && cards.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[310] flex items-start justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t('tcg.compare_title')}
    >
      <div
        className="fixed inset-0 bg-muted/45"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[311] flex h-full w-full flex-col border-l border-border bg-card shadow-[var(--shadow-pixel)] sm:max-w-[720px] lg:max-w-[960px] animate-in slide-in-from-right duration-200">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_8%,transparent),transparent)]" />

        <header className="relative flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/30 bg-primary/10">
              <Swords className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-display font-black uppercase tracking-tight text-foreground">
                {t('tcg.compare_title')}
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/35">
                {tcgCompareList.length}/4 {t('tcg.compare_cards')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <button
                type="button"
                onClick={() => clearTCGCompare()}
                className="rounded-sm border border-border/50 bg-card/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-foreground/45 transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                aria-label={t('tcg.compare_clear_all')}
              >
                <Trash2 className="mr-1 inline h-3 w-3" />
                {t('tcg.compare_clear_all')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border/60 bg-muted/60 p-2 text-foreground/70 transition-colors hover:bg-card hover:text-foreground"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto p-5 scrollbar-premium">
          {isEmpty ? (
            <EmptyCompareState />
          ) : showLoading ? (
            <CompareSkeleton count={tcgCompareList.length} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertCircle className="h-10 w-10 text-red-400/60" />
              <p className="text-sm font-bold text-foreground/50">{t('tcg.compare_error')}</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <CompareCardSlot
                  key={card.id}
                  card={card}
                  onRemove={() => removeTCGCompare(card.id)}
                  expanded={!!expandedAttacks[card.id]}
                  onToggleAttacks={() => toggleAttacks(card.id)}
                />
              ))}
              {Array.from({ length: Math.max(0, tcgCompareList.length - cards.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex aspect-[2.15/3] items-center justify-center rounded-sm border border-dashed border-border/40 bg-card/25"
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/25">
                    {t('tcg.compare_loading')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CompareCardSlot({
  card,
  onRemove,
  expanded,
  onToggleAttacks,
}: {
  card: TCGCard;
  onRemove: () => void;
  expanded: boolean;
  onToggleAttacks: () => void;
}) {
  const { t } = useTranslation();
  const marketValue = getCardMarketValue(card);
  const attacks = card.attacks ?? [];
  const weaknesses = card.weaknesses ?? [];
  const retreatCost = card.retreat ?? card.retreatCost ?? 0;

  return (
    <div className="glass-card group relative flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 rounded-sm border border-border/60 bg-muted/80 p-1 text-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
        aria-label={t('tcg.compare_remove_card')}
      >
        <X className="h-3 w-3" />
      </button>

      <div className="relative aspect-[2.15/3] w-full overflow-hidden bg-card/40">
        <TCGCardImage
          card={card}
          sizes="(min-width: 1024px) 200px, (min-width: 640px) 180px, 160px"
          className="object-contain"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-[10px] font-black uppercase tracking-tight text-foreground">
            {card.name}
          </h3>
          <p className="mt-0.5 truncate text-[7px] font-black uppercase tracking-[0.1em] text-foreground/35">
            {card.set?.name ?? t('tcg.unknown')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <TCGRarityBadge rarity={card.rarity} />
          {typeof card.hp === 'number' && (
            <span className="rounded-sm border border-border/50 bg-card/65 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-foreground/40">
              HP {card.hp}
            </span>
          )}
        </div>

        {attacks.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={onToggleAttacks}
              className="flex w-full items-center justify-between rounded-sm border border-border/30 bg-card/30 px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-foreground/40 transition-colors hover:bg-card/50"
            >
              <span className="flex items-center gap-1">
                <Swords className="h-2.5 w-2.5" />
                {t('tcg.attacks')} ({attacks.length})
              </span>
              <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', expanded && 'rotate-180')} />
            </button>
            {expanded && (
              <div className="space-y-1.5">
                {attacks.map((attack, idx) => (
                  <div key={`${attack.name}-${idx}`} className="rounded-sm bg-card/25 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[8px] font-bold text-foreground/70">
                        {attack.name}
                      </span>
                      {attack.damage && (
                        <span className="shrink-0 text-[9px] font-black text-primary/70">
                          {attack.damage}
                        </span>
                      )}
                    </div>
                    {attack.cost && attack.cost.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {attack.cost.map((c, ci) => (
                          <span
                            key={`${c}-${ci}`}
                            className="rounded-sm border border-border/40 bg-muted/40 px-1 py-px text-[6px] font-black uppercase text-foreground/35"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {weaknesses.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Shield className="h-2.5 w-2.5 shrink-0 text-foreground/30" />
            <span className="text-[7px] font-bold uppercase tracking-[0.1em] text-foreground/35">
              {t('detail.weaknesses')}:
            </span>
            <span className="text-[7px] font-bold text-foreground/50">
              {weaknesses.map((w) => `${w.type} ${w.value}`).join(' · ')}
            </span>
          </div>
        )}

        {retreatCost > 0 && (
          <div className="flex items-center gap-1.5">
            <Zap className="h-2.5 w-2.5 shrink-0 text-foreground/30" />
            <span className="text-[7px] font-bold uppercase tracking-[0.1em] text-foreground/35">
              {t('tcg.retreat_cost')}:
            </span>
            <span className="text-[7px] font-bold text-foreground/50">
              {Array.from({ length: retreatCost }).map(() => '●').join(' ')}
            </span>
          </div>
        )}

        {marketValue && (
          <div className="mt-auto flex items-center justify-between rounded-sm border border-primary/15 bg-primary/5 px-2.5 py-2">
            <div>
              <p className="text-[6px] font-black uppercase tracking-[0.16em] text-foreground/30">
                {t('tcg.market_price')}
              </p>
              <p className="text-[10px] font-black leading-tight text-primary">
                {formatMarketValue(marketValue.amount, marketValue.currency)}
              </p>
            </div>
            <BadgeDollarSign className="h-3 w-3 text-primary/20" />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCompareState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/40 bg-card/30">
        <Swords className="h-7 w-7 text-foreground/20" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-foreground/50">{t('tcg.compare_empty')}</p>
        <p className="text-xs text-foreground/30">{t('tcg.compare_empty_hint')}</p>
      </div>
    </div>
  );
}

function CompareSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[2.15/3] w-full animate-pulse rounded-sm bg-card/40" />
          <div className="h-3 w-3/4 animate-pulse rounded-sm bg-card/35" />
          <div className="h-2 w-1/2 animate-pulse rounded-sm bg-card/30" />
          <div className="h-8 w-full animate-pulse rounded-sm bg-card/25" />
        </div>
      ))}
    </div>
  );
}

function formatMarketValue(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
