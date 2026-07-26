'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, EyeOff, Layers, Loader2, ShieldAlert, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getAllSets, getTCGCard } from '@/lib/api/tcg';
import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import { getFriendCollectionPage, getFriendCollectionSummary, getFriendDecks, getFriendDirectoryEntry, getFriendRelations } from '@/lib/friends';
import type { FriendDeck, FriendDirectoryEntry } from '@/types/friends';
import type { TCGCard } from '@/types/tcg';
import { TCGCardImage } from '@/components/tcg/TCGCardImage';
import { TCGRarityBadge } from '@/components/tcg/TCGRarityBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 36;
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

interface FriendProfileClientProps {
  friendId: string;
}

export default function FriendProfileClient({ friendId }: FriendProfileClientProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const { user, enabled } = useAuth();
  const [tab, setTab] = useState<'collection' | 'decks'>('collection');

  const friendQuery = useQuery({
    queryKey: ['friends', 'directory', friendId],
    queryFn: () => getFriendDirectoryEntry(friendId),
    enabled: enabled && Boolean(user) && mounted,
  });
  const relationsQuery = useQuery({
    queryKey: ['friends', 'relations'],
    queryFn: () => getFriendRelations(user!.id),
    enabled: enabled && Boolean(user) && mounted,
    staleTime: 30 * 1000,
  });

  const isAcceptedFriend = relationsQuery.data?.some(
    (relation) => relation.status === 'accepted'
      && relation.otherUser?.userId === friendId,
  ) ?? false;
  const friend = friendQuery.data;

  if (!enabled || !user) {
    return <StatusPanel icon={ShieldAlert} title={t('friends.auth.required', { defaultValue: 'Sign in to view a friend.' })} />;
  }

  if (friendQuery.isLoading || relationsQuery.isLoading) {
    return <StatusPanel icon={Loader2} title={t('friends.loading', { defaultValue: 'Loading friend profile...' })} spinning />;
  }

  if (!friend || !isAcceptedFriend) {
    return <StatusPanel icon={ShieldAlert} title={t('friends.errors.not_friend', { defaultValue: 'This friend profile is not available.' })} />;
  }

  return (
    <div className="space-y-6">
      <Link href={localeHref('/friends')} className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-foreground/50 hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        {t('friends.back', { defaultValue: 'Back to friends' })}
      </Link>

      <FriendHero friend={friend} />

      <div className="glass-toolbar grid w-full grid-cols-2 gap-1 p-1 sm:w-fit sm:inline-grid">
        <button type="button" onClick={() => setTab('collection')} className={cn('min-h-11 rounded-sm px-4 text-xs font-black uppercase tracking-[0.1em]', tab === 'collection' ? 'bg-primary/15 text-primary' : 'text-foreground/45 hover:bg-muted/50')}>
          {t('friends.tabs.collection', { defaultValue: 'Collection' })}
        </button>
        <button type="button" onClick={() => setTab('decks')} className={cn('min-h-11 rounded-sm px-4 text-xs font-black uppercase tracking-[0.1em]', tab === 'decks' ? 'bg-primary/15 text-primary' : 'text-foreground/45 hover:bg-muted/50')}>
          {t('friends.tabs.decks', { defaultValue: 'Decks' })}
        </button>
      </div>

      {tab === 'collection' ? <FriendCollection friend={friend} friendId={friendId} /> : <FriendDecks friend={friend} friendId={friendId} />}
    </div>
  );
}

function FriendHero({ friend }: { friend: FriendDirectoryEntry }) {
  const { t } = useTranslation();
  return (
    <section className="page-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10">
        <Users className="h-7 w-7 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="page-eyebrow">{t('friends.eyebrow', { defaultValue: 'Friend profile' })}</p>
        <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">{friend.displayName}</h1>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/40">
          {friend.handle ? `@${friend.handle}` : t('friends.no_handle', { defaultValue: 'No public handle' })}
        </p>
      </div>
    </section>
  );
}

