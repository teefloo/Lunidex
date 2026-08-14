'use client';

import { useQuery } from '@tanstack/react-query';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { getAllSets } from '@/lib/api/tcg';
import { TCGCollectionOverview } from '@/components/tcg/TCGCollectionOverview';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGDataLangBanner } from '@/components/tcg/TCGUnsupportedLangBanner';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/neon/AuthProvider';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';

export function TCGCollectionPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const { data: sets, isLoading: setsLoading } = useQuery({
    queryKey: ['tcg', 'all-sets', resolvedLang],
    queryFn: () => getAllSets(resolvedLang),
    staleTime: 60 * 60 * 1000,
    enabled: mounted && !authLoading && Boolean(user),
  });

  return (
    <div className="app-page">
      <Header />
      <main
        className="page-shell relative pt-24 pb-24"
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
            <TCGDataLangBanner resolvedLang={resolvedLang} />
            <div className="mb-6">
              <h1 id="tcg-collection-title" className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
                {t('tcg.collection_title')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-bold uppercase leading-relaxed tracking-[0.08em] text-foreground/60">
                {t('tcg.collection_subtitle')}
              </p>
            </div>

            {setsLoading || !sets ? (
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
              <TCGCollectionOverview sets={sets} resolvedLang={resolvedLang} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
