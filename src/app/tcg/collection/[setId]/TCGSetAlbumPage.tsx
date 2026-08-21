'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { getSetById, getCardsBySet } from '@/lib/api/tcg';
import { TCGAlbumPage } from '@/components/tcg/TCGAlbumPage';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import Header from '@/components/layout/Header';
import { useAuth } from '@/lib/neon/AuthProvider';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';

export function TCGSetAlbumPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const setId = params.setId as string;
  const mounted = useMounted();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  // Album cards must match the language the page is displayed in.
  const routeLang = useClientLanguage();
  const resolvedLang = mounted ? routeLang : 'en';

  const { data: tcgSet, isLoading: setLoading } = useQuery({
    queryKey: ['tcg', 'set', setId, resolvedLang],
    queryFn: () => getSetById(setId, resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted && !authLoading && Boolean(user),
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['tcg', 'set-cards', setId, resolvedLang],
    queryFn: () => getCardsBySet(setId, resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted && !authLoading && Boolean(user),
  });

  const loading = setLoading || cardsLoading;

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        {authLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : !user || syncStatus === 'unauthenticated' ? (
          <SyncRequiredPanel />
        ) : syncStatus !== 'ready' ? (
          <SyncStatusPanel status={syncStatus} />
        ) : loading ? (
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
