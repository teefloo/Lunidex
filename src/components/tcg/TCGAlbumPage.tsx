'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import {
  getSetCompletion,
  getDisplayableCompletionByRarity,
  getMissingCardsInSet,
  sortCardsByNumber,
  getRarityColor,
} from '@/lib/tcg-collection';
import { TCGAlbumCard } from './TCGAlbumCard';
import { TCGProgressBar } from './TCGProgressBar';
import { TCGImageWithFallback } from './TCGImageWithFallback';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { TCGCollectionVariantSheet } from './TCGCollectionVariantSheet';
import { markProductActivation, trackProductEvent, trackReturnAfterActivation } from '@/lib/product-measurement';
import { encodeTCGCollectionKey, getTCGCollectionCardIds, getTCGCollectionCardOwnerships } from '@/lib/tcg-collections';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { getTCGRarityLabel } from '@/lib/tcg-labels';
import { isSameTcgRarity } from '@/lib/tcg-rarity';
import {
  parseTCGCollectionScrollPosition,
  shouldUseTCGCollectionHistoryBack,
  TCG_COLLECTION_HISTORY_TARGET_KEY,
  TCG_COLLECTION_SCROLL_POSITION_KEY,
  TCG_COLLECTION_SCROLL_RESTORE_KEY,
  type TCGCollectionScrollPosition,
} from '@/lib/tcg-collection-navigation';

interface TCGAlbumPageProps {
  set: TCGSet;
  cards: TCGCard[];
  activation?: boolean;
  language?: TCGCardLanguage;
  collectionKey?: string;
  returnQuery?: string;
  headerAction?: ReactNode;
}

