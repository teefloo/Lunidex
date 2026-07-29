'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
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
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { markProductActivation, trackProductEvent, trackReturnAfterActivation } from '@/lib/product-measurement';
import AuthModal from '@/components/auth/AuthModal';

interface TCGAlbumPageProps {
  set: TCGSet;
  cards: TCGCard[];
  activation?: boolean;
}

export function TCGAlbumPage({ set, cards, activation = false }: TCGAlbumPageProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const mounted = useMounted();
  const ownedList = usePrimeDexStore((s) => s.tcgOwnedCards);
  const ownedIds = useMemo(() => new Set(ownedList), [ownedList]);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [firstValueReached, setFirstValueReached] = useState(false);
  const [activationComplete, setActivationComplete] = useState(false);
  const [activationMethod, setActivationMethod] = useState<'second_owned_card' | 'wishlist' | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSyncPromptDismissed, setIsSyncPromptDismissed] = useState(false);
  const { enabled: syncEnabled, user } = useAuth();

  useEffect(() => { if (activation) trackProductEvent('tcg_album_opened', 'activation'); else trackReturnAfterActivation('album_open'); }, [activation]);
  useEffect(() => { if (firstValueReached) trackProductEvent('tcg_first_value_reached'); }, [firstValueReached]);
  useEffect(() => { if (activationComplete && activationMethod) { trackProductEvent('tcg_activation_completed', activationMethod); markProductActivation(); } }, [activationComplete, activationMethod]);
  useEffect(() => { if (activation && activationComplete && syncEnabled && !user && !isSyncPromptDismissed) trackProductEvent('tcg_sync_prompt_shown'); }, [activation, activationComplete, syncEnabled, user, isSyncPromptDismissed]);

  const sortedCards = useMemo(() => sortCardsByNumber(cards), [cards]);
  const completion = useMemo(() => getSetCompletion(cards, ownedIds), [cards, ownedIds]);
  const rarityCompletion = useMemo(() => getCompletionByRarity(cards, ownedIds), [cards, ownedIds]);
  const missingCards = useMemo(() => getMissingCardsInSet(cards, ownedIds), [cards, ownedIds]);
  const backHref = activation ? '/tcg/start' : '/tcg/collection';

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

  const openCard = (card: TCGCard) => {
    setSelectedCard(card);
    setIsDetailOpen(true);
  };

  const handleOwnershipChange = (nowOwned: boolean) => {
    if (!nowOwned) return;
    if (!firstValueReached) {
      setFirstValueReached(true);
      return;
    }
    trackReturnAfterActivation('owned_add');
    setActivationMethod('second_owned_card');
    setActivationComplete(true);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={localeHref(backHref)}
          aria-label="Back to TCG collection"
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-border/30 text-foreground/40 transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          {set.logo && (
            <div className="relative flex items-center justify-center h-10 w-10 shrink-0">
              <Image src={set.logo} alt={set.name} width={40} height={40} unoptimized className="max-h-full max-w-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight sm:text-xl">
              {activation && !firstValueReached ? t('tcg.activation.album_title') : set.name}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/40">
              {activation && !firstValueReached ? t('tcg.activation.album_description') : `${t('tcg.collection_owned')} — ${completion.owned}/${completion.total}`}
            </p>
          </div>
        </div>
      </div>

      {activation && (
        <div className="flex justify-end">
          <Link href={localeHref('/tcg/start')} className="inline-flex min-h-11 items-center rounded-sm border border-border/40 bg-card/45 px-4 text-sm font-bold text-foreground/70 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
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
            <button type="button" onClick={() => document.getElementById('album-card-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="min-h-11 rounded-sm border border-emerald-500/40 px-4 text-sm font-bold text-emerald-200 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
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
              className="rounded-lg border border-border/20 bg-card/30 px-2.5 py-1.5 text-left transition-colors hover:bg-card/50"
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-foreground/40">
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
            className={`shrink-0 rounded-sm border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.06em] transition-colors ${
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
      <div id="album-card-grid" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filteredCards.map((card) => (
          <TCGAlbumCard
            key={card.id}
            card={card}
            owned={ownedIds.has(card.id)}
            onView={() => openCard(card)}
            onOwnershipChange={handleOwnershipChange}
          />
        ))}
      </div>

      {activation && activationComplete && syncEnabled && !user && !isSyncPromptDismissed && (
        <aside className="rounded-sm border border-primary/30 bg-card/55 p-5" aria-label={t('tcg.activation.sync_title')}>
          <h2 className="text-base font-bold">{t('tcg.activation.sync_title')}</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/65">{t('tcg.activation.sync_description')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => { trackProductEvent('tcg_sync_prompt_actioned', 'create_account'); setIsAuthOpen(true); }} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {t('tcg.activation.create_account')}
            </button>
            <button type="button" onClick={() => { trackProductEvent('tcg_sync_prompt_actioned', 'continue_local'); setIsSyncPromptDismissed(true); }} className="inline-flex min-h-11 items-center rounded-sm border border-border/40 bg-card/45 px-4 text-sm font-bold text-foreground/65 hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {t('tcg.activation.continue_without_account', { defaultValue: 'Continue without an account' })}
            </button>
          </div>
        </aside>
      )}

      {selectedCard && <TCGCardDetailModal card={selectedCard} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onWishlistAdded={() => { if (firstValueReached) { setActivationMethod('wishlist'); setActivationComplete(true); } }} />}
      <AuthModal open={isAuthOpen} onOpenChange={setIsAuthOpen} />
    </div>
  );
}
