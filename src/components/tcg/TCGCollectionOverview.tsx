'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Trophy, Sparkles, ChevronDown } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import {
  getSetCompletion,
  computeCollectionStats,
  getRarestOwnedCards,
} from '@/lib/tcg-collection';
import { TCGProgressBar } from './TCGProgressBar';
import { TCGRarityBadge } from './TCGRarityBadge';
import { TCGCardImage } from './TCGCardImage';

interface TCGCollectionOverviewProps {
  setsMap: Map<string, { set: TCGSet; cards: TCGCard[] }>;
}

export function TCGCollectionOverview({ setsMap }: TCGCollectionOverviewProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const ownedList = usePrimeDexStore((s) => s.tcgOwnedCards);
  const ownedIds = useMemo(() => new Set(ownedList), [ownedList]);
  const tcgActiveSets = usePrimeDexStore((s) => s.tcgActiveSets);
  const toggleTCGActiveSet = usePrimeDexStore((s) => s.toggleTCGActiveSet);
  const [filterInProgress, setFilterInProgress] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'progress' | 'release-newest' | 'release-oldest' | 'name-asc' | 'name-desc'>('progress');

  const stats = useMemo(() => computeCollectionStats(setsMap, ownedIds), [setsMap, ownedIds]);
  const rarest = useMemo(() => getRarestOwnedCards(setsMap, ownedIds, 12), [setsMap, ownedIds]);

  const setEntries = useMemo(() => {
    const entries = [...setsMap.entries()];
    return entries
      .map(([setId, { set, cards }]) => ({
        setId,
        set,
        cards,
        completion: getSetCompletion(cards, ownedIds),
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
  }, [setsMap, ownedIds, filterInProgress, search, sortMode]);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/20 bg-card/30 p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
            {t('tcg.collection_total_owned')}
          </p>
          <p className="mt-1 text-2xl font-black">{stats.totalOwned}</p>
        </div>
        <div className="rounded-xl border border-border/20 bg-card/30 p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
            {t('tcg.collection_total_cards')}
          </p>
          <p className="mt-1 text-2xl font-black">{stats.totalCards}</p>
        </div>
        <div className="rounded-xl border border-border/20 bg-card/30 p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
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
        <div className="rounded-xl border border-border/20 bg-card/30 p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40">
            {t('tcg.collection_active_sets_plural')}
          </p>
          <p className="mt-1 text-2xl font-black">{stats.totalSets}</p>
        </div>
      </div>

      {/* Rarest owned */}
      {rarest.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/50">
              {t('tcg.collection_rarest_owned')}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rarest.map((card) => (
              <Link
                key={card.id}
                href={`/tcg/collection/${card.set?.id}?card=${card.id}`}
                className="group relative aspect-[2.15/3] overflow-hidden rounded-lg border border-border/20 bg-card/30 transition-all hover:border-primary/30"
              >
                {card.image ? (
                  <TCGCardImage
                    card={card}
                    sizes="(min-width: 1280px) 14vw, (min-width: 768px) 20vw, 40vw"
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-[8px] font-bold text-foreground/30">{card.name}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                  <p className="truncate text-[8px] font-black uppercase text-white drop-shadow-md">
                    {card.name}
                  </p>
                </div>
                <div className="absolute right-1 top-1">
                  <TCGRarityBadge rarity={card.rarity} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sets list */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground/40" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/50">
              {t('tcg.collection_per_set')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center gap-2 rounded-full border border-border/30 bg-card/40 pl-3 pr-3 focus-within:border-primary/40 sm:w-48 w-32">
              <Search className="h-3 w-3 shrink-0 text-foreground/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('tcg.search_placeholder')}
                className="min-w-0 flex-1 bg-transparent text-[9px] font-bold text-foreground placeholder:text-foreground/25 focus:outline-none"
              />
            </div>
            <div className="flex h-8 items-center gap-1 rounded-full border border-border/30 bg-card/40 pl-3 pr-2 focus-within:border-primary/40">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="min-w-0 flex-1 appearance-none bg-transparent text-[9px] font-bold text-foreground/70 transition-colors hover:bg-card/60 focus:outline-none"
              >
                <option value="progress">{t('tcg.collection_sort_default')}</option>
                <option value="release-newest">{t('tcg.collection_sort_release_newest')}</option>
                <option value="release-oldest">{t('tcg.collection_sort_release_oldest')}</option>
                <option value="name-asc">{t('tcg.collection_sort_name_asc')}</option>
                <option value="name-desc">{t('tcg.collection_sort_name_desc')}</option>
              </select>
              <ChevronDown className="pointer-events-none h-3 w-3 shrink-0 text-foreground/30" />
            </div>
            <button
              type="button"
              onClick={() => setFilterInProgress(!filterInProgress)}
              className={`h-8 shrink-0 rounded-full border px-3 text-[9px] font-bold transition-colors ${
                filterInProgress
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border/30 bg-card/40 text-foreground/70 hover:border-primary/30 hover:text-primary/60'
              }`}
            >
              {t('tcg.collection_in_progress')}
            </button>
          </div>
        </div>

        {setEntries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/20">
              {t('tcg.no_cards')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {setEntries.map(({ setId, set, completion }) => {
              const isComplete = completion.percentage >= 100;
              const isActive = tcgActiveSets.includes(setId);
              return (
                <Link
                  key={setId}
                  href={`/tcg/collection/${setId}`}
                  className="group flex items-center gap-4 rounded-xl border border-border/15 bg-card/30 p-4 transition-all hover:border-primary/20 hover:bg-card/50"
                >
                  {set.logo && (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-card/40">
                      <Image src={set.logo} alt={set.name} fill className="object-contain p-1" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold group-hover:text-primary">
                      {set.name}
                    </p>
                    <TCGProgressBar
                      owned={completion.owned}
                      total={completion.total}
                      size="sm"
                      className="mt-2"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isComplete && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-400">
                        {t('tcg.collection_complete')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleTCGActiveSet(setId);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.06em] transition-colors ${
                        isActive
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border/30 text-foreground/30 hover:border-primary/30 hover:text-primary/60'
                      }`}
                    >
                      {isActive ? t('tcg.collection_in_progress') : t('tcg.collection_active_sets_singular')}
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
