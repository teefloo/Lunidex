'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, ExternalLink, LockKeyhole } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePrimeDexStore } from '@/store/primedex';
import { hasSyncAccess, requestSyncAccess, type SyncAccessStatus } from '@/store/sync-access';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { capturePostHogEvent } from '@/lib/posthog-client';
import { localeHref } from '@/lib/seo';
import {
  filterAnniversary30Cards,
} from '@/lib/anniversary-30-cards';
import type {
  Anniversary30Card,
  Anniversary30CardFilter,
  Anniversary30Language,
} from '@/lib/anniversary-30';
import { getTCGCollectionCardIds } from '@/lib/tcg-collections';

export const ANNIVERSARY_30_DEFAULT_FILTERS: readonly Anniversary30CardFilter[] = [
  'all',
  'owned',
  'missing',
  'wishlist',
  'pikachu',
  'pokemon-ex',
  'illustration-rare',
  'special-illustration-rare',
  'futuristic-rare',
  'classic-collection',
];

export type Anniversary30CardGridLabels = {
  filterLabel: string;
  filterAll: string;
  filterOwned: string;
  filterMissing: string;
  filterWishlist: string;
  filterPikachu: string;
  filterPokemonEx: string;
  filterIllustrationRare: string;
  filterSpecialIllustrationRare: string;
  filterFuturisticRare: string;
  filterClassicCollection: string;
  empty: string;
  markOwned: string;
  owned: string;
  viewCard: string;
  officialSource: string;
  imageUnavailable: string;
  imageNotPublished: string;
  illustrator: string;
  scopeNumbered: string;
  scopeSecret: string;
  scopePikachu: string;
  scopeClassic: string;
  scopeEnergy: string;
  scopePromo: string;
  statusOfficial: string;
  statusVerified: string;
  statusReported: string;
  statusUnknown: string;
  syncRequired: string;
  loading: string;
};

export type Anniversary30CardGridProps = {
  cards: readonly Anniversary30Card[];
  collectionKey: string;
  language: Anniversary30Language;
  labels: Anniversary30CardGridLabels;
  filters?: readonly Anniversary30CardFilter[];
  className?: string;
};

const FILTER_LABEL_KEYS: Readonly<Record<Anniversary30CardFilter, keyof Anniversary30CardGridLabels>> = {
  all: 'filterAll',
  owned: 'filterOwned',
  missing: 'filterMissing',
  wishlist: 'filterWishlist',
  pikachu: 'filterPikachu',
  'pokemon-ex': 'filterPokemonEx',
  'illustration-rare': 'filterIllustrationRare',
  'special-illustration-rare': 'filterSpecialIllustrationRare',
  'futuristic-rare': 'filterFuturisticRare',
  'classic-collection': 'filterClassicCollection',
};

const SCOPE_LABEL_KEYS: Readonly<Record<Anniversary30Card['scope'], keyof Anniversary30CardGridLabels>> = {
  'numbered-main': 'scopeNumbered',
  'secret-rare': 'scopeSecret',
  pikachu: 'scopePikachu',
  'classic-collection': 'scopeClassic',
  'basic-energy': 'scopeEnergy',
  promo: 'scopePromo',
};

const STATUS_LABEL_KEYS: Readonly<Record<Anniversary30Card['sourceStatus'], keyof Anniversary30CardGridLabels>> = {
  official: 'statusOfficial',
  'verified-database': 'statusVerified',
  reported: 'statusReported',
  unknown: 'statusUnknown',
};

function getCardUrl(card: Anniversary30Card, language: Anniversary30Language): string | null {
  if (card.lunidexCardId) {
    return `${localeHref(`/tcg/cards/${encodeURIComponent(card.lunidexCardId)}`, language)}?tcgLang=${encodeURIComponent(language)}`;
  }
  return card.officialUrl ?? null;
}

function getOwnedSet(collectionKey: string, collectionCards: readonly string[]): Set<string> {
  return new Set(getTCGCollectionCardIds(collectionKey, collectionCards));
}

function getSyncMessage(status: SyncAccessStatus, labels: Anniversary30CardGridLabels): string | null {
  return status === 'ready' ? null : labels.syncRequired;
}

function CardImage({ card, language, labels }: { card: Anniversary30Card; language: Anniversary30Language; labels: Anniversary30CardGridLabels }) {
  const [failed, setFailed] = useState(false);
  const source = card.imageUrl?.[language] ?? card.imageUrl?.en;

  if (!source || failed) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center bg-gradient-to-br from-primary/15 via-background/70 to-amber-300/10 p-5 text-center">
        <span className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-foreground/45">
          {card.imageStatus === 'not-published' ? labels.imageNotPublished : labels.imageUnavailable}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={source}
      alt={`${card.name} — ${card.collectorNumber}`}
      fill
      unoptimized
      sizes="(min-width: 1280px) 14vw, (min-width: 768px) 21vw, 42vw"
      className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.03]"
      onError={() => setFailed(true)}
    />
  );
}

