'use client';

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { fetchCollectionSetCatalog } from '@/lib/api/tcg';
import { TCGCollectionOverview, type TCGCollectionOverviewEntry } from '@/components/tcg/TCGCollectionOverview';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { useAuth } from '@/lib/neon/AuthProvider';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { RefreshCw } from 'lucide-react';
import { decodeTCGCollectionKey, type TCGCollection } from '@/lib/tcg-collections';

export function TCGCollectionPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const collectionKeys = usePrimeDexStore((state) => state.tcgCollections);
  const legacyOwnedCards = usePrimeDexStore((state) => state.tcgLegacyOwnedCards);
  const collectionRefs = useMemo(
    () => collectionKeys.map((key) => decodeTCGCollectionKey(key)).filter((ref): ref is TCGCollection => ref !== null),
    [collectionKeys],
  );
  const languages = useMemo(() => [...new Set(collectionRefs.map((ref) => ref.language))], [collectionRefs]);
  const catalogQueries = useQueries({
    queries: languages.map((language) => ({
      queryKey: ['tcg', 'collection-sets', language],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchCollectionSetCatalog(language, signal),
      staleTime: 60 * 60 * 1000,
      enabled: mounted && !authLoading && Boolean(user) && syncStatus === 'ready',
    })),
  });
  const sets = useMemo(() => {
    const byLanguage = new Map(languages.map((language, index) => [language, catalogQueries[index]?.data ?? []]));
    return collectionRefs.map((ref) => {
      const set = byLanguage.get(ref.language)?.find((candidate) => candidate.id === ref.setId);
      return set ? { collectionKey: ref.key, set, language: ref.language } : null;
    }).filter((entry): entry is TCGCollectionOverviewEntry => Boolean(entry));
  }, [catalogQueries, collectionRefs, languages]);
  const setsLoading = languages.length > 0 && catalogQueries.some((query) => query.isPending);
  const setsError = catalogQueries.some((query) => query.isError);
  const refetchSets = () => Promise.all(catalogQueries.map((query) => query.refetch()));

  return (
    <div className="app-page">
      <Header />
      <main
        className="page-shell relative pt-24 pb-40"
        aria-labelledby={authLoading
          ? undefined
          : user && syncStatus === 'ready'
            ? 'tcg-collection-title'
            : syncStatus === 'checking' || syncStatus === 'loading' || syncStatus === 'unavailable'
              ? 'sync-status-title'
              : 'sync-required-title'}
      >
        {authLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : !user || syncStatus === 'unauthenticated' ? (
          <SyncRequiredPanel />
        ) : syncStatus !== 'ready' ? (
          <SyncStatusPanel status={syncStatus} />
        ) : (
          <>
            <TCGPageTabs />
            <div className="mb-6">
              <h1 id="tcg-collection-title" className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
                {t('tcg.collection_title')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-bold uppercase leading-relaxed tracking-[0.08em] text-foreground/60">
                {t('tcg.collection_subtitle')}
              </p>
            </div>

            {setsError && sets.length === 0 && collectionRefs.length > 0 ? (
              <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-5" role="alert">
                <p className="text-sm text-foreground/75">
                  {t('tcg.activation.sets_load_error', { defaultValue: 'Unable to load sets right now.' })}
                </p>
                <button
                  type="button"
                  onClick={() => void refetchSets()}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('common.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            ) : setsLoading ? (
              <div className="space-y-8" aria-busy="true" aria-live="polite">
                <span className="sr-only">{t('tcg.collection_loading')}</span>
                <div className="rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 p-5 shadow-[var(--shadow-pixel)]">
                  <div className="h-3 w-32 animate-pulse rounded-sm bg-primary/20" />
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="space-y-2">
                        <div className="h-2 w-20 animate-pulse rounded-sm bg-foreground/10" />
                        <div className="h-8 w-16 animate-pulse rounded-sm bg-foreground/10" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-sm border border-border/20 bg-card/30" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {setsError && (
                  <div className="mb-6 rounded-sm border border-amber-500/30 bg-amber-500/10 p-5" role="alert">
                    <p className="text-sm text-foreground/75">
                      {t('tcg.activation.sets_load_error', { defaultValue: 'Some collections could not be loaded.' })}
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetchSets()}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      {t('common.retry', { defaultValue: 'Retry' })}
                    </button>
                  </div>
                )}
                <TCGCollectionOverview collections={sets} legacyOwnedCards={legacyOwnedCards} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
