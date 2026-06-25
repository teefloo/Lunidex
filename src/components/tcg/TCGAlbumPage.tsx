'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import {
  getSetCompletion,
  getCompletionByRarity,
  getMissingCardsInSet,
  sortCardsByNumber,
  getRarityColor,
} from '@/lib/tcg-collection';
import { TCGAlbumCard } from './TCGAlbumCard';
import { TCGProgressBar } from './TCGProgressBar';

interface TCGAlbumPageProps {
  set: TCGSet;
  cards: TCGCard[];
}

export function TCGAlbumPage({ set, cards }: TCGAlbumPageProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const ownedList = usePrimeDexStore((s) => s.tcgOwnedCards);
  const ownedIds = useMemo(() => new Set(ownedList), [ownedList]);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const sortedCards = useMemo(() => sortCardsByNumber(cards), [cards]);
  const completion = useMemo(() => getSetCompletion(cards, ownedIds), [cards, ownedIds]);
  const rarityCompletion = useMemo(() => getCompletionByRarity(cards, ownedIds), [cards, ownedIds]);
  const missingCards = useMemo(() => getMissingCardsInSet(cards, ownedIds), [cards, ownedIds]);

  const filteredCards = useMemo(() => {
    let result = sortedCards;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (rarityFilter) {
      result = result.filter((c => (c.rarity ?? '').toLowerCase() === rarityFilter.toLowerCase()));
    }
    if (showMissingOnly) {
      result = result.filter((c) => !ownedIds.has(c.id));
    }
    return result;
  }, [sortedCards, search, rarityFilter, showMissingOnly, ownedIds]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/tcg/collection"
          aria-label="Back to TCG collection"
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-border/30 text-foreground/40 transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          {set.logo && (
            <div className="relative h-10 w-10 shrink-0">
              <Image src={set.logo} alt={set.name} fill sizes="40px" unoptimized className="object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight sm:text-xl">
              {set.name}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/40">
              {t('tcg.collection_owned')} — {completion.owned}/{completion.total}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <TCGProgressBar
        owned={completion.owned}
        total={completion.total}
        size="lg"
        className="max-w-md"
      />

      {/* Rarity completion */}
      {rarityCompletion.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {rarityCompletion.map((r) => (
            <button
              key={r.rarity}
              type="button"
              onClick={() => setRarityFilter(rarityFilter === r.rarity ? null : r.rarity)}
              className="rounded-lg border border-border/20 bg-card/30 px-2.5 py-1.5 text-left transition-colors hover:bg-card/50"
            >
              <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-foreground/40">
                {r.rarity}
              </span>
              <span className={getRarityColor(r.rarity)}>
                {r.owned}/{r.total}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tcg.search_placeholder')}
            className="h-9 w-full rounded-sm border border-border/30 bg-card/40 pl-9 pr-4 text-xs font-bold text-foreground placeholder:text-foreground/25 focus:border-primary/40 focus:outline-none"
          />
        </div>
        {missingCards.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMissingOnly((prev) => !prev)}
            className={`shrink-0 rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.06em] transition-colors ${
              showMissingOnly
                ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {t('tcg.collection_missing')} ({missingCards.length})
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filteredCards.map((card) => (
          <TCGAlbumCard
            key={card.id}
            card={card}
            owned={ownedIds.has(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
