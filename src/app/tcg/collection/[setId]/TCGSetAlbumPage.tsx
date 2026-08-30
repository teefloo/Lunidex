'use client';

import { useQuery } from '@tanstack/react-query';
import { getCollectionSetAlbum } from '@/lib/api/tcg';
import type { TCGSetAlbumData } from '@/types/tcg';
import { TCGAlbumPage } from '@/components/tcg/TCGAlbumPage';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import Header from '@/components/layout/Header';
import { useAuth } from '@/lib/neon/AuthProvider';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { useTranslation } from '@/lib/i18n';
import { RefreshCw } from 'lucide-react';
import { TCGDataLangBanner } from '@/components/tcg/TCGUnsupportedLangBanner';

interface TCGSetAlbumPageProps {
  setId: string;
  language: string;
  activation?: boolean;
  initialAlbum?: TCGSetAlbumData | null;
}

export function TCGSetAlbumPage({
  setId,
  language,
  activation = false,
  initialAlbum,
}: TCGSetAlbumPageProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  // Album cards must match the language the page is displayed in.
  const routeLang = useClientLanguage();
  const resolvedLang = mounted ? routeLang : language;

  const albumQuery = useQuery({
    queryKey: ['tcg', 'collection-set-album', setId, resolvedLang],
    queryFn: ({ signal }) => getCollectionSetAlbum(setId, resolvedLang, signal),
    initialData: initialAlbum && language === resolvedLang ? initialAlbum : undefined,
    staleTime: 60 * 60 * 1000,
    enabled: mounted && !authLoading && Boolean(user),
  });

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
        ) : albumQuery.isPending ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : albumQuery.isError && !albumQuery.data ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-sm border border-destructive/30 bg-destructive/10 px-5 py-10 text-center" role="alert">
            <p className="text-sm font-semibold text-foreground/75">
              {t('tcg.activation.sets_load_error', { defaultValue: 'Unable to load this set right now.' })}
            </p>
            <button
              type="button"
              onClick={() => { void albumQuery.refetch(); }}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('common.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : albumQuery.data ? (
          <>
            <TCGDataLangBanner resolvedLang={resolvedLang} dataLanguage={albumQuery.data.dataLanguage} />
            <TCGAlbumPage
              set={albumQuery.data.set}
              cards={albumQuery.data.cards}
              activation={activation}
            />
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/30">
              {t('tcg.set_not_found', { defaultValue: 'Set not found' })}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