export function Anniversary30CardGrid({
  cards,
  collectionKey,
  language,
  labels,
  filters = ANNIVERSARY_30_DEFAULT_FILTERS,
  className,
}: Anniversary30CardGridProps) {
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const wishlistCards = usePrimeDexStore((state) => state.tcgWishlistCards);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const toggleCollectionCard = usePrimeDexStore((state) => state.toggleTCGCollectionCard);
  const syncStatus = useSyncAccessStatus();
  const [activeFilter, setActiveFilter] = useState<Anniversary30CardFilter>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const ownedIds = useMemo(
    () => getOwnedSet(collectionKey, collectionCards),
    [collectionCards, collectionKey],
  );
  const wishlistIds = useMemo(() => new Set(wishlistCards), [wishlistCards]);
  const configuredFilters = useMemo(() => [...new Set(filters)], [filters]);
  const availableFilters = useMemo(
    () => configuredFilters.filter((filter) => filter === 'all' || filterAnniversary30Cards(cards, filter, ownedIds, wishlistIds).length > 0),
    [cards, configuredFilters, ownedIds, wishlistIds],
  );
  const selectedFilter = availableFilters.includes(activeFilter) ? activeFilter : 'all';
  const visibleCards = useMemo(
    () => filterAnniversary30Cards(cards, selectedFilter, ownedIds, wishlistIds),
    [cards, ownedIds, selectedFilter, wishlistIds],
  );

  function handleFilterChange(filter: Anniversary30CardFilter): void {
    setActiveFilter(filter);
    capturePostHogEvent('anniversary_30_filter_changed', { filter });
  }

  function handleToggle(card: Anniversary30Card): void {
    if (!hasHydrated) return;
    if (!hasSyncAccess()) {
      requestSyncAccess();
      setActionMessage(labels.syncRequired);
      return;
    }

    const before = usePrimeDexStore.getState().isTCGCollectionCardOwned(collectionKey, card.id);
    toggleCollectionCard(collectionKey, card.id);
    const after = usePrimeDexStore.getState().isTCGCollectionCardOwned(collectionKey, card.id);
    if (before === after) {
      setActionMessage(labels.syncRequired);
      return;
    }

    setActionMessage(null);
    capturePostHogEvent('anniversary_30_card_toggled', {
      owned: after,
      scope: card.scope,
    });
  }

  const syncMessage = getSyncMessage(syncStatus, labels);

  return (
    <section className={className} aria-busy={!hasHydrated}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground/50">{labels.filterLabel}</p>
        {actionMessage && (
          <p className="inline-flex items-center gap-2 text-xs font-bold text-amber-300" role="status" aria-live="polite">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            {actionMessage}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={labels.filterLabel}>
        {availableFilters.map((filter) => {
          const count = filterAnniversary30Cards(cards, filter, ownedIds, wishlistIds).length;
          const selected = filter === selectedFilter;
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleFilterChange(filter)}
              className={`min-h-11 rounded-sm border px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${selected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border/50 bg-card/35 text-foreground/55 hover:border-primary/35 hover:text-foreground'}`}
            >
              {labels[FILTER_LABEL_KEYS[filter]]} <span className="tabular-nums text-foreground/45">{count}</span>
            </button>
          );
        })}
      </div>

      {syncMessage && (
        <p className="mt-4 rounded-sm border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm leading-6 text-foreground/65">
          {syncMessage}
        </p>
      )}

      {visibleCards.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleCards.map((card) => {
            const owned = ownedIds.has(card.id);
            const cardUrl = getCardUrl(card, language);
            const statusLabel = labels[STATUS_LABEL_KEYS[card.sourceStatus]];
            const scopeLabel = labels[SCOPE_LABEL_KEYS[card.scope]];
            return (
              <article
                key={card.id}
                className={`group flex min-w-0 flex-col overflow-hidden rounded-sm border bg-card/30 shadow-[var(--shadow-pixel-sm)] transition-colors ${owned ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-border/60 hover:border-primary/35'}`}
              >
                <div className="relative aspect-[2.15/3] overflow-hidden bg-background/55">
                  <CardImage card={card} language={language} labels={labels} />
                  <div className="absolute left-2 top-2 rounded-sm border border-border/50 bg-background/85 px-1.5 py-1 text-[10px] font-black tabular-nums text-foreground/70">
                    #{card.localId}
                  </div>
                  {owned && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-sm border border-emerald-400/40 bg-emerald-950/80 px-1.5 py-1 text-[10px] font-black uppercase text-emerald-200">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{labels.owned}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 tracking-tight">
                      {card.name}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/45">
                      {card.collectorNumber}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] font-black uppercase tracking-[0.06em] text-foreground/55">
                    <span className="rounded-sm border border-border/45 px-1.5 py-1">{scopeLabel}</span>
                    {card.rarity && <span className="rounded-sm border border-border/45 px-1.5 py-1">{card.rarity}</span>}
                  </div>

                  <p className="min-h-8 text-[10px] leading-4 text-foreground/45">
                    {card.illustrator ? `${labels.illustrator}: ${card.illustrator}` : statusLabel}
                  </p>

                  <div className="mt-auto space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(card)}
                      disabled={!hasHydrated}
                      aria-pressed={owned}
                      aria-label={`${owned ? labels.owned : labels.markOwned}: ${card.name}`}
                      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border px-2 text-[10px] font-black uppercase tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-wait disabled:opacity-50 ${owned ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20' : 'border-border/50 bg-card/50 text-foreground/65 hover:border-primary/40 hover:text-primary'}`}
                    >
                      {owned ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      {owned ? labels.owned : labels.markOwned}
                    </button>
                    {cardUrl && (
                      card.lunidexCardId ? (
                        <Link
                          href={cardUrl}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border/35 px-2 text-[10px] font-black uppercase tracking-[0.06em] text-foreground/50 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                        >
                          {labels.viewCard}
                        </Link>
                      ) : (
                        <a
                          href={cardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border/35 px-2 text-[10px] font-black uppercase tracking-[0.06em] text-foreground/50 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                        >
                          {labels.officialSource}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      )
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-sm border border-border/60 bg-card/25 px-4 py-8 text-center text-sm font-bold text-foreground/55">
          {labels.empty}
        </p>
      )}
    </section>
  );
}