function FriendCollection({ friend, friendId }: { friend: FriendDirectoryEntry; friendId: string }) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const language = usePrimeDexStore((state) => state.language);
  const systemLanguage = usePrimeDexStore((state) => state.systemLanguage);
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  const summaryQuery = useQuery({
    queryKey: ['friends', 'collection-summary', friendId],
    queryFn: () => getFriendCollectionSummary(friendId),
    enabled: friend.shareTcgCollection && mounted,
  });
  const setsQuery = useQuery({
    queryKey: ['tcg', 'all-sets', resolvedLang],
    queryFn: () => getAllSets(resolvedLang),
    enabled: friend.shareTcgCollection && mounted,
    staleTime: 60 * 60 * 1000,
  });
  const cardsQuery = useInfiniteQuery({
    queryKey: ['friends', 'collection', friendId],
    queryFn: ({ pageParam }) => getFriendCollectionPage(friendId, pageParam, PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.cardIds.at(-1) : undefined,
    enabled: friend.shareTcgCollection && mounted,
  });

  const cardIds = useMemo(
    () => cardsQuery.data?.pages.flatMap((page) => page.cardIds) ?? [],
    [cardsQuery.data?.pages],
  );
  const cardQueries = useQueries({
    queries: cardIds.map((cardId) => ({
      queryKey: ['tcg-card-detail', cardId, resolvedLang],
      queryFn: () => getTCGCard(cardId, resolvedLang),
      enabled: mounted,
      staleTime: 60 * 60 * 1000,
    })),
  });
  const loadedCards = cardQueries.map((query) => query.data).filter((card): card is TCGCard => Boolean(card));
  const rarityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    loadedCards.forEach((card) => {
      const rarity = card.rarity ?? t('tcg.none', { defaultValue: 'Unknown' });
      const key = getCanonicalTcgRarity(rarity) || rarity;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [loadedCards, t]);

  if (!friend.shareTcgCollection) {
    return <HiddenPanel title={t('friends.visibility.collection_private', { defaultValue: 'This friend is not sharing their collection.' })} />;
  }

  const totalOwned = summaryQuery.data?.totalOwned ?? cardsQuery.data?.pages[0]?.totalOwned ?? 0;
  const totalCards = setsQuery.data?.reduce((sum, set) => sum + (set.totalCards ?? set.cardCount?.total ?? 0), 0) ?? 0;
  const completion = totalCards > 0 ? Math.round((totalOwned / totalCards) * 100) : 0;
  const isRarityPartial = Boolean(cardsQuery.hasNextPage || cardsQuery.isFetchingNextPage);

  return (
    <div className="space-y-6">
      <section className="rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 p-5 shadow-[var(--shadow-pixel)]">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={t('friends.stats.owned', { defaultValue: 'Cards owned' })} value={String(totalOwned)} />
          <Stat label={t('friends.stats.completion', { defaultValue: 'Collection completion' })} value={`${completion}%`} />
          <Stat label={t('friends.stats.loaded', { defaultValue: 'Cards loaded' })} value={`${loadedCards.length}/${totalOwned}`} />
        </div>
      </section>

      <section className="page-surface space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-foreground/65">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('friends.stats.rarity', { defaultValue: 'Rarity overview' })}
          </h2>
          {isRarityPartial && <span className="text-[11px] font-bold text-foreground/40">{t('friends.stats.analysis_progress', { defaultValue: 'Analysis in progress' })}</span>}
        </div>
        {rarityCounts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {rarityCounts.map(([rarity, count]) => <span key={rarity} className="rounded-sm border border-border/30 bg-card/40 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{rarity}: {count}</span>)}
          </div>
        ) : <p className="text-xs text-foreground/40">{t('friends.stats.rarity_loading', { defaultValue: 'Rarity data will appear as cards load.' })}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-foreground/65">
          <Layers className="h-4 w-4 text-primary" />
          {t('friends.collection.cards', { defaultValue: 'Owned cards' })}
        </h2>
        {cardsQuery.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/50" /></div> : cardIds.length === 0 ? <HiddenPanel title={t('friends.collection.empty', { defaultValue: 'This collection is empty.' })} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{loadedCards.map((card) => <ReadOnlyCard key={card.id} card={card} />)}</div>}
        {cardsQuery.hasNextPage && <div className="flex justify-center"><Button variant="outline" onClick={() => void cardsQuery.fetchNextPage()} disabled={cardsQuery.isFetchingNextPage}>{cardsQuery.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t('friends.collection.load_more', { defaultValue: 'Load more cards' })}</Button></div>}
      </section>
    </div>
  );
}

function FriendDecks({ friend, friendId }: { friend: FriendDirectoryEntry; friendId: string }) {
  const { t } = useTranslation();
  const decksQuery = useQuery({
    queryKey: ['friends', 'decks', friendId],
    queryFn: () => getFriendDecks(friendId),
    enabled: friend.shareTcgDecks,
  });
  const decks = decksQuery.data?.decks ?? [];
  const deckCardIds = Array.from(new Set(decks.flatMap((deck) => deck.cards.map((card) => card.cardId))));
  const cardQueries = useQueries({
    queries: deckCardIds.map((cardId) => ({
      queryKey: ['tcg-card-detail', cardId, 'en'],
      queryFn: () => getTCGCard(cardId, 'en'),
      staleTime: 60 * 60 * 1000,
    })),
  });
  const cardNames = new Map(deckCardIds.map((cardId, index) => [cardId, cardQueries[index]?.data?.name ?? cardId]));

  if (!friend.shareTcgDecks) return <HiddenPanel title={t('friends.visibility.decks_private', { defaultValue: 'This friend is not sharing their decks.' })} />;
  if (decksQuery.isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/50" /></div>;
  if (decks.length === 0) return <HiddenPanel title={t('friends.decks.empty', { defaultValue: 'This friend has no saved decks.' })} />;

  return <div className="grid gap-4 lg:grid-cols-2">{decks.map((deck) => <DeckCard key={deck.id} deck={deck} cardNames={cardNames} />)}</div>;
}

function DeckCard({ deck, cardNames }: { deck: FriendDeck; cardNames: Map<string, string> }) {
  const { t } = useTranslation();
  const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  return (
    <section className="page-surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-base font-black text-foreground/85">{deck.name}</h2>
        <span className="shrink-0 rounded-sm border border-border/30 bg-card/40 px-2 py-1 text-[11px] font-black text-foreground/55">{total}/60</span>
      </div>
      <div className="space-y-1.5">
        {deck.cards.map((card) => <div key={card.cardId} className="flex items-center justify-between gap-3 rounded-sm border border-border/25 bg-background/30 px-3 py-2 text-xs"><span className="truncate font-bold text-foreground/70">{cardNames.get(card.cardId) ?? card.cardId}</span><span className="font-black text-primary">×{card.quantity}</span></div>)}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/35">{t('friends.decks.read_only', { defaultValue: 'Read only' })}</p>
    </section>
  );
}

function ReadOnlyCard({ card }: { card: TCGCard }) {
  return (
    <article className="group relative aspect-[2.15/3] overflow-hidden rounded-sm border border-border/20 bg-card/30 shadow-[var(--shadow-pixel-sm)]">
      <TCGCardImage card={card} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 45vw" className="object-contain p-1 transition-transform group-hover:scale-105" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
        <p className="truncate text-[11px] font-black uppercase text-white">{card.name}</p>
        <p className="truncate text-[11px] text-white/60">#{card.localId}</p>
      </div>
      <div className="absolute right-1 top-1"><TCGRarityBadge rarity={card.rarity} /></div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/55">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function HiddenPanel({ title }: { title: string }) {
  return <div className="page-surface flex flex-col items-center gap-3 p-12 text-center"><EyeOff className="h-8 w-8 text-foreground/20" /><p className="text-sm font-bold text-foreground/50">{title}</p></div>;
}

function StatusPanel({ icon: Icon, title, spinning = false }: { icon: LucideIcon; title: string; spinning?: boolean }) {
  return <div className="page-surface flex flex-col items-center gap-3 p-12 text-center"><Icon className={cn('h-8 w-8 text-primary/50', spinning && 'animate-spin')} /><p className="text-sm font-bold text-foreground/55">{title}</p></div>;
}
