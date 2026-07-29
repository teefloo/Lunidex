'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import { TCGImageWithFallback } from '@/components/tcg/TCGImageWithFallback';
import { getAllSets } from '@/lib/api/tcg';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGSet } from '@/types/tcg';

const LATEST_SET_LIMIT = 12;

function sortByReleaseDate(sets: TCGSet[]): TCGSet[] {
  return [...sets].sort((left, right) => {
    const leftDate = left.releaseDate ? Date.parse(left.releaseDate) : Number.NEGATIVE_INFINITY;
    const rightDate = right.releaseDate ? Date.parse(right.releaseDate) : Number.NEGATIVE_INFINITY;
    return rightDate - leftDate || left.name.localeCompare(right.name);
  });
}

function formatReleaseDate(date: string | undefined, locale: string): string | null {
  if (!date || Number.isNaN(Date.parse(date))) return null;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
}

export function TCGStartPage() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const ownedCards = usePrimeDexStore((state) => state.tcgOwnedCards);
  const activeSets = usePrimeDexStore((state) => state.tcgActiveSets);
  const language = usePrimeDexStore((state) => state.language);
  const systemLanguage = usePrimeDexStore((state) => state.systemLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const [query, setQuery] = useState('');
  const resolvedLanguage = mounted ? (language === 'auto' ? systemLanguage || 'en' : language) : 'en';

  const { data: sets, isLoading, isError, refetch } = useQuery({
    queryKey: ['tcg', 'activation-sets', resolvedLanguage],
    queryFn: () => getAllSets(resolvedLanguage),
    staleTime: 60 * 60 * 1000,
    enabled: mounted,
  });

  const existingCollectionHref = activeSets[0]
    ? localeHref(`/tcg/collection/${activeSets[0]}`)
    : localeHref('/tcg/collection');

  const normalizedQuery = query.trim().toLocaleLowerCase(resolvedLanguage);
  const visibleSets = useMemo(() => {
    const sorted = sortByReleaseDate(sets ?? []);
    if (!normalizedQuery) return sorted.slice(0, LATEST_SET_LIMIT);
    return sorted.filter((set) => set.name.toLocaleLowerCase(resolvedLanguage).includes(normalizedQuery));
  }, [normalizedQuery, resolvedLanguage, sets]);

  if (!mounted || !hasHydrated) {
    return (
      <div className="app-page">
        <Header />
        <main className="page-shell flex min-h-dvh items-center justify-center pt-24 pb-24" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </main>
      </div>
    );
  }

  if (ownedCards.length > 0) {
    return (
      <div className="app-page">
        <Header />
        <main className="page-shell pt-24 pb-24" aria-labelledby="tcg-resume-title">
          <section className="mx-auto max-w-2xl page-surface px-5 py-8 text-center sm:px-8">
            <Sparkles className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
            <h1 id="tcg-resume-title" className="mt-4 text-3xl font-black tracking-tight">
              {t('tcg.activation.resume_cta', { defaultValue: 'Resume my collection' })}
            </h1>
            <p className="mt-3 text-base leading-7 text-foreground/60">
              {t('tcg.activation.resume_description', { defaultValue: 'Your locally saved cards are ready to continue.' })}
            </p>
            <Link href={existingCollectionHref} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {t('tcg.activation.resume_cta', { defaultValue: 'Resume my collection' })} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24" aria-labelledby="tcg-start-title">
        <section className="mx-auto max-w-3xl">
          <div className="page-surface px-5 py-7 sm:px-8 sm:py-9">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 id="tcg-start-title" className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {t('tcg.activation.start_title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/60">
              {t('tcg.activation.start_description')}
            </p>

            <label htmlFor="set-search" className="mt-7 block text-sm font-bold text-foreground/80">
              {t('tcg.activation.search_sets')}
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
              <input
                id="set-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
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
                  const releaseDate = formatReleaseDate(set.releaseDate, resolvedLanguage);
                  const total = set.cardCount?.total ?? set.totalCards;
                  return (
                    <Link
                      key={set.id}
                      href={localeHref(`/tcg/collection/${set.id}?activation=1`)}
                      className="group flex min-h-20 items-center gap-4 rounded-sm border border-border/30 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/40 p-1">
                        <TCGImageWithFallback candidates={getTCGSetImageCandidates(set)} alt="" width={48} height={48} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-foreground group-hover:text-primary">{set.name}</p>
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
