'use client';

import { useId, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Sparkles, ChevronDown, Trophy } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import {
  getSetCompletionFromSet,
  computeCollectionStatsFromSets,
} from '@/lib/tcg-collection';
import { TCGProgressBar } from './TCGProgressBar';
import { TCGActiveSetInsights } from './TCGActiveSetInsights';

interface TCGCollectionOverviewProps {
  sets: TCGSet[];
  resolvedLang?: string;
}

export function TCGCollectionOverview({ sets, resolvedLang = 'en' }: TCGCollectionOverviewProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const ownedList = usePrimeDexStore((s) => s.tcgOwnedCards);
  const ownedIds = useMemo(() => new Set(ownedList), [ownedList]);
  const tcgActiveSets = usePrimeDexStore((s) => s.tcgActiveSets);
  const toggleTCGActiveSet = usePrimeDexStore((s) => s.toggleTCGActiveSet);
  const [filterInProgress, setFilterInProgress] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'id-asc' | 'progress' | 'release-newest' | 'release-oldest' | 'name-asc' | 'name-desc'>('progress');
  const searchId = useId();
  const sortId = useId();
  const setListId = useId();

  const stats = useMemo(() => computeCollectionStatsFromSets(sets, ownedIds), [sets, ownedIds]);

  const activeSets = useMemo(
    () => sets.filter((set) => tcgActiveSets.includes(set.id)),
    [sets, tcgActiveSets],
  );

  const setEntries = useMemo(() => {
    return sets
      .map((set) => ({
        set,
        completion: getSetCompletionFromSet(set, ownedIds),
      }))
      .filter((entry) => {
        if (filterInProgress && entry.completion.percentage >= 100) return false;
        if (search) {
          const q = search.toLowerCase();
          return entry.set.name.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        function toDateNum(d?: string): number {
          if (!d) return 0;
          const p = d.split(/[-/]/);
          return (Number(p[0]) || 0) * 10000 + (Number(p[1]) || 0) * 100 + (Number(p[2]) || 0);
        }
        switch (sortMode) {
          case 'id-asc':
            return a.set.id.localeCompare(b.set.id);
          case 'release-newest':
            return toDateNum(b.set.releaseDate) - toDateNum(a.set.releaseDate);
          case 'release-oldest':
            return toDateNum(a.set.releaseDate) - toDateNum(b.set.releaseDate);
          case 'name-asc':
            return a.set.name.localeCompare(b.set.name);
          case 'name-desc':
            return b.set.name.localeCompare(a.set.name);
          default:
            if (a.completion.percentage === b.completion.percentage) {
              return a.set.name.localeCompare(b.set.name);
            }
            if (a.completion.percentage >= 100) return 1;
            if (b.completion.percentage >= 100) return -1;
            return b.completion.percentage - a.completion.percentage;
        }
      });
  }, [sets, ownedIds, filterInProgress, search, sortMode]);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Recap hero */}
      <div className="rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 p-5 shadow-[var(--shadow-pixel)]">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">
            {t('tcg.collection_recap_title')}
          </h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
              {t('tcg.collection_total_owned')}
            </p>
            <p className="mt-1 text-3xl font-black leading-none">{stats.totalOwned}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
              {t('tcg.collection_sets_completed')}
            </p>
            <p className="mt-1 text-3xl font-black leading-none">
              {stats.completeSets.length}
              <span className="text-base text-foreground/30">/{stats.totalSets}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
              {t('tcg.collection_overall_progress')}
            </p>
            <p className="mt-1 text-3xl font-black leading-none">{stats.percentage}%</p>
            <TCGProgressBar
              owned={stats.totalOwned}
              total={stats.totalCards}
              size="sm"
              className="mt-2 w-full"
            />
          </div>
        </div>
      </div>

      {/* Active set insights */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-foreground/40" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/65">
            {t('tcg.collection_active_insights')}
          </h2>
        </div>
        {activeSets.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border/30 bg-card/20 p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/30">
            {t('tcg.collection_active_insights_hint')}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeSets.map((set) => (
              <TCGActiveSetInsights
                key={set.id}
                set={set}
                ownedIds={ownedIds}
                resolvedLang={resolvedLang}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
            {t('tcg.collection_total_owned')}
          </p>
          <p className="mt-1 text-2xl font-black">{stats.totalOwned}</p>
        </div>
        <div className="rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
            {t('tcg.collection_total_cards')}
          </p>
          <p className="mt-1 text-2xl font-black">{stats.totalCards}</p>
        </div>
        <div className="rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
            {t('tcg.collection_overall_progress')}
          </p>
          <TCGProgressBar
            owned={stats.totalOwned}
            total={stats.totalCards}
            size="sm"
            className="mt-2 w-full"
          />
          <p className="mt-1 text-xl font-black">{stats.percentage}%</p>
        </div>
        <div className="rounded-sm border border-border/20 bg-card/30 p-4 shadow-[var(--shadow-pixel-sm)]">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">
            {t('tcg.collection_active_sets_plural')}
          </p>
          <p className="mt-1 text-2xl font-black">{activeSets.length}</p>
        </div>
      </div>

      {/* Sets list */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground/40" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/65">
              {t('tcg.collection_per_set')}
            </h2>
          </div>
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
            <div className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-border/30 bg-card/40 px-3 focus-within:border-primary/40 sm:w-48">
              <label htmlFor={searchId} className="sr-only">
                {t('tcg.collection_search_sets')}
              </label>
              <Search className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" />
              <input
                id={searchId}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('tcg.collection_search_sets')}
                aria-label={t('tcg.collection_search_sets')}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-[11px] font-bold text-foreground placeholder:text-foreground/45 focus:outline-none"
              />
            </div>
            <div className="flex min-h-11 w-full items-center gap-1 rounded-sm border border-border/30 bg-card/40 pl-3 pr-2 focus-within:border-primary/40 sm:w-auto">
              <label htmlFor={sortId} className="sr-only">
                {t('tcg.collection_sort_label')}
              </label>
              <select
                id={sortId}
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                aria-label={t('tcg.collection_sort_label')}
                className="min-h-11 min-w-0 flex-1 appearance-none bg-transparent py-2 text-[11px] font-bold text-foreground/75 transition-[background-color,color] hover:bg-card/60 focus:outline-none sm:w-36"
              >
                <option value="id-asc">{t('tcg.collection_sort_id')}</option>
                <option value="progress">{t('tcg.collection_sort_default')}</option>
                <option value="release-newest">{t('tcg.collection_sort_release_newest')}</option>
                <option value="release-oldest">{t('tcg.collection_sort_release_oldest')}</option>
                <option value="name-asc">{t('tcg.collection_sort_name_asc')}</option>
                <option value="name-desc">{t('tcg.collection_sort_name_desc')}</option>
              </select>
              <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={() => setFilterInProgress(!filterInProgress)}
              aria-pressed={filterInProgress}
              aria-controls={setListId}
              aria-label={t('tcg.collection_filter_in_progress')}
              className={`touch-target min-h-11 w-full shrink-0 rounded-sm border px-3 text-[11px] font-bold transition-[border-color,background-color,color] sm:w-auto ${
                filterInProgress
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border/30 bg-card/40 text-foreground/70 hover:border-primary/30 hover:text-primary/60'
              }`}
            >
              {t('tcg.collection_in_progress')}
            </button>
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {t('tcg.collection_results_summary', { count: setEntries.length })}
        </p>

        {setEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/50">
              {t('tcg.no_cards')}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterInProgress(false);
                setSortMode('progress');
              }}
              className="touch-target min-h-11 rounded-sm border border-primary/40 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-primary transition-[background-color,border-color] hover:border-primary/60 hover:bg-primary/15"
            >
              {t('tcg.collection_reset_filters')}
            </button>
          </div>
        ) : (
          <div id={setListId} className="flex flex-col gap-3">
            {setEntries.map(({ set, completion }) => {
              const isComplete = completion.percentage >= 100;
              const isActive = tcgActiveSets.includes(set.id);
              const missing = Math.max(completion.total - completion.owned, 0);
              return (
                <div
                  key={set.id}
                  className="group flex flex-col gap-3 rounded-sm border border-border/15 bg-card/30 p-3 shadow-[var(--shadow-pixel-sm)] transition-[border-color,background-color,transform] hover:-translate-x-px hover:-translate-y-px hover:border-primary/20 hover:bg-card/50 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                >
                  <Link
                    href={localeHref(`/tcg/collection/${set.id}`)}
                    aria-label={t('tcg.collection_view_set', { name: set.name })}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:gap-4"
                  >
                    {set.logo && (
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-card/40">
                        <Image src={set.logo} alt="" width={48} height={48} unoptimized className="max-h-full max-w-full object-contain p-1" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold transition-colors group-hover:text-primary">
                        {set.name}
                      </p>
                      <TCGProgressBar
                        owned={completion.owned}
                        total={completion.total}
                        size="sm"
                        className="mt-2"
                      />
                      <p className="mt-1 text-[11px] font-bold text-foreground/60">
                        {missing} {t('tcg.collection_missing_count')}
                      </p>
                    </div>
                  </Link>
                  <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end sm:justify-center">
                    {isComplete && (
                      <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-400">
                        {t('tcg.collection_complete')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleTCGActiveSet(set.id)}
                      aria-pressed={isActive}
                      aria-label={t(isActive ? 'tcg.collection_active_set_remove' : 'tcg.collection_active_set_add', { name: set.name })}
                      className={`touch-target min-h-11 rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.06em] transition-[border-color,background-color,color] ${
                        isActive
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border/35 text-foreground/55 hover:border-primary/30 hover:text-primary/70'
                      }`}
                    >
                      {isActive ? t('tcg.collection_in_progress') : t('tcg.collection_active_sets_singular')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
