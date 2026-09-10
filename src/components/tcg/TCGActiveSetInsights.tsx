'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchCollectionValue, getCollectionSetAlbum, getTCGCard } from '@/lib/api/tcg';
import {
  computeActiveSetInsights,
  getActiveSetInsightsFallback,
  getRarityColor,
  mergeCollectionCardDetails,
  type TCGOwnedVariant,
  type TCGCollectionValueGroup,
  getTCGValueInCurrency,
  toCollectionCard,
} from '@/lib/tcg-collection';
import { getTCGRarityLabel } from '@/lib/tcg-labels';
import type { TCGCardValue, TCGCollectionCard } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { getTCGCardImageCandidates, getTCGSetImageCandidates } from '@/lib/tcg-images';
import type { TCGSet } from '@/types/tcg';
import { TCGProgressBar } from './TCGProgressBar';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { TCGImageWithFallback } from './TCGImageWithFallback';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';
import { encodeTCGCollectionKey } from '@/lib/tcg-collections';

interface TCGActiveSetInsightsProps {
  set: TCGSet;
  ownedIds: Set<string>;
  ownedVariants: readonly TCGOwnedVariant[];
  resolvedLang: TCGCardLanguage;
  /** Fully enriched cards are already loaded by the collection overview. */
  collectionCards?: readonly TCGCollectionCard[];
  collectionCardsLoading?: boolean;
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
  collectionCards,
  collectionCardsLoading = false,
}: TCGActiveSetInsightsProps) {
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoadDetails, setShouldLoadDetails] = useState(false);
  const collectionKey = encodeTCGCollectionKey(resolvedLang, set.id) ?? `${resolvedLang}:${set.id}`;

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
    queryKey: ['tcg', 'collection-set-briefs-v2', set.id, resolvedLang],
    queryFn: ({ signal }) => getCollectionSetAlbum(set.id, resolvedLang, signal),
    staleTime: 60 * 60 * 1000,
    enabled: shouldLoadDetails,
  });

  // Pricing and variant flags are only needed for physical copies the user
  // owns. The overview supplies the full set projection for recommendations;
  // this remains the owned-value fallback when that projection is unavailable.
  const { data: ownedValuation, isLoading: valuationLoading, isError: valuationError } = useQuery({
    // Reuse the overview valuation for the same language-aware collection.
    // The active insights used to start a second queue of detail requests for
    // every set, which could overload TCGdex and leave both views waiting.
    queryKey: ['tcg', 'collection-value-v6', collectionKey, ownedVariants, displayCurrency],
    queryFn: ({ signal }) => fetchCollectionValue(ownedVariants, resolvedLang, signal, displayCurrency),
    staleTime: 60 * 60 * 1000,
    enabled: shouldLoadDetails && ownedVariants.length > 0,
  });

  const albumCards = useMemo(
    () => album?.cards.map((card) => toCollectionCard(card, set.id, displayCurrency)) ?? [],
    [album?.cards, set.id, displayCurrency],
  );
  const hasHydratedSetCards = Boolean(collectionCards?.length);
  const cards = useMemo(
    () => collectionCards?.length ? [...collectionCards] : albumCards,
    [albumCards, collectionCards],
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

  const topMissingIds = useMemo(
    () => insights?.topMissing.map((card) => card.id) ?? [],
    [insights],
  );
  // The compact set album intentionally omits detail-only pricing and rarity.
  // Hydrate only the six recommended missing cards so their visible metadata is
  // complete without bringing back the old request waterfall for every card.
  const missingCardQueries = useQueries({
    queries: hasHydratedSetCards ? [] : topMissingIds.map((cardId) => ({
      queryKey: ['tcg', 'collection-card-detail-v1', cardId, resolvedLang],
      queryFn: ({ signal }: { signal: AbortSignal }) => getTCGCard(
        cardId,
        resolvedLang,
        signal,
        { requirePricing: true },
      ),
      staleTime: 60 * 60 * 1000,
      retry: 1,
      enabled: shouldLoadDetails,
    })),
  });
  const hydratedMissingCards = useMemo(
    () => missingCardQueries.flatMap((query) => (
      query.data ? [toCollectionCard(query.data, set.id, displayCurrency)] : []
    )),
    [displayCurrency, missingCardQueries, set.id],
  );
  const topMissingCards = useMemo(
    () => insights
      ? hasHydratedSetCards
        ? insights.topMissing
        : mergeCollectionCardDetails(insights.topMissing, hydratedMissingCards)
      : [],
    [hasHydratedSetCards, hydratedMissingCards, insights],
  );
  const isLoading = shouldLoadDetails && ((cardsLoading && !hasHydratedSetCards) || valuationLoading);
  const detailsUnavailable = shouldLoadDetails
    && !hasHydratedSetCards
    && (isError || (!cardsLoading && !album?.cards.length));
  const keyCardsLoading = shouldLoadDetails && !hasHydratedSetCards && collectionCardsLoading;
  const hasMissingCards = Boolean(insights && insights.completion.owned < insights.completion.total);
  const valuationUnpricedCount = insights
    ? Math.max(
      0,
      insights.valuation.unpricedCount ?? 0,
      insights.valuation.ownedCount - insights.valuation.pricedCount,
    )
    : 0;

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
              {valuationUnpricedCount > 0 && (
                <p className="text-[11px] font-bold text-amber-200/70">
                  {t('tcg.collection_value_partial', { count: valuationUnpricedCount })}
                </p>
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
            {topMissingCards.length === 0 ? (
              <p className={`mt-2 text-[11px] font-bold ${hasMissingCards ? 'text-foreground/55' : 'text-emerald-400/70'}`}>
                {hasMissingCards
                  ? keyCardsLoading
                    ? t('tcg.collection_loading')
                    : t('tcg.collection_key_cards_unavailable')
                  : t('tcg.collection_no_missing')}
              </p>
            ) : (
              <div className="relative">
                <div className="scroll-snap-x scrollbar-hide flex gap-2 overflow-x-auto pb-1 pr-6">
                {topMissingCards.map((card) => {
                  const thumbCandidates = getTCGCardImageCandidates(card, 'low');
                  return (
                  <Link
                    key={card.id}
                    href={`${localeHref(`/tcg/cards/${card.id}`)}?tcgLang=${encodeURIComponent(resolvedLang)}`}
                    aria-label={t('tcg.open_card_detail', { name: card.name })}
                    className="group/card scroll-snap-align-start w-16 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    title={`${card.name} — ${getTCGRarityLabel(card.rarity, t)}`}
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
                      {getTCGRarityLabel(card.rarity, t)}
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
