'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { TCGCardImage } from '@/components/tcg/TCGCardImage';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { fetchCollectionValue } from '@/lib/api/tcg';
import { selectTopValuedCollectionCards } from '@/lib/tcg-collection-preview';
import type { TCGOwnedVariant } from '@/lib/tcg-collection';
import { decodeTCGCollectionKey, getTCGCollectionCardOwnerships } from '@/lib/tcg-collections';
import { getCardMarketValue } from '@/lib/tcg-collection';
import type { TCGCard, TCGCardValue } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';

interface HomeCatalogPreviewProps {
  cards: TCGCard[];
  defaultSetId: string;
  defaultSetName: string;
}

interface OwnedCollectionPreview {
  collectionKey: string;
  language: string;
  ownedVariants: TCGOwnedVariant[];
}

interface PreviewCard {
  card: TCGCard;
  value: TCGCardValue | null;
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

export default function HomeCatalogPreview({ cards, defaultSetId, defaultSetName }: HomeCatalogPreviewProps) {
  const { t } = useTranslation();
  const locale = useClientLanguage();
  const localeHref = useLocaleHref();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const collectionKeys = usePrimeDexStore((state) => state.tcgCollections);
  const activeCollectionKeys = usePrimeDexStore((state) => state.tcgActiveCollections);
  const collectionCardKeys = usePrimeDexStore((state) => state.tcgCollectionCards);
  const legacyOwnedCardIds = usePrimeDexStore((state) => state.tcgLegacyOwnedCards);
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);

  const ownedCollections = useMemo<OwnedCollectionPreview[]>(() => {
    const keys = [...new Set([...collectionKeys, ...activeCollectionKeys])];
    return keys.flatMap((collectionKey) => {
      const collection = decodeTCGCollectionKey(collectionKey);
      if (!collection) return [];
      const ownedVariants = getTCGCollectionCardOwnerships(collectionKey, collectionCardKeys)
        .map(({ cardId, variant, quantity }) => ({ cardId, variant, quantity }));
      return ownedVariants.length > 0
        ? [{ collectionKey, language: collection.language, ownedVariants }]
        : [];
    });
  }, [activeCollectionKeys, collectionCardKeys, collectionKeys]);

  const valuationQueries = useQueries({
    queries: !hasHydrated ? [] : [
      ...ownedCollections.map(({ collectionKey, language, ownedVariants }) => ({
        queryKey: ['tcg', 'collection-value-v7', collectionKey, ownedVariants, displayCurrency],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCollectionValue(
          ownedVariants,
          language,
          signal,
          displayCurrency,
        ),
        staleTime: 60 * 60 * 1000,
        retry: false,
        enabled: ownedVariants.length > 0,
      })),
      ...(legacyOwnedCardIds.length > 0 ? [{
        queryKey: ['tcg', 'collection-value-v7', 'legacy-home', browseLanguage, legacyOwnedCardIds, displayCurrency],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCollectionValue(
          legacyOwnedCardIds,
          browseLanguage,
          signal,
          displayCurrency,
        ),
        staleTime: 60 * 60 * 1000,
        retry: false,
        enabled: true,
      }] : []),
    ],
  });

  const topOwnedCards = useMemo(
    () => selectTopValuedCollectionCards(
      valuationQueries.flatMap((query) => query.data?.topCards ?? []),
      displayCurrency,
      3,
    ),
    [displayCurrency, valuationQueries],
  );

  const personalCollectionPreview = hasHydrated && (ownedCollections.length > 0 || legacyOwnedCardIds.length > 0);
  const sample: PreviewCard[] = personalCollectionPreview
    ? topOwnedCards.map(({ card, value }) => ({ card, value }))
    : cards.slice(0, 3).map((card) => ({
      card,
      value: getCardMarketValue(card, displayCurrency),
    }));
  const set = sample[0]?.card.set;
  const headingLink = personalCollectionPreview
    ? localeHref('/tcg/collection')
    : set
      ? localeHref(`/tcg/sets/${encodeURIComponent(set.id)}`)
      : localeHref(`/tcg/sets/${encodeURIComponent(defaultSetId)}`);

  return (
    <section className="home-catalog-preview" aria-labelledby="home-catalog-preview-title">
      <div className="home-catalog-preview-heading">
        <div>
          <p className="home-section-kicker">
            {t(personalCollectionPreview ? 'lunidex_home.collection_highlights_eyebrow' : 'lunidex_home.catalog_preview_eyebrow')}
          </p>
          <h2 id="home-catalog-preview-title">
            {personalCollectionPreview
              ? t('lunidex_home.collection_highlights_title')
              : set?.name ?? defaultSetName ?? t('tcg.page_title')}
          </h2>
        </div>
        <Link href={headingLink} className="home-catalog-preview-link">
          {t(personalCollectionPreview ? 'tcg.collection_title' : 'lunidex_home.view_catalog')}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {sample.length > 0 ? (
        <ul className="home-catalog-preview-cards">
          {sample.map(({ card, value }) => (
            <li key={card.id}>
              <Link
                href={localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}
                aria-label={`${card.name}${value ? ` — ${formatCardValue(value, locale)}` : ''} — ${t('lunidex_home.open_card')}`}
                className="home-catalog-preview-card"
              >
                <span className="home-catalog-preview-image">
                  <TCGCardImage
                    card={card}
                    alt={card.name}
                    sizes="(max-width: 767px) 27vw, (max-width: 1023px) 20vw, 12rem"
                    className="object-contain"
                  />
                </span>
                <span className="home-catalog-preview-card-name">{card.name}</span>
                <span className="home-catalog-preview-card-number">{card.localId}</span>
                {value ? (
                  <span className="home-catalog-preview-card-value">{formatCardValue(value, locale)}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="home-catalog-preview-empty">
          <p>{personalCollectionPreview
            ? valuationQueries.some((query) => query.isFetching)
              ? t('lunidex_home.collection_highlights_loading')
              : t('lunidex_home.collection_highlights_unavailable')
            : t('lunidex_home.catalog_preview_empty')}</p>
          <Link href={localeHref(personalCollectionPreview ? '/tcg/collection' : '/tcg')} className="home-inline-link">
            {t(personalCollectionPreview ? 'tcg.collection_title' : 'lunidex_home.cta_explore_cards')}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}
    </section>
  );
}
