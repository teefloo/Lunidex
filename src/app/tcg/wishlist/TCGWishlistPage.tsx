'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { getCardsBySet, getSetById } from '@/lib/api/tcg';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGDataLangBanner } from '@/components/tcg/TCGUnsupportedLangBanner';
import { TCGWishlistContent } from '@/components/tcg/TCGWishlistContent';
import { resolveRequestedTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { decodeTCGCollectionKey } from '@/lib/tcg-collections';
import { getTCGSetIdsFromWishlist } from '@/lib/tcg-wishlist';

export function TCGWishlistPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  // Wishlist membership is language-independent; only the displayed card data
  // follows the independent TCG browse preference.
  const browseLanguage = usePrimeDexStore((s) => s.tcgBrowseLanguage);
  const hasHydrated = usePrimeDexStore((s) => s._hasHydrated);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedLanguage = searchParams.get('tcgLang');
  const queryLanguage: TCGCardLanguage | null = resolveRequestedTCGCardLanguage(requestedLanguage);
  const resolvedLang: TCGCardLanguage = mounted && hasHydrated
    ? (queryLanguage ?? browseLanguage)
    : (queryLanguage ?? 'en');
  const tcgWishlistCards = usePrimeDexStore((s) => s.tcgWishlistCards);
  const tcgActiveSets = usePrimeDexStore((s) => s.tcgActiveSets);
  const tcgActiveCollections = usePrimeDexStore((s) => s.tcgActiveCollections);
  const setBrowseLanguage = usePrimeDexStore((s) => s.setTCGBrowseLanguage);
  const tryEnglish = () => {
    setBrowseLanguage('en');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tcgLang', 'en');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeSetIds = useMemo(() => [...new Set([
    ...tcgActiveSets,
    ...tcgActiveCollections
      .map((key) => decodeTCGCollectionKey(key)?.setId)
      .filter((setId): setId is string => Boolean(setId)),
  ])]
    .map((setId) => setId.trim().toLowerCase())
    .filter(Boolean)
    .sort(), [tcgActiveCollections, tcgActiveSets]);
  const relevantSetIds = useMemo(() => [...new Set([
    ...getTCGSetIdsFromWishlist(tcgWishlistCards),
    ...activeSetIds,
  ])].sort(), [activeSetIds, tcgWishlistCards]);

  const setQueries = useQueries({
    queries: relevantSetIds.map((setId) => ({
      queryKey: ['tcg', 'set-brief-v2', setId, resolvedLang],
      queryFn: () => getSetById(setId, resolvedLang),
      staleTime: 60 * 60 * 1000,
      enabled: mounted && hasHydrated && tcgWishlistCards.length > 0,
    })),
  });

  const cardQueries = useQueries({
    queries: relevantSetIds.map((setId) => ({
      queryKey: ['tcg', 'set-cards', setId, resolvedLang],
      queryFn: () => getCardsBySet(setId, resolvedLang),
      staleTime: 60 * 60 * 1000,
      enabled: mounted && hasHydrated && tcgWishlistCards.length > 0,
    })),
  });

  const setsMap = useMemo(() => {
    const map = new Map<string, { set: TCGSet; cards: TCGCard[] }>();
    for (let i = 0; i < relevantSetIds.length; i++) {
      const set = setQueries[i]?.data;
      const cardData = cardQueries[i]?.data;
      if (set && cardData) {
        map.set(relevantSetIds[i], { set, cards: cardData });
      }
    }
    return map;
  }, [cardQueries, relevantSetIds, setQueries]);

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        <TCGPageTabs />
        <TCGDataLangBanner resolvedLang={resolvedLang} onTryEnglish={tryEnglish} />
        <div className="mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
            {t('tcg.wishlist_title')}
          </h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-foreground/40">
            {tcgWishlistCards.length} {t('tcg.cards')}
          </p>
        </div>
        <TCGWishlistContent setsMap={setsMap} tcgLanguage={resolvedLang} />
      </main>
    </div>
  );
}
