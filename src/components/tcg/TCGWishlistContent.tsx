'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Trash2, Sparkles, ListOrdered, AlertCircle } from 'lucide-react';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';
import {
  getWishlistSuggestions,
  sortByRarityWeight,
  formatWishlistCopyPaste,
} from '@/lib/tcg-collection';
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { TCGRarityBadge } from './TCGRarityBadge';
import { TCGCardImage } from './TCGCardImage';

interface TCGWishlistContentProps {
  setsMap: Map<string, { set: TCGSet; cards: TCGCard[] }>;
}

type WishlistSort = 'rarity' | 'set' | 'name';

export function TCGWishlistContent({ setsMap }: TCGWishlistContentProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const store = usePrimeDexStore();
  const tcgWishlistCards = store.tcgWishlistCards;
  const tcgOwnedCards = store.tcgOwnedCards;
  const tcgActiveSets = store.tcgActiveSets;
  const toggleTCGWishlist = store.toggleTCGWishlist;
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState<WishlistSort>('rarity');
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ownedIds = useMemo(() => new Set(tcgOwnedCards), [tcgOwnedCards]);
  const wishlistIds = useMemo(() => new Set(tcgWishlistCards), [tcgWishlistCards]);

  const activeSetIds = useMemo(() => new Set(tcgActiveSets), [tcgActiveSets]);

  const suggestions = useMemo(
    () => getWishlistSuggestions(setsMap, ownedIds, [...activeSetIds]),
    [setsMap, ownedIds, activeSetIds],
  );

  const manualCards = useMemo(() => {
    const cards: TCGCard[] = [];
    for (const [, { cards: setCards }] of setsMap) {
      for (const card of setCards) {
        if (wishlistIds.has(card.id) && !ownedIds.has(card.id)) {
          cards.push(card);
        }
      }
    }
    return cards;
  }, [setsMap, wishlistIds, ownedIds]);

  const sortedSuggestions = useMemo(() => {
    if (sortBy === 'rarity') return sortByRarityWeight(suggestions.filter((c) => !wishlistIds.has(c.id)));
    if (sortBy === 'name') return [...suggestions].filter((c) => !wishlistIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...suggestions].filter((c) => !wishlistIds.has(c.id));
  }, [suggestions, sortBy, wishlistIds]);

  const sortedManual = useMemo(() => {
    if (sortBy === 'rarity') return sortByRarityWeight(manualCards);
    if (sortBy === 'name') return [...manualCards].sort((a, b) => a.name.localeCompare(b.name));
    return [...manualCards].sort((a, b) => (a.set?.name ?? '').localeCompare(b.set?.name ?? ''));
  }, [manualCards, sortBy]);

  const handleCopy = () => {
    const text = formatWishlistCopyPaste(sortedManual);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Suggestions */}
      {activeSetIds.size > 0 && sortedSuggestions.length > 0 && (
        <div className="rounded-sm border border-border/30 bg-card/40 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/50">
              {t('tcg.wishlist_suggestions_title', { count: sortedSuggestions.length })}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sortedSuggestions.slice(0, 30).map((card, i) => (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.4) }}
                type="button"
                onClick={() => {
                  setSelectedCard(card);
                  setIsModalOpen(true);
                }}
                className="group relative aspect-[2.15/3] overflow-hidden rounded-lg border border-border/20 bg-card/60 text-left transition-all hover:border-primary/30"
              >
                {card.image ? (
                  <TCGCardImage
                    card={card}
                    sizes="(min-width: 1280px) 12vw, (min-width: 768px) 20vw, 40vw"
                    className="object-contain opacity-80 transition-opacity group-hover:opacity-100"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-[9px] font-bold uppercase text-foreground/30">{card.name}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                  <p className="truncate text-[8px] font-black uppercase text-white drop-shadow-md">
                    {card.name}
                  </p>
                  <p className="text-[7px] text-white/60">{card.set?.name}</p>
                </div>
                <div className="absolute right-1 top-1">
                  <TCGRarityBadge rarity={card.rarity} />
                </div>
                <div className="absolute left-1 top-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTCGWishlist(card.id);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/80 text-white opacity-0 transition-opacity hover:bg-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Manual wishlist */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-foreground/40" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/50">
              {t('tcg.wishlist_manual_title', { count: sortedManual.length })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as WishlistSort)}
              className="h-8 rounded-full border border-border/40 bg-card/60 px-3 text-[9px] font-bold uppercase tracking-[0.06em] text-foreground focus:border-primary/40 focus:outline-none"
            >
              <option value="rarity">{t('tcg.wishlist_sort_rarity')}</option>
              <option value="set">{t('tcg.wishlist_sort_set')}</option>
              <option value="name">{t('tcg.wishlist_sort_name')}</option>
            </select>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[9px] font-black uppercase tracking-[0.08em] transition-colors',
                copied
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                  : 'border-border/40 bg-card/60 text-foreground/50 hover:border-primary/30 hover:text-primary',
              )}
            >
              <Copy className="h-3 w-3" />
              {copied ? t('tcg.copied') : t('tcg.copy')}
            </button>
          </div>
        </div>

        {sortedManual.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-foreground/20" />
            <p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/30">
              {t('tcg.wishlist_empty')}
            </p>
            <p className="mt-1 text-xs text-foreground/25">
              {t('tcg.wishlist_empty_desc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/20 rounded-sm border border-border/30 bg-card/40">
            {sortedManual.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedCard(card);
                  setIsModalOpen(true);
                }}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md">
                  {card.image ? (
                    <TCGCardImage
                      card={card}
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted/40">
                      <span className="text-[6px] font-bold text-foreground/20">N/A</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{card.name}</p>
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/40">
                    {card.set?.name} — #{card.localId}
                  </p>
                </div>
                <TCGRarityBadge rarity={card.rarity} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTCGWishlist(card.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/30 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {activeSetIds.size === 0 && sortedManual.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/30">
            {t('tcg.no_suggestions')}
          </p>
          <p className="mt-1 text-xs text-foreground/25">
            {t('tcg.no_suggestions_desc')}
          </p>
        </div>
      )}

      {selectedCard && (
        <TCGCardDetailModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
