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
    <div className="rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
      <div className="flex items-center gap-3">
        {set.logo && (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-card/40">
            <Image src={set.logo} alt={set.name} fill sizes="40px" className="object-contain p-1" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/tcg/collection/${set.id}`} className="block truncate text-sm font-bold hover:text-primary">
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
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/40">
            {set.name}
          </span>
        </div>
      )}

      {isError && (
        <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.1em] text-rose-400/70">
          {t('tcg.collection_insights_error')}
        </p>
      )}

      {insights && (
        <>
          {/* Value */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/15 pt-3">
            {/* Owned value */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
                {t('tcg.collection_value_estimate')}
              </p>
              {insights.valuation.groups.length > 0 ? (
                <>
                  <p className="mt-1 text-lg font-black leading-none text-primary">
                    {insights.valuation.groups.map((g) => formatCurrency(g)).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-[8px] font-bold text-foreground/30">
                    {t('tcg.collection_value_coverage', {
                      priced: insights.valuation.pricedCount,
                      owned: insights.valuation.ownedCount,
                    })}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[10px] font-bold text-foreground/30">
                  {t('tcg.collection_value_none_owned')}
                </p>
              )}
            </div>
            {/* Set total value */}
            {insights.setTotalValue.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
                  {t('tcg.collection_set_total_value')}
                </p>
                <p className="mt-1 text-lg font-black leading-none">
                  {insights.setTotalValue.map((g) => formatCurrency(g)).join(' · ')}
                </p>
                <p className="mt-0.5 text-[8px] font-bold text-foreground/30">
                  {insights.setTotalValue[0].count} / {insights.completion.total} {t('tcg.cards')}
                </p>
              </div>
            )}
          </div>

          {/* Top missing */}
          <div className="mt-4">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
              {t('tcg.collection_top_missing')}
            </p>
            {insights.topMissing.length === 0 ? (
              <p className="mt-2 text-[10px] font-bold text-emerald-400/70">
                {t('tcg.collection_no_missing')}
              </p>
            ) : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {insights.topMissing.map((card) => {
                  const thumb = buildTcgImageUrl(card.image, 'low', 'webp');
                  return (
                  <Link
                    key={card.id}
                    href={`/tcg/cards/${card.id}`}
                    className="group/card w-16 shrink-0"
                    title={`${card.name} — ${getRarityLabel(card.rarity)}`}
                  >
                    <div className="relative aspect-[63/88] w-16 overflow-hidden rounded-sm border border-border/20 bg-card/40">
                      {thumb && (
                        <Image
                          src={thumb}
                          alt={card.name}
                          fill
                          sizes="64px"
                          className="object-cover opacity-80 transition-opacity group-hover/card:opacity-100"
                        />
                      )}
                    </div>
                    <p className={`mt-1 truncate text-[8px] font-black uppercase tracking-[0.04em] ${getRarityColor(card.rarity)}`}>
                      {getRarityLabel(card.rarity)}
                    </p>
                    {card.value && (
                      <p className="truncate text-[8px] font-bold text-foreground/50">
                        {formatCardValue(card.value)}
                      </p>
                    )}
                  </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
