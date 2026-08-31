'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { getAllSets, getCardsBySet } from '@/lib/api/tcg';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGDataLangBanner } from '@/components/tcg/TCGUnsupportedLangBanner';
import { TCGWishlistContent } from '@/components/tcg/TCGWishlistContent';
import { isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';

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
  const queryLanguage: TCGCardLanguage | null = isTCGCardLanguage(requestedLanguage) ? requestedLanguage : null;
  const resolvedLang: TCGCardLanguage = mounted && hasHydrated
    ? (queryLanguage ?? browseLanguage)
    : (queryLanguage ?? 'en');
  const tcgWishlistCards = usePrimeDexStore((s) => s.tcgWishlistCards);
  const setBrowseLanguage = usePrimeDexStore((s) => s.setTCGBrowseLanguage);
  const tryEnglish = () => {
    setBrowseLanguage('en');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tcgLang', 'en');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: sets } = useQueries({
    queries: [
      {
        queryKey: ['tcg', 'all-sets', resolvedLang],
        queryFn: () => getAllSets(resolvedLang),
        staleTime: 60 * 60 * 1000,
        enabled: mounted && hasHydrated,
      },
    ],
  })[0] as unknown as { data: TCGSet[] | undefined };

  const cardQueries = useQueries({
    queries: (sets ?? []).map((set) => ({
      queryKey: ['tcg', 'set-cards', set.id, resolvedLang],
      queryFn: () => getCardsBySet(set.id, resolvedLang),
      staleTime: 60 * 60 * 1000,
      enabled: mounted && hasHydrated && sets !== undefined && sets.length > 0,
    })),
  });

  const setsMap = useMemo(() => {
    const map = new Map<string, { set: TCGSet; cards: TCGCard[] }>();
    if (!sets) return map;
    for (let i = 0; i < sets.length; i++) {
      const cardData = cardQueries[i]?.data;
      if (cardData) {
        map.set(sets[i].id, { set: sets[i], cards: cardData });
      }
    }
    return map;
  }, [sets, cardQueries]);

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
