'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { getAllSets, getCardsBySet } from '@/lib/api/tcg';
import { TCGCollectionOverview } from '@/components/tcg/TCGCollectionOverview';
import type { TCGCard, TCGSet } from '@/types/tcg';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { useTranslation } from '@/lib/i18n';

export function TCGCollectionPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const { data: sets, isLoading: setsLoading } = useQuery({
    queryKey: ['tcg', 'all-sets', resolvedLang],
    queryFn: () => getAllSets(resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

  const cardQueries = useQueries({
    queries: (sets ?? []).map((set) => ({
      queryKey: ['tcg', 'set-cards', set.id, resolvedLang],
      queryFn: () => getCardsBySet(set.id, resolvedLang),
      staleTime: 60 * 60 * 1000,
      enabled: mounted && sets !== undefined && sets.length > 0,
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

  const loading = setsLoading || cardQueries.some((q) => q.isLoading);

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        <TCGPageTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
            {t('tcg.collection_title')}
          </h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-foreground/40">
            {t('tcg.collection_subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : (
          <TCGCollectionOverview setsMap={setsMap} />
        )}
      </main>
    </div>
  );
}
