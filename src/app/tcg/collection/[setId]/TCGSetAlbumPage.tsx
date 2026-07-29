'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { getSetById, getCardsBySet } from '@/lib/api/tcg';
import { TCGAlbumPage } from '@/components/tcg/TCGAlbumPage';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import Header from '@/components/layout/Header';

export function TCGSetAlbumPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const setId = params.setId as string;
  const mounted = useMounted();
  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const { data: tcgSet, isLoading: setLoading } = useQuery({
    queryKey: ['tcg', 'set', setId, resolvedLang],
    queryFn: () => getSetById(setId, resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['tcg', 'set-cards', setId, resolvedLang],
    queryFn: () => getCardsBySet(setId, resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

  const loading = setLoading || cardsLoading;

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : tcgSet && cards ? (
          <TCGAlbumPage set={tcgSet} cards={cards} activation={searchParams.get('activation') === '1'} />
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/30">
              Set introuvable
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