export function TCGAlbumPage({
  set,
  cards,
  activation = false,
  language,
  collectionKey,
  returnQuery,
  headerAction,
}: TCGAlbumPageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const localeHref = useLocaleHref();
  const mounted = useMounted();
  const ownedList = usePrimeDexStore((s) => s.tcgOwnedCards);
  const collectionCards = usePrimeDexStore((s) => s.tcgCollectionCards);
  const browseLanguage = usePrimeDexStore((s) => s.tcgBrowseLanguage);
  const selectedLanguage = language ?? browseLanguage;
  const resolvedCollectionKey = collectionKey ?? encodeTCGCollectionKey(selectedLanguage, set.id) ?? undefined;
  const ownedIds = useMemo(() => new Set(
    resolvedCollectionKey
      ? getTCGCollectionCardIds(resolvedCollectionKey, collectionCards)
      : ownedList,
  ), [collectionCards, ownedList, resolvedCollectionKey]);
  const ownershipByCard = useMemo(() => {
    if (!resolvedCollectionKey) return new Map<string, ReturnType<typeof getTCGCollectionCardOwnerships>>();
    const byCard = new Map<string, ReturnType<typeof getTCGCollectionCardOwnerships>>();
    for (const ownership of getTCGCollectionCardOwnerships(resolvedCollectionKey, collectionCards)) {
      const current = byCard.get(ownership.cardId) ?? [];
      current.push(ownership);
      byCard.set(ownership.cardId, current);
    }
    return byCard;
  }, [collectionCards, resolvedCollectionKey]);

  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [managedCard, setManagedCard] = useState<TCGCard | null>(null);
  const [isVariantSheetOpen, setIsVariantSheetOpen] = useState(false);
  const [firstValueReached, setFirstValueReached] = useState(false);
  const [activationComplete, setActivationComplete] = useState(false);
  const [activationMethod, setActivationMethod] = useState<'second_owned_card' | 'wishlist' | null>(null);
  const historyReturnTargetRef = useRef<string | null>(null);
  const historyReturnScrollPositionRef = useRef<TCGCollectionScrollPosition | null>(null);
  const firstValueReachedRef = useRef(false);
  const cardSearchId = useId();

  const rememberCollectionScrollRestore = useCallback(() => {
    const scrollPosition = historyReturnScrollPositionRef.current;
    if (!scrollPosition) return;

    try {
      window.sessionStorage.setItem(TCG_COLLECTION_SCROLL_RESTORE_KEY, JSON.stringify(scrollPosition));
    } catch {
      // Keep browser back available when session storage is disabled.
    }
  }, []);

  useEffect(() => { if (activation) trackProductEvent('tcg_album_opened', 'activation'); else trackReturnAfterActivation('album_open'); }, [activation]);
  useEffect(() => {
    let storedTarget: string | null = null;
    let storedScrollPosition: TCGCollectionScrollPosition | null = null;
    try {
      storedTarget = window.sessionStorage.getItem(TCG_COLLECTION_HISTORY_TARGET_KEY);
      window.sessionStorage.removeItem(TCG_COLLECTION_HISTORY_TARGET_KEY);
      storedScrollPosition = parseTCGCollectionScrollPosition(
        window.sessionStorage.getItem(TCG_COLLECTION_SCROLL_POSITION_KEY),
      );
      window.sessionStorage.removeItem(TCG_COLLECTION_SCROLL_POSITION_KEY);
    } catch {
      // Direct album links keep using the explicit collection URL below.
    }
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (storedTarget !== null) {
      const hasCollectionHistory = shouldUseTCGCollectionHistoryBack(
        storedTarget,
        currentPath,
        Boolean(returnQuery) && !activation,
      );
      historyReturnTargetRef.current = hasCollectionHistory ? currentPath : null;
      historyReturnScrollPositionRef.current = hasCollectionHistory ? storedScrollPosition : null;
      if (hasCollectionHistory) rememberCollectionScrollRestore();
    } else if (historyReturnTargetRef.current !== currentPath) {
      historyReturnTargetRef.current = null;
      historyReturnScrollPositionRef.current = null;
    }
  }, [activation, language, rememberCollectionScrollRestore, returnQuery, set.id]);
  useEffect(() => { if (firstValueReached) trackProductEvent('tcg_first_value_reached'); }, [firstValueReached]);
  useEffect(() => { if (activationComplete && activationMethod) { trackProductEvent('tcg_activation_completed', activationMethod); markProductActivation(); } }, [activationComplete, activationMethod]);

  const sortedCards = useMemo(() => sortCardsByNumber(cards), [cards]);
  const completion = useMemo(() => getSetCompletion(cards, ownedIds), [cards, ownedIds]);
  const rarityCompletion = useMemo(() => getDisplayableCompletionByRarity(cards, ownedIds), [cards, ownedIds]);
  const missingCards = useMemo(() => getMissingCardsInSet(cards, ownedIds), [cards, ownedIds]);
  const backHref = activation
    ? `/tcg/start?tcgLang=${encodeURIComponent(selectedLanguage)}`
    : returnQuery
      ? `/tcg/collection?${returnQuery}`
      : `/tcg/collection?tcgLang=${encodeURIComponent(selectedLanguage)}`;

  const filteredCards = useMemo(() => {
    let result = sortedCards;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (rarityFilter) {
      result = result.filter((card) => isSameTcgRarity(card.rarity, rarityFilter));
    }
    if (showMissingOnly) {
      result = result.filter((c) => !ownedIds.has(c.id));
    }
    return result;
  }, [sortedCards, search, rarityFilter, showMissingOnly, ownedIds]);

  const openCard = useCallback((card: TCGCard) => {
    setSelectedCard(card);
    setIsDetailOpen(true);
  }, []);

  const openVariantSheet = useCallback((card: TCGCard) => {
    if (!resolvedCollectionKey) {
      openCard(card);
      return;
    }
    setManagedCard(card);
    setIsVariantSheetOpen(true);
  }, [openCard, resolvedCollectionKey]);

  const handleOwnershipChange = useCallback((nowOwned: boolean) => {
    if (!nowOwned) return;
    if (!firstValueReachedRef.current) {
      firstValueReachedRef.current = true;
      setFirstValueReached(true);
      return;
    }
    trackReturnAfterActivation('owned_add');
    setActivationMethod('second_owned_card');
    setActivationComplete(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={localeHref(backHref)}
          onNavigate={(event) => {
            const currentPath = `${window.location.pathname}${window.location.search}`;
            if (historyReturnTargetRef.current !== currentPath) return;
            event.preventDefault();
            rememberCollectionScrollRestore();
            router.back();
          }}
          aria-label={`${t('common.back')} — ${t('tcg.collection_title')}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border/30 text-foreground/40 transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {set.logo && (
            <div className="relative flex items-center justify-center h-10 w-10 shrink-0">
              <TCGImageWithFallback
                candidates={getTCGSetImageCandidates(set)}
                alt={set.name}
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-black uppercase tracking-tight sm:text-xl">
              {activation && !firstValueReached ? t('tcg.activation.album_title') : set.name}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/40">
              {activation && !firstValueReached ? t('tcg.activation.album_description') : <><span>{t('tcg.collection_owned')} — </span><span className="tabular-nums">{completion.owned}/{completion.total}</span></>}
            </p>
          </div>
        </div>
        {headerAction && <div className="ml-auto shrink-0">{headerAction}</div>}
      </div>

      {activation && (
        <div className="flex justify-end">
          <Link href={localeHref(`/tcg/start?tcgLang=${encodeURIComponent(selectedLanguage)}`)} className="inline-flex min-h-11 items-center rounded-sm border border-border/40 bg-card/45 px-4 text-sm font-bold text-foreground/70 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            {t('tcg.activation.change_set', { defaultValue: 'Change set' })}
          </Link>
        </div>
      )}

      {/* Progress */}
      <section aria-label={t('tcg.collection_overall_progress')} className="rounded-sm border border-primary/20 bg-primary/5 p-4">
        <TCGProgressBar owned={completion.owned} total={completion.total} size="lg" className="max-w-md" />
        {activation && firstValueReached && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-emerald-500/35 bg-emerald-500/10 p-3" role="status" aria-live="polite">
            <p className="text-sm font-bold text-emerald-300">{t('tcg.activation.first_card_added', { owned: completion.owned, total: completion.total })}</p>
            <button type="button" onClick={() => document.getElementById('album-card-grid')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })} className="min-h-11 rounded-sm border border-emerald-500/40 px-4 text-sm font-bold text-emerald-200 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
              {t('tcg.activation.continue_adding')}
            </button>
          </div>
        )}
      </section>

      {/* Rarity completion */}
      {rarityCompletion.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {rarityCompletion.map((r) => (
            <button
              key={r.rarity}
              type="button"
              onClick={() => setRarityFilter(rarityFilter === r.rarity ? null : r.rarity)}
              aria-pressed={rarityFilter === r.rarity}
              className="min-h-11 rounded-lg border border-border/20 bg-card/30 px-2.5 py-1.5 text-left transition-colors hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-foreground/40">
                {getTCGRarityLabel(r.rarity, t)}
              </span>
              <span className={getRarityColor(r.rarity)}>
                {r.owned}/{r.total}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30" />
          <label htmlFor={cardSearchId} className="sr-only">{t('tcg.collection_search_cards_placeholder', { defaultValue: 'Search cards' })}</label>
          <input
            id={cardSearchId}
            type="text"
            name="album-card-search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tcg.collection_search_cards_placeholder', { defaultValue: 'Search cards…' })}
            className="min-h-11 w-full rounded-sm border border-border/30 bg-card/40 pl-9 pr-4 text-sm font-semibold text-foreground placeholder:text-foreground/35 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        {missingCards.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMissingOnly((prev) => !prev)}
            aria-pressed={showMissingOnly}
            className={`min-h-11 shrink-0 rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.06em] transition-[border-color,background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
              showMissingOnly
                ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {t('tcg.collection_missing')} (<span className="tabular-nums">{missingCards.length}</span>)
          </button>
        )}
      </div>

      {/* Grid */}
      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border/30 bg-card/20 px-5 py-12 text-center" role="status">
          <p className="text-sm font-bold text-foreground/75">{t('tcg.collection_no_cards_match', { defaultValue: 'No cards match these filters.' })}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRarityFilter(null);
              setShowMissingOnly(false);
            }}
            className="min-h-11 rounded-sm border border-primary/40 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-primary transition-[background-color,color] duration-100 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t('tcg.collection_reset_filters', { defaultValue: 'Reset filters' })}
          </button>
        </div>
      ) : (
        <div id="album-card-grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredCards.map((card, index) => (
            <TCGAlbumCard
              key={card.id}
              card={card}
              priority={index === 0}
              owned={ownedIds.has(card.id)}
              onView={openCard}
              onManage={openVariantSheet}
              collectionKey={resolvedCollectionKey}
              language={selectedLanguage}
              ownerships={ownershipByCard.get(card.id) ?? []}
              onOwnershipChange={handleOwnershipChange}
            />
          ))}
        </div>
      )}

      {selectedCard && <TCGCardDetailModal card={selectedCard} tcgLanguage={selectedLanguage} collectionKey={resolvedCollectionKey} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onOwnershipChange={handleOwnershipChange} onWishlistAdded={() => { if (firstValueReached) { setActivationMethod('wishlist'); setActivationComplete(true); } }} />}
      {managedCard && resolvedCollectionKey && (
        <TCGCollectionVariantSheet
          card={managedCard}
          collectionKey={resolvedCollectionKey}
          language={selectedLanguage}
          open={isVariantSheetOpen}
          onOpenChange={(open) => {
            setIsVariantSheetOpen(open);
            if (!open) setManagedCard(null);
          }}
          onOwnershipChange={handleOwnershipChange}
        />
      )}
    </div>
  );
}
