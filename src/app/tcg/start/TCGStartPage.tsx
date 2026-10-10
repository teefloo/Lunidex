'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import { TCGImageWithFallback } from '@/components/tcg/TCGImageWithFallback';
import { fetchCollectionSetCatalog, getSetById } from '@/lib/api/tcg';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCollectionSetSummary, TCGSet } from '@/types/tcg';
import { getProductConsent, getServerProductConsent, subscribeProductConsent, setProductTrackingIdentity, trackTcgStartOpened, trackProductEvent } from '@/lib/product-measurement';
import { useAuth } from '@/lib/neon/AuthProvider';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { TCGLanguageSelector } from '@/components/tcg/TCGLanguageSelector';
import { TCGDataLangBanner } from '@/components/tcg/TCGUnsupportedLangBanner';
import { resolveRequestedTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { buildTCGSetDisplayNames } from '@/lib/tcg-set-label';

const LATEST_SET_LIMIT = 12;

function sortByReleaseRank(sets: TCGCollectionSetSummary[]): TCGCollectionSetSummary[] {
  return [...sets].sort((left, right) => {
    return left.releaseRank - right.releaseRank || left.name.localeCompare(right.name);
  });
}

function formatReleaseDate(date: string | undefined, locale: string): string | null {
  if (!date || Number.isNaN(Date.parse(date))) return null;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
}

export function TCGStartPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const consent = useSyncExternalStore(subscribeProductConsent, getProductConsent, getServerProductConsent);
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const [query, setQuery] = useState('');
  const searchTracked = useRef(false);
  const requestedLanguage = searchParams.get('tcgLang');
  const queryLanguage: TCGCardLanguage | null = resolveRequestedTCGCardLanguage(requestedLanguage);
  const attributionParams = new URLSearchParams();
  for (const key of ['source', 'campaign'] as const) {
    const value = searchParams.get(key);
    if (value !== null) attributionParams.set(key, value);
  }
  const attributionQuery = attributionParams.toString();
  const attributedCatalogHref = localeHref(`/tcg${attributionQuery ? `?${attributionQuery}` : ''}`);
  const attributedCollectionHref = localeHref(`/tcg/collection${attributionQuery ? `?${attributionQuery}` : ''}`);
  const resolvedLanguage: TCGCardLanguage = mounted && hasHydrated
    ? (queryLanguage ?? browseLanguage)
    : (queryLanguage ?? 'en');
  const normalizedQuery = query.trim().toLocaleLowerCase(resolvedLanguage);
  const catalogEnabled = mounted && hasHydrated && (!user || (!authLoading && syncStatus === 'ready'));

  const { data: sets, isLoading, isError, refetch } = useQuery({
    queryKey: ['tcg', 'activation-sets', resolvedLanguage],
    queryFn: ({ signal }) => fetchCollectionSetCatalog(resolvedLanguage, signal),
    staleTime: 60 * 60 * 1000,
    // Public set data and the in-memory demo stay available while session
    // verification retries. A known account still waits for sync readiness.
    enabled: catalogEnabled,
  });

  const candidateSets = useMemo(() => {
    const sorted = sortByReleaseRank(sets ?? []);
    if (!normalizedQuery) return sorted.slice(0, LATEST_SET_LIMIT);
    return sorted.filter((set) => set.name.toLocaleLowerCase(resolvedLanguage).includes(normalizedQuery));
  }, [normalizedQuery, resolvedLanguage, sets]);
  const setDetailIds = useMemo(() => candidateSets.slice(0, LATEST_SET_LIMIT).map((set) => set.id), [candidateSets]);
  const { data: setDetails } = useQuery({
    queryKey: ['tcg', 'activation-set-details', resolvedLanguage, setDetailIds],
    queryFn: async () => (await Promise.all(setDetailIds.map(async (setId) => {
      try {
        return await getSetById(setId, resolvedLanguage);
      } catch {
        return null;
      }
    })))
      .filter((set): set is TCGSet => set !== null),
    enabled: catalogEnabled && setDetailIds.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  const visibleSets = useMemo(() => {
    const detailsById = new Map(setDetails?.map((set) => [set.id, set]));
    return candidateSets.map((set) => {
      const detail = detailsById.get(set.id);
      return detail ? {
        ...set,
        releaseDate: detail.releaseDate ?? set.releaseDate,
        totalCards: detail.totalCards ?? set.totalCards,
      } : set;
    });
  }, [candidateSets, setDetails]);
  const setDisplayNames = useMemo(() => buildTCGSetDisplayNames(sets ?? []), [sets]);
  const setBrowseLanguage = usePrimeDexStore((state) => state.setTCGBrowseLanguage);
  const isDemo = mounted && !user;
  const startTitle = t(isDemo ? 'tcg.demo.start_title' : 'tcg.activation.start_title', { defaultValue: 'Add a collection' });
  const startDescription = t(isDemo ? 'tcg.demo.start_description' : 'auth.signup_subtitle');
  const startContext = (
    <div className="mb-6">
      <Link
        href={attributedCollectionHref}
        className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        ← {t('tcg.collection_title')}
      </Link>
      <h1 id="tcg-start-title" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{startTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">{startDescription}</p>
    </div>
  );

  const tryEnglish = useCallback(() => {
    setBrowseLanguage('en');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tcgLang', 'en');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, setBrowseLanguage]);

  useEffect(() => {
    if (!mounted || !hasHydrated || authLoading || consent.productMeasurement !== 'granted') return;
    setProductTrackingIdentity(user?.id ?? null);
    void trackTcgStartOpened({ tcg_language: resolvedLanguage, authenticated: Boolean(user) });
  }, [hasHydrated, mounted, resolvedLanguage, user, authLoading, consent.productMeasurement]);

  if (!mounted || !hasHydrated || (user && authLoading)) {
    return (
      <div className="app-page">
        <Header />
        <main className="page-shell page-shell--header-offset min-h-dvh pb-40" aria-labelledby="tcg-start-title">
          {startContext}
          <div role="status" aria-busy="true" aria-label={t('tcg.collection_loading')} className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (user && syncStatus === 'unauthenticated') {
    return (
      <div className="app-page">
        <Header />
        <main className="page-shell page-shell--header-offset min-h-dvh pb-40" aria-labelledby="tcg-start-title">
          {startContext}
          <SyncRequiredPanel headingLevel={2} />
        </main>
      </div>
    );
  }

  if (user && syncStatus !== 'ready' && syncStatus !== 'unauthenticated') {
    return (
      <div className="app-page">
        <Header />
        <main className="page-shell page-shell--header-offset min-h-dvh pb-40" aria-labelledby="tcg-start-title">
          {startContext}
          <SyncStatusPanel status={syncStatus} headingLevel={2} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell page-shell--header-offset pb-24" aria-labelledby="tcg-start-title">
        <Link
          href={isDemo ? attributedCatalogHref : attributedCollectionHref}
          className="mb-4 inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          ← {t(isDemo ? 'tcg.back_to_catalog' : 'tcg.collection_title')}
        </Link>
        <section className="mx-auto max-w-3xl">
          <div className="page-surface px-5 py-7 sm:px-8 sm:py-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                <h1 id="tcg-start-title" className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {startTitle}
                </h1>
              </div>
              <TCGLanguageSelector />
            </div>
            <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/60">
              {startDescription}
            </p>
            <div className="mt-5">
              <TCGDataLangBanner resolvedLang={resolvedLanguage} onTryEnglish={tryEnglish} />
            </div>

            <label htmlFor="set-search" className="mt-7 block text-sm font-bold text-foreground/80">
              {t('tcg.activation.search_sets')}
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
              <input
                id="set-search"
                value={query}
                onChange={(event) => { const value = event.target.value; setQuery(value); if (!searchTracked.current && value.trim()) { searchTracked.current = true; const length = value.trim().length; trackProductEvent('tcg_set_search_used', length <= 3 ? 'length_1_3' : length <= 8 ? 'length_4_8' : 'length_9_plus'); } }}
                type="search"
                placeholder={t('tcg.activation.search_sets_placeholder')}
                className="h-12 w-full rounded-sm border border-border/50 bg-card/60 pl-12 pr-4 text-base text-foreground placeholder:text-foreground/35 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <section className="mt-7" aria-labelledby="latest-sets-title">
            <h2 id="latest-sets-title" className="text-sm font-black uppercase tracking-[0.12em] text-foreground/65">
              {normalizedQuery ? t('tcg.activation.search_results') : t('tcg.activation.latest_sets')}
            </h2>

            {isLoading ? (
              <div className="mt-4 space-y-3" aria-busy="true">
                {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-sm border border-border/20 bg-card/35" />)}
              </div>
            ) : isError ? (
              <div className="mt-4 rounded-sm border border-destructive/30 bg-destructive/10 p-5">
                <p className="text-sm text-foreground/75">{t('tcg.activation.sets_load_error')}</p>
                <button type="button" onClick={() => void refetch()} className="mt-4 min-h-11 rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                  {t('common.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            ) : visibleSets.length === 0 ? (
              <div className="mt-4 rounded-sm border border-dashed border-border/40 bg-card/30 p-6 text-center">
                <p className="text-sm text-foreground/65">{t('tcg.activation.no_sets_found')}</p>
                <button type="button" onClick={() => setQuery('')} className="mt-4 min-h-11 rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                  {t('tcg.activation.show_latest_sets')}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {visibleSets.map((set) => {
                  const releaseDate = formatReleaseDate(set.releaseDate, interfaceLanguage);
                  const total = set.cardCount?.total ?? set.totalCards;
                  const activationParams = new URLSearchParams(attributionParams);
                  activationParams.set('activation', '1');
                  return (
                    <Link
                      key={set.id}
                      href={`${localeHref(`/tcg/collection/${resolvedLanguage}/${encodeURIComponent(set.id)}`)}?${activationParams.toString()}`}
                      onClick={() => {
                        void trackProductEvent('tcg_set_selected', normalizedQuery ? 'search' : 'latest_list', undefined, { set_id: set.id, tcg_language: resolvedLanguage, authenticated: Boolean(user) });
                      }}
                      className="group flex min-h-20 items-center gap-4 rounded-sm border border-border/30 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/40 p-1">
                        <TCGImageWithFallback candidates={getTCGSetImageCandidates(set)} alt="" fill sizes="48px" className="object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-foreground group-hover:text-primary">{setDisplayNames.get(set.id) ?? set.name}</p>
                        <p className="mt-1 text-sm text-foreground/55">
                          {[releaseDate, total ? t('tcg.activation.card_total', { count: total }) : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-primary">
                        {t('tcg.activation.choose_set')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <Link href={localeHref('/tcg')} className="mt-8 inline-flex min-h-11 items-center text-sm font-bold text-foreground/60 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            {t('tcg.activation.search_cards_instead')}
          </Link>
        </section>
      </main>
    </div>
  );
}
