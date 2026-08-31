'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionValue, getCollectionSetAlbum } from '@/lib/api/tcg';
import {
  computeActiveSetInsights,
  getActiveSetInsightsFallback,
  getRarityColor,
  getRarityLabel,
  type TCGOwnedVariant,
  type TCGCollectionValueGroup,
  getTCGValueInCurrency,
  toCollectionCard,
} from '@/lib/tcg-collection';
import type { TCGCardValue } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { getTCGCardImageCandidates, getTCGSetImageCandidates } from '@/lib/tcg-images';
import type { TCGSet } from '@/types/tcg';
import { TCGProgressBar } from './TCGProgressBar';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { TCGImageWithFallback } from './TCGImageWithFallback';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';

interface TCGActiveSetInsightsProps {
  set: TCGSet;
  ownedIds: Set<string>;
  ownedVariants: readonly TCGOwnedVariant[];
  resolvedLang: TCGCardLanguage;
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

export function TCGActiveSetInsights({ set, ownedIds, ownedVariants, resolvedLang }: TCGActiveSetInsightsProps) {
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoadDetails, setShouldLoadDetails] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === 'undefined') {
      const frameId = requestAnimationFrame(() => setShouldLoadDetails(true));
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadDetails(true);
          observer.disconnect();
        }
      },
      { rootMargin: '360px 0px' },
    );
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const { data: album, isLoading: cardsLoading, isError } = useQuery({
    queryKey: ['tcg', 'collection-set-briefs', set.id, resolvedLang],
    queryFn: ({ signal }) => getCollectionSetAlbum(set.id, resolvedLang, signal),
    staleTime: 60 * 60 * 1000,
    enabled: shouldLoadDetails,
  });

  // Pricing and variant flags are only needed for physical copies the user
  // owns. The helper deduplicates card detail calls and keeps its concurrency
  // bound, so opening the overview never hydrates an entire album.
  const { data: ownedValuation, isLoading: valuationLoading, isError: valuationError } = useQuery({
    // Keep the active-set cards in sync with the corrected price resolver even
    // when a page survives a hot update without a full reload.
    queryKey: ['tcg', 'collection-owned-value-v3', set.id, resolvedLang, ownedVariants, displayCurrency],
    queryFn: ({ signal }) => fetchCollectionValue(ownedVariants, resolvedLang, signal, displayCurrency),
    staleTime: 60 * 60 * 1000,
    enabled: shouldLoadDetails && ownedVariants.length > 0,
  });

  const cards = useMemo(
    () => album?.cards.map((card) => toCollectionCard(card, set.id, displayCurrency)) ?? [],
    [album?.cards, set.id, displayCurrency],
  );

  const insights = useMemo(
    () => {
      const base = cards.length
        ? computeActiveSetInsights(cards, ownedIds, 6, ownedVariants, displayCurrency)
        : getActiveSetInsightsFallback(set, ownedIds, ownedVariants);
      return ownedValuation && !valuationError
        ? { ...base, valuation: ownedValuation }
        : base;
    },
    [cards, ownedIds, ownedVariants, ownedValuation, set, valuationError, displayCurrency],
  );
  const isLoading = shouldLoadDetails && (cardsLoading || valuationLoading);
  const detailsUnavailable = shouldLoadDetails && (isError || (!cardsLoading && !album?.cards.length));

  return (
    <div ref={containerRef} className="min-w-0 rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
      <div className="flex min-w-0 items-center gap-3">
        {set.logo && (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-card/40">
            <TCGImageWithFallback
              candidates={getTCGSetImageCandidates(set)}
              alt=""
              fill
              sizes="40px"
              className="object-contain p-1"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={localeHref(`/tcg/collection/${resolvedLang}/${encodeURIComponent(set.id)}`)}
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
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/60">
            {t('tcg.collection_loading')}
          </span>
        </div>
      )}

      {detailsUnavailable && (
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.1em] text-rose-400/85">
          {t('tcg.collection_insights_error')}
        </p>
      )}

      {shouldLoadDetails && insights && !isLoading && !detailsUnavailable && (
        <>
          {/* Value */}
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 border-t border-border/15 pt-3">
            {/* Owned value */}
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
                {t('tcg.collection_value_estimate')}
              </p>
              {insights.valuation.groups.length > 0 ? (
                <>
                  <p className="mt-1 break-words text-base font-black leading-tight text-primary sm:text-lg">
                    {insights.valuation.groups.map((g) => formatCurrency(g, interfaceLanguage)).join(' · ')}
                  </p>
                </>
              ) : insights.valuation.ownedCount > 0 ? (
                <p className="mt-1 text-[11px] font-bold text-foreground/55">
                  {t('tcg.collection_value_unavailable')}
                </p>
              ) : (
                <p className="mt-1 text-[11px] font-bold text-foreground/55">
                  {t('tcg.collection_value_none_owned')}
                </p>
              )}
              {insights.valuation.ownedCount > 0 && (
                <>
                  <p className="mt-0.5 text-[11px] font-bold text-foreground/55">
                    {t('tcg.collection_value_coverage', {
                      priced: insights.valuation.pricedCount,
                      owned: insights.valuation.ownedCount,
                    })}
                  </p>
                  {(insights.valuation.unpricedCount ?? 0) > 0 && (
                    <p className="text-[11px] font-bold text-amber-200/70">
                      {t('tcg.collection_value_unpriced', { count: insights.valuation.unpricedCount })}
                    </p>
                  )}
                </>
              )}
            </div>
            {/* Set total value */}
            {insights.setTotalValue.length > 0 && (
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
                  {t('tcg.collection_set_total_value')}
                </p>
                <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg">
                  {insights.setTotalValue.map((g) => formatCurrency(g, interfaceLanguage)).join(' · ')}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-foreground/55">
                  {insights.setTotalValue[0].count} / {insights.completion.total} {t('tcg.cards')}
                </p>
              </div>
            )}
          </div>

          {/* Top missing */}
          <div className="mt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
              {t('tcg.collection_top_missing')}
            </p>
            {insights.topMissing.length === 0 ? (
              <p className="mt-2 text-[11px] font-bold text-emerald-400/70">
                {t('tcg.collection_no_missing')}
              </p>
            ) : (
              <div className="relative">
                <div className="scroll-snap-x scrollbar-hide flex gap-2 overflow-x-auto pb-1 pr-6">
                {insights.topMissing.map((card) => {
                  const thumbCandidates = getTCGCardImageCandidates(card, 'low');
                  return (
                  <Link
                    key={card.id}
                    href={`${localeHref(`/tcg/cards/${card.id}`)}?tcgLang=${encodeURIComponent(resolvedLang)}`}
                    aria-label={t('tcg.open_card_detail', { name: card.name })}
                    className="group/card scroll-snap-align-start w-16 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    title={`${card.name} — ${getRarityLabel(card.rarity)}`}
                  >
                    <div className="relative aspect-[63/88] w-16 overflow-hidden rounded-sm border border-border/20 bg-card/40">
                      {thumbCandidates.length > 0 && (
                        <TCGImageWithFallback
                          candidates={thumbCandidates}
                          alt={card.name}
                          fill
                          sizes="64px"
                          className="object-cover opacity-80 transition-opacity group-hover/card:opacity-100"
                        />
                      )}
                    </div>
                    <p className={`mt-1 truncate text-[11px] font-black uppercase tracking-[0.04em] ${getRarityColor(card.rarity)}`}>
                      {getRarityLabel(card.rarity)}
                    </p>
                    {getTCGValueInCurrency(card.value, displayCurrency) && (
                      <p className="truncate text-[11px] font-bold text-foreground/60">
                        {formatCardValue(getTCGValueInCurrency(card.value, displayCurrency)!, interfaceLanguage)}
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
