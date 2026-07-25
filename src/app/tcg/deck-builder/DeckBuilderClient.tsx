'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import Image from 'next/image';
import { Plus, Minus, Trash2, LayoutGrid, Search, Loader2, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { searchCards, DEFAULT_TCG_CARD_FILTERS, getTCGCard } from '@/lib/api/tcg';
import { getCardMarketValue } from '@/lib/tcg-collection';
import { cn } from '@/lib/utils';

const MAX_DECK_SIZE = 60;

export default function DeckBuilderClient() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const decks = usePrimeDexStore((s) => s.tcgDecks);
  const createDeck = usePrimeDexStore((s) => s.createTCGDeck);
  const deleteDeck = usePrimeDexStore((s) => s.deleteTCGDeck);
  const renameDeck = usePrimeDexStore((s) => s.renameTCGDeck);
  const addCard = usePrimeDexStore((s) => s.addCardToTCGDeck);
  const removeCard = usePrimeDexStore((s) => s.removeCardFromTCGDeck);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDeckName, setNewDeckName] = useState('');

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? null;

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['deck-builder-search', searchTerm],
    queryFn: async ({ signal }) => searchCards(
      { ...DEFAULT_TCG_CARD_FILTERS, searchTerm },
      'en',
      1,
      24,
      signal,
    ),
    enabled: mounted && searchTerm.trim().length > 1,
    staleTime: 5 * 60 * 1000,
  });

  const deckCardIds = useMemo(() => selectedDeck?.cards.map((c) => c.cardId) ?? [], [selectedDeck]);

  const deckCardQueries = useQueries({
    queries: deckCardIds.map((cardId) => ({
      queryKey: ['tcg-card-detail', cardId],
      queryFn: ({ signal }: { signal: AbortSignal }) => getTCGCard(cardId, 'en', signal),
      staleTime: 60 * 60 * 1000,
      enabled: mounted,
    })),
  });

  const deckCardsWithData = useMemo(() => {
    if (!selectedDeck) return [];
    return selectedDeck.cards.map((entry, index) => ({
      ...entry,
      card: deckCardQueries[index]?.data ?? null,
    }));
  }, [selectedDeck, deckCardQueries]);

  const totalCount = selectedDeck?.cards.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const totalValue = deckCardsWithData.reduce((sum, entry) => {
    if (!entry.card) return sum;
    const value = getCardMarketValue(entry.card);
    return value ? sum + value.amount * entry.quantity : sum;
  }, 0);
  const currency = deckCardsWithData.find((e) => e.card && getCardMarketValue(e.card))?.card
    ? getCardMarketValue(deckCardsWithData.find((e) => e.card && getCardMarketValue(e.card))!.card!)?.currency
    : 'EUR';

  const handleCreateDeck = () => {
    const name = newDeckName.trim() || t('tcg.deck_builder.default_deck_name', { defaultValue: 'New Deck' });
    const id = createDeck(name);
    setSelectedDeckId(id);
    setNewDeckName('');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main className="page-shell pb-20 pt-8">
        <PageHeader
          title={t('tcg.deck_builder.title', { defaultValue: 'Deck Builder' })}
          subtitle={t('tcg.deck_builder.subtitle', { defaultValue: 'Build a 60-card Pokémon TCG deck (max 4 copies per card, except basic Energy)' })}
          eyebrow={t('tcg.nav_catalog', { defaultValue: 'TCG' })}
          icon={LayoutGrid}
        />

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="page-surface p-4 space-y-4 xl:sticky xl:top-24 xl:h-fit">
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
              {t('tcg.deck_builder.my_decks', { defaultValue: 'My Decks' })}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder={t('tcg.deck_builder.new_deck_placeholder', { defaultValue: 'Deck name...' })}
                className="h-9 flex-1 min-w-0 rounded-sm border border-border/70 bg-muted/40 px-3 text-xs text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
              />
              <Button size="sm" onClick={handleCreateDeck}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {decks.length === 0 ? (
                <p className="text-xs text-foreground/40">{t('tcg.deck_builder.no_decks', { defaultValue: 'No decks yet.' })}</p>
              ) : (
                decks.map((deck) => (
                  <div
                    key={deck.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-sm border px-3 py-2 cursor-pointer transition-colors',
                      selectedDeckId === deck.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/60 bg-card/40 hover:border-border/90',
                    )}
                    onClick={() => setSelectedDeckId(deck.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground/85">{deck.name}</p>
                      <p className="text-[11px] text-foreground/40">
                        {deck.cards.reduce((sum, c) => sum + c.quantity, 0)}/{MAX_DECK_SIZE}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDeck(deck.id);
                        if (selectedDeckId === deck.id) setSelectedDeckId(null);
                      }}
                      className="shrink-0 text-foreground/30 hover:text-destructive transition-colors"
                      aria-label={t('common.delete', { defaultValue: 'Delete' })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {!selectedDeck ? (
              <div className="page-surface flex flex-col items-center justify-center gap-3 p-12 text-center">
                <LayoutGrid className="h-8 w-8 text-foreground/20" />
                <p className="text-sm text-foreground/50">
                  {t('tcg.deck_builder.select_deck_hint', { defaultValue: 'Create or select a deck to start building.' })}
                </p>
              </div>
            ) : (
              <>
                <div className="page-surface p-4 flex flex-wrap items-center justify-between gap-3">
                  <input
                    value={selectedDeck.name}
                    onChange={(e) => renameDeck(selectedDeck.id, e.target.value)}
                    className="bg-transparent text-lg font-black text-foreground/90 focus:outline-none border-b border-transparent focus:border-primary/40"
                  />
                  <div className="flex items-center gap-3">
                    <Badge variant={totalCount === MAX_DECK_SIZE ? 'default' : 'outline'}>
                      {totalCount}/{MAX_DECK_SIZE}
                    </Badge>
                    {totalValue > 0 && (
                      <Badge variant="outline">
                        ~{totalValue.toFixed(2)} {currency}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="page-surface p-4">
                  <div className="relative mb-4">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
                      <Search className="h-4 w-4 text-foreground/30" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('tcg.deck_builder.search_placeholder', { defaultValue: 'Search cards to add...' })}
                      className="h-10 w-full rounded-sm border border-border/70 bg-muted/40 pl-9 pr-9 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {isFetching ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                    </div>
                  ) : searchResults && searchResults.cards.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {searchResults.cards.map((card) => {
                        const isEnergyBasic = card.category === 'Energy' && card.energyType !== 'Special';
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => addCard(selectedDeck.id, card.id, isEnergyBasic)}
                            disabled={totalCount >= MAX_DECK_SIZE}
                            className="group relative rounded-sm border border-border/60 bg-card/40 p-1.5 text-left transition-all hover:border-primary/40 disabled:opacity-40"
                          >
                            {(card.image || card.imageUrl) && (
                              <Image
                                src={`${card.image || card.imageUrl}/low.webp`}
                                alt={card.name}
                                width={120}
                                height={168}
                                className="w-full rounded-sm object-contain"
                                unoptimized
                              />
                            )}
                            <p className="mt-1 truncate text-[11px] font-bold text-foreground/70 group-hover:text-primary">
                              {card.name}
                            </p>
                            <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                              <Plus className="h-3 w-3" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : searchTerm.trim().length > 1 ? (
                    <p className="py-8 text-center text-sm text-foreground/40">
                      {t('tcg.deck_builder.no_search_results', { defaultValue: 'No cards found.' })}
                    </p>
                  ) : null}
                </div>

                <div className="page-surface p-4">
                  <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
                    {t('tcg.deck_builder.deck_list', { defaultValue: 'Deck List' })}
                  </h3>
                  {deckCardsWithData.length === 0 ? (
                    <p className="text-sm text-foreground/40">
                      {t('tcg.deck_builder.empty_deck', { defaultValue: 'No cards added yet. Search above to add cards.' })}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {deckCardsWithData.map((entry) => (
                        <div
                          key={entry.cardId}
                          className="flex items-center justify-between gap-3 rounded-sm border border-border/60 bg-background/40 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground/85">
                              {entry.card?.name ?? entry.cardId}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => removeCard(selectedDeck.id, entry.cardId)}
                              className="text-foreground/40 hover:text-destructive"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black">{entry.quantity}</span>
                            <button
                              type="button"
                              onClick={() => addCard(selectedDeck.id, entry.cardId, entry.card?.category === 'Energy' && entry.card?.energyType !== 'Special')}
                              disabled={totalCount >= MAX_DECK_SIZE || (entry.card?.category !== 'Energy' && entry.quantity >= 4)}
                              className="text-foreground/40 hover:text-primary disabled:opacity-30"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
