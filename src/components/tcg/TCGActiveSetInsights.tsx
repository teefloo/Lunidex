'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionValue, fetchSetCollectionCards } from '@/lib/api/tcg';
import {
  computeActiveSetInsights,
  getActiveSetInsightsFallback,
  getRarityColor,
  getTCGValueInCurrency,
  type TCGCollectionValueGroup,
  type TCGOwnedVariant,
} from '@/lib/tcg-collection';
import { getTCGRarityLabel } from '@/lib/tcg-labels';
import type { TCGCardValue, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';
import { encodeTCGCollectionKey } from '@/lib/tcg-collections';
import { TCGImageWithFallback } from './TCGImageWithFallback';

interface TCGActiveSetInsightsProps {
  set: TCGSet;
  ownedIds: Set<string>;
  ownedVariants: readonly TCGOwnedVariant[];
  resolvedLang: TCGCardLanguage;
  enabled: boolean;
  albumHref: string;
}

function formatCurrency(group: TCGCollectionValueGroup, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: group.currency,
      maximumFractionDigits: 2,
    }).format(group.total);
  } catch {
    return `${group.total.toFixed(2)} ${group.currency}`;
  }
}

function formatCardValue(value: TCGCardValue, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(value.amount);
  } catch {
    return `${value.amount.toFixed(2)} ${value.currency}`;
  }
}

export function TCGActiveSetInsights({
  set,
  ownedIds,
  ownedVariants,
  resolvedLang,
  enabled,
  albumHref,
}: TCGActiveSetInsightsProps) {
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const collectionKey = encodeTCGCollectionKey(resolvedLang, set.id) ?? `${resolvedLang}:${set.id}`;

  const setCardsQuery = useQuery({
    queryKey: ['tcg', 'collection-set-cards-v2', set.id, resolvedLang, displayCurrency],
    queryFn: ({ signal }) => fetchSetCollectionCards(set.id, resolvedLang, signal, displayCurrency),
    staleTime: 60 * 60 * 1000,
    retry: 1,
    enabled,
  });
  const valuationQuery = useQuery({
    queryKey: ['tcg', 'collection-value-v6', collectionKey, ownedVariants, displayCurrency],
    queryFn: ({ signal }) => fetchCollectionValue(ownedVariants, resolvedLang, signal, displayCurrency),
    staleTime: 60 * 60 * 1000,
    retry: false,
    enabled: enabled && ownedVariants.length > 0,
  });

  const insights = useMemo(() => {
    const cards = setCardsQuery.data ?? [];
    const base = cards.length
      ? computeActiveSetInsights(cards, ownedIds, 6, ownedVariants, displayCurrency)
      : getActiveSetInsightsFallback(set, ownedIds, ownedVariants);
    return valuationQuery.data && !valuationQuery.isError
      ? { ...base, valuation: valuationQuery.data }
      : base;
  }, [displayCurrency, ownedIds, ownedVariants, set, setCardsQuery.data, valuationQuery.data, valuationQuery.isError]);

  const isLoading = enabled && (setCardsQuery.isPending || valuationQuery.isPending);
  const detailsUnavailable = enabled && setCardsQuery.isError && !setCardsQuery.data;
  const hasMissingCards = insights.completion.owned < insights.completion.total;
  const valuationUnpricedCount = Math.max(
    0,
    insights.valuation.unpricedCount ?? 0,
    insights.valuation.ownedCount - insights.valuation.pricedCount,
  );

  const retry = () => {
    void setCardsQuery.refetch();
    if (valuationQuery.isError) void valuationQuery.refetch();
  };

  return (
    <section className="min-w-0 rounded-sm border border-border/20 bg-card/25 p-4" aria-live="polite">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/55">
            {t('tcg.collection_analysis', { defaultValue: 'Analysis' })}
          </p>
          <Link
            href={albumHref}
            className="mt-1 inline-flex min-h-11 items-center break-words rounded-sm text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {set.name}
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/60">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none" aria-hidden="true" />
          {t('tcg.collection_loading')}
        </div>
      )}

      {detailsUnavailable ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-rose-400/25 bg-rose-400/10 p-3" role="alert">
          <p className="text-sm font-semibold text-foreground/80">{t('tcg.collection_insights_error')}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/40 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : !isLoading && (
        <>
          <div className="mt-3 grid min-w-0 gap-3 border-t border-border/15 pt-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/55">
                {t('tcg.collection_set_owned_value')}
              </p>
              {insights.valuation.groups.length > 0 ? (
                <p className="mt-1 break-words text-base font-black leading-tight tabular-nums text-primary sm:text-lg">
                  {insights.valuation.groups.map((group) => formatCurrency(group, interfaceLanguage)).join(' · ')}
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-foreground/55">{t('tcg.collection_value_unavailable')}</p>
              )}
              {valuationQuery.isError && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-rose-300" role="alert">
                  <span>{t('tcg.collection_insights_error')}</span>
                  <button
                    type="button"
                    onClick={() => void valuationQuery.refetch()}
                    className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-rose-300/40 px-2 hover:bg-rose-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    {t('common.retry', { defaultValue: 'Retry' })}
                  </button>
                </div>
              )}
              {valuationUnpricedCount > 0 && (
                <p className="mt-1 text-[11px] font-bold text-amber-200/70">
                  {t('tcg.collection_value_partial', { count: valuationUnpricedCount })}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/55">
                {t('tcg.collection_set_total_value')}
              </p>
              {insights.setTotalValue.length > 0 ? (
                <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg">
                  {insights.setTotalValue.map((group) => formatCurrency(group, interfaceLanguage)).join(' · ')}
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-foreground/55">{t('tcg.collection_value_unavailable')}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/55">
              {t('tcg.collection_top_missing')}
            </p>
            {insights.topMissing.length === 0 ? (
              <p className={`mt-2 text-sm font-semibold ${hasMissingCards ? 'text-foreground/55' : 'text-emerald-300'}`}>
                {hasMissingCards ? t('tcg.collection_key_cards_unavailable') : t('tcg.collection_no_missing')}
              </p>
            ) : (
              <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto pb-1 pr-2">
                {insights.topMissing.map((card) => {
                  const imageCandidates = getTCGCardImageCandidates(card, 'low');
                  const value = getTCGValueInCurrency(card.value, displayCurrency);
                  return (
                    <Link
                      key={card.id}
                      href={`${localeHref(`/tcg/cards/${card.id}`)}?tcgLang=${encodeURIComponent(resolvedLang)}`}
                      aria-label={t('tcg.open_card_detail', { name: card.name })}
                      title={`${card.name} — ${getTCGRarityLabel(card.rarity, t)}`}
                      className="group/card w-16 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    >
                      <div className="relative aspect-[63/88] overflow-hidden rounded-sm border border-border/20 bg-card/40">
                        {imageCandidates.length > 0 && (
                          <TCGImageWithFallback
                            candidates={imageCandidates}
                            alt={card.name}
                            fill
                            sizes="64px"
                            className="object-cover opacity-80 transition-opacity duration-100 group-hover/card:opacity-100 motion-reduce:transition-none"
                          />
                        )}
                      </div>
                      <p className={`mt-1 truncate text-[11px] font-black uppercase tracking-[0.04em] ${getRarityColor(card.rarity)}`}>
                        {getTCGRarityLabel(card.rarity, t)}
                      </p>
                      {value && <p className="truncate text-[11px] font-bold text-foreground/60">{formatCardValue(value, interfaceLanguage)}</p>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
