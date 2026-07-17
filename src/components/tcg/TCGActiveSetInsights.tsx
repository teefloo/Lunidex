'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchSetCollectionCards } from '@/lib/api/tcg';
import {
  computeActiveSetInsights,
  getRarityColor,
  getRarityLabel,
  type TCGCollectionValueGroup,
} from '@/lib/tcg-collection';
import type { TCGCardValue } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { buildTcgImageUrl } from '@/lib/tcg-images';
import type { TCGSet } from '@/types/tcg';
import { TCGProgressBar } from './TCGProgressBar';
import { useLocaleHref } from '@/hooks/useLocaleHref';

interface TCGActiveSetInsightsProps {
  set: TCGSet;
  ownedIds: Set<string>;
  resolvedLang: string;
}

function formatCurrency(group: TCGCollectionValueGroup): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group.currency,
      maximumFractionDigits: 2,
    }).format(group.total);
  } catch {
    return `${group.total.toFixed(2)} ${group.currency}`;
  }
}

function formatCardValue(value: TCGCardValue): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(value.amount);
  } catch {
    return `${value.amount.toFixed(2)} ${value.currency}`;
  }
}

export function TCGActiveSetInsights({ set, ownedIds, resolvedLang }: TCGActiveSetInsightsProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();

  const { data: cards, isLoading, isError } = useQuery({
    queryKey: ['tcg', 'collection-cards', set.id, resolvedLang],
    queryFn: ({ signal }) => fetchSetCollectionCards(set.id, resolvedLang, signal),
    staleTime: 60 * 60 * 1000,
  });

  const insights = useMemo(
    () => (cards ? computeActiveSetInsights(cards, ownedIds, 6) : null),
    [cards, ownedIds],
  );

  return (
    <div className="min-w-0 rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
      <div className="flex min-w-0 items-center gap-3">
        {set.logo && (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-card/40">
            <Image src={set.logo} alt="" width={40} height={40} className="max-h-full max-w-full object-contain p-1" unoptimized />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={localeHref(`/tcg/collection/${set.id}`)}
            aria-label={t('tcg.collection_view_set', { name: set.name })}
            className="block min-h-11 break-words rounded-sm py-3 text-sm font-bold outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {set.name}
          </Link>
          {insights && (
            <TCGProgressBar
              owned={insights.completion.owned}
              total={insights.completion.total}
              size="sm"
              className="mt-1.5"
            />
          )}
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/60">
            {t('tcg.collection_loading')}
          </span>
        </div>
      )}

      {isError && (
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-400/85">
          {t('tcg.collection_insights_error')}
        </p>
      )}

      {insights && (
        <>
          {/* Value */}
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 border-t border-border/15 pt-3">
            {/* Owned value */}
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-foreground/60">
                {t('tcg.collection_value_estimate')}
              </p>
              {insights.valuation.groups.length > 0 ? (
                <>
                  <p className="mt-1 break-words text-base font-black leading-tight text-primary sm:text-lg">
                    {insights.valuation.groups.map((g) => formatCurrency(g)).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-foreground/55">
                    {t('tcg.collection_value_coverage', {
                      priced: insights.valuation.pricedCount,
                      owned: insights.valuation.ownedCount,
                    })}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[10px] font-bold text-foreground/55">
                  {t('tcg.collection_value_none_owned')}
                </p>
              )}
            </div>
            {/* Set total value */}
            {insights.setTotalValue.length > 0 && (
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-foreground/60">
                  {t('tcg.collection_set_total_value')}
                </p>
                <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg">
                  {insights.setTotalValue.map((g) => formatCurrency(g)).join(' · ')}
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-foreground/55">
                  {insights.setTotalValue[0].count} / {insights.completion.total} {t('tcg.cards')}
                </p>
              </div>
            )}
          </div>

          {/* Top missing */}
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-foreground/60">
              {t('tcg.collection_top_missing')}
            </p>
            {insights.topMissing.length === 0 ? (
              <p className="mt-2 text-[10px] font-bold text-emerald-400/70">
                {t('tcg.collection_no_missing')}
              </p>
            ) : (
              <div className="relative">
                <div className="scroll-snap-x scrollbar-hide flex gap-2 overflow-x-auto pb-1 pr-6">
                {insights.topMissing.map((card) => {
                  const thumb = buildTcgImageUrl(card.image, 'low', 'webp');
                  return (
                  <Link
                    key={card.id}
                    href={localeHref(`/tcg/cards/${card.id}`)}
                    aria-label={t('tcg.open_card_detail', { name: card.name })}
                    className="group/card scroll-snap-align-start w-16 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    title={`${card.name} — ${getRarityLabel(card.rarity)}`}
                  >
                    <div className="relative aspect-[63/88] w-16 overflow-hidden rounded-sm border border-border/20 bg-card/40">
                      {thumb && (
                        <Image
                          src={thumb}
                          alt={card.name}
                          fill
                          sizes="64px"
                          unoptimized
                          className="object-cover opacity-80 transition-opacity group-hover/card:opacity-100"
                        />
                      )}
                    </div>
                    <p className={`mt-1 truncate text-[9px] font-black uppercase tracking-[0.04em] ${getRarityColor(card.rarity)}`}>
                      {getRarityLabel(card.rarity)}
                    </p>
                    {card.value && (
                      <p className="truncate text-[9px] font-bold text-foreground/60">
                        {formatCardValue(card.value)}
                      </p>
                    )}
                  </Link>
                  );
                })}
                </div>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card via-card/80 to-transparent"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
