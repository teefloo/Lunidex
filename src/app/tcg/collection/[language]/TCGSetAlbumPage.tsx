'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTCGDemoOwnership } from '@/hooks/useTCGDemoOwnership';
import { getCollectionSetAlbum } from '@/lib/api/tcg';
import type { TCGSetAlbumData } from '@/types/tcg';
import { TCGAlbumPage } from '@/components/tcg/TCGAlbumPage';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import Header from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/lib/neon/AuthProvider';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { useTranslation } from '@/lib/i18n';
import { RefreshCw } from 'lucide-react';
import { TCGDataLangBanner } from '@/components/tcg/TCGUnsupportedLangBanner';
import { TCGCollectionLanguageDialog } from '@/components/tcg/TCGCollectionLanguageDialog';
import { encodeTCGCollectionKey, getTCGCollectionCardOwnerships } from '@/lib/tcg-collections';
import { normalizeTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';

interface TCGSetAlbumPageProps {
  setId: string;
  language: string;
  initialAlbum?: TCGSetAlbumData;
  activation?: boolean;
  collectionKey?: string;
  returnQuery?: string;
  source?: string;
  campaign?: string;
}

export function TCGSetAlbumPage({
  setId,
  language,
  initialAlbum,
  activation = false,
  collectionKey,
  returnQuery,
  source,
  campaign,
}: TCGSetAlbumPageProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const localeHref = useLocaleHref();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const resolvedLang: TCGCardLanguage = normalizeTCGCardLanguage(language, 'en') ?? 'en';
  const transferCollectionCards = usePrimeDexStore((state) => state.transferTCGCollectionCards);
  const setBrowseLanguage = usePrimeDexStore((state) => state.setTCGBrowseLanguage);
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const resolvedCollectionKey = collectionKey ?? encodeTCGCollectionKey(resolvedLang, setId) ?? undefined;
  // Public album data and its temporary checklist do not depend on the
  // session endpoint resolving. A known account still takes the sync gate.
  const isDemo = !user;
  const demoOwnership = useTCGDemoOwnership(isDemo ? resolvedCollectionKey ?? `${resolvedLang}:${setId}` : null);
  const [demoInteracted, setDemoInteracted] = useState(false);
  const startParams = new URLSearchParams({ tcgLang: resolvedLang });
  if (source !== undefined) startParams.set('source', source);
  if (campaign !== undefined) startParams.set('campaign', campaign);
  const startQuery = startParams.toString();
  const attributionParams = new URLSearchParams();
  if (source !== undefined) attributionParams.set('source', source);
  if (campaign !== undefined) attributionParams.set('campaign', campaign);
  const attributionQuery = attributionParams.toString();
  const collectionHref = localeHref(`/tcg/collection${attributionQuery ? `?${attributionQuery}` : ''}`);
  const hasCollectionCards = useMemo(() => Boolean(
    resolvedCollectionKey && getTCGCollectionCardOwnerships(resolvedCollectionKey, collectionCards).length > 0,
  ), [collectionCards, resolvedCollectionKey]);
  const getAlbumHref = (nextLanguage: TCGCardLanguage) => {
    const params = new URLSearchParams(startParams);
    params.set('tcgLang', nextLanguage);
    if (activation) params.set('activation', '1');
    if (returnQuery) params.set('return', returnQuery);
    const query = params.toString();
    return `${localeHref(`/tcg/collection/${nextLanguage}/${encodeURIComponent(setId)}`)}${query ? `?${query}` : ''}`;
  };
  const tryEnglish = () => {
    setBrowseLanguage('en');
    router.replace(getAlbumHref('en'));
  };
  const changeCollectionLanguage = (nextLanguage: TCGCardLanguage): boolean => {
    if (isDemo) {
      setBrowseLanguage(nextLanguage);
      router.push(getAlbumHref(nextLanguage));
      return true;
    }
    const nextKey = encodeTCGCollectionKey(nextLanguage, setId);
    if (!nextKey) return false;
    const transferred = resolvedCollectionKey === nextKey
      || !hasCollectionCards
      || Boolean(resolvedCollectionKey && transferCollectionCards(resolvedCollectionKey, nextKey));
    if (!transferred) return false;
    setBrowseLanguage(nextLanguage);
    router.push(getAlbumHref(nextLanguage));
    return true;
  };

  const albumQuery = useQuery({
    queryKey: ['tcg', 'collection-set-album-v3', setId, resolvedLang],
    queryFn: ({ signal }) => getCollectionSetAlbum(setId, resolvedLang, signal),
    initialData: initialAlbum,
    staleTime: 60 * 60 * 1000,
    retry: false,
    enabled: mounted,
  });

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell page-shell--header-offset relative pb-40">
        <Breadcrumbs
          items={[
            { label: t('common.home', { defaultValue: 'Home' }), href: localeHref('/') },
            { label: t('tcg.collection_title'), href: localeHref('/tcg/collection') },
            { label: albumQuery.data?.set.name ?? setId },
          ]}
          homeLabel={t('common.home', { defaultValue: 'Home' })}
          className="!px-0 !pt-0 mb-6"
        />
        {(user && authLoading) || (!isDemo && syncStatus !== 'ready') || albumQuery.isPending || (albumQuery.isError && !albumQuery.data) ? (
          <div className="mb-6">
            <Link
              href={isDemo ? localeHref(`/tcg/start?${startQuery}`) : collectionHref}
              className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              ← {isDemo ? t('tcg.demo.exit_demo') : t('tcg.collection_title')}
            </Link>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              {t('tcg.collection_title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-bold uppercase leading-relaxed tracking-[0.08em] text-foreground/60">
              {t('tcg.collection_subtitle')}
            </p>
          </div>
        ) : null}
        {!mounted || (user && authLoading) ? (
          <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
            <div role="status" aria-label={t('tcg.collection_loading')} className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : !isDemo && syncStatus === 'unauthenticated' ? (
          <SyncRequiredPanel headingLevel={2} />
        ) : !isDemo && syncStatus !== 'ready' && syncStatus !== 'unauthenticated' ? (
          <SyncStatusPanel status={syncStatus} headingLevel={2} />
        ) : albumQuery.isPending ? (
          <div className="flex items-center justify-center py-20" aria-busy="true">
            <div role="status" aria-label={t('tcg.collection_loading')} className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
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
            <TCGDataLangBanner resolvedLang={resolvedLang} dataLanguage={albumQuery.data.dataLanguage} onTryEnglish={tryEnglish} />
            {!isDemo && demoInteracted && <p role="status" className="mb-4 rounded-sm border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{t('tcg.demo.account_transition')}</p>}
            <TCGAlbumPage
              key={`${isDemo ? 'demo' : user?.id}:${resolvedCollectionKey}`}
              set={albumQuery.data.set}
              cards={albumQuery.data.cards}
              activation={activation}
              language={resolvedLang}
              collectionKey={resolvedCollectionKey}
              returnQuery={returnQuery}
              startQuery={startQuery}
              demoOwnership={demoOwnership}
              onDemoInteraction={() => setDemoInteracted(true)}
              headerAction={(
                <TCGCollectionLanguageDialog
                  currentLanguage={resolvedLang}
                  setName={albumQuery.data.set.name}
                  hasCards={!isDemo && hasCollectionCards}
                  onConfirm={changeCollectionLanguage}
                  compact
                />
              )}
            />
          </>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-sm border border-dashed border-border/60 px-5 py-12 text-center">
            <h1 className="text-2xl font-black">{t('tcg.demo.unavailable_set_title')}</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-foreground/60">{t('tcg.demo.unavailable_set_description')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href={localeHref(`/tcg/start?${startQuery}`)} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {t('tcg.demo.choose_another_set')}
              </Link>
              <Link href={collectionHref} className="inline-flex min-h-11 items-center rounded-sm border border-border px-4 text-sm font-bold hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {t('tcg.collection_title')}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
