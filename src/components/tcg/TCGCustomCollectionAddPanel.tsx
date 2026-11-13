'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Check, Filter, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getTCGCard, isTcgLangSupported, matchesTCGCardSearchFilters, searchCards } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import type { TCGCard, TCGCardFilters } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { TCGLanguageSelector } from './TCGLanguageSelector';
import { TCGFilters } from './TCGFilters';
import { TCGImageWithFallback } from './TCGImageWithFallback';

const PAGE_SIZE = 48;

interface TCGCustomCollectionAddPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  collectionId: string;
  initialLanguage: TCGCardLanguage;
}

interface PendingCard {
  card: TCGCard;
  language: TCGCardLanguage;
  quantity: string;
}

function membershipKey(cardId: string, language: TCGCardLanguage): string {
  return `${language}:${cardId.toLocaleLowerCase()}`;
}

export function TCGCustomCollectionAddPanel({ open, onOpenChange, returnFocusRef, collectionId, initialLanguage }: TCGCustomCollectionAddPanelProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const addCards = usePrimeDexStore((state) => state.addTCGCustomCollectionCards);
  const memberships = usePrimeDexStore((state) => state.tcgCustomCollectionCards);
  const [language, setLanguage] = useState(initialLanguage);
  const [filters, setFilters] = useState<TCGCardFilters>(DEFAULT_TCG_CARD_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selection, setSelection] = useState<Map<string, PendingCard>>(() => new Map());
  const [addError, setAddError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const query = filters.searchTerm?.trim() ?? '';
  const languageSupported = isTcgLangSupported(language);
  const selectedCards = useMemo(() => [...selection.entries()], [selection]);
  const selectionIsValid = selectedCards.every(([, item]) => {
    const quantity = Number(item.quantity);
    return item.quantity.trim() !== '' && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 9_999;
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => ({ ...current, searchTerm: searchDraft.trim() || undefined }));
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  const ownedIds = useMemo(() => new Set(memberships
    .filter((entry) => entry.collectionId === collectionId && entry.language === language && (entry.quantity ?? 1) > 0)
    .map((entry) => entry.cardId)), [memberships, collectionId, language]);
  const wantedIds = useMemo(() => new Set(memberships
    .filter((entry) => entry.collectionId === collectionId && entry.language === language && entry.quantity === 0)
    .map((entry) => entry.cardId)), [memberships, collectionId, language]);
  const catalogQuery = useInfiniteQuery({
    queryKey: [...tcgKeys.catalog(filters, language, PAGE_SIZE), 'binder-localized', collectionId, [...ownedIds], [...wantedIds]],
    queryFn: ({ pageParam, signal }) => searchCards(filters, language, pageParam, PAGE_SIZE, signal, ownedIds, wantedIds, false, { allowEnglishFallback: false }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length + 1 : undefined,
    enabled: mounted && open && languageSupported && query.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const cardIdCandidate = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i.test(query) ? query : '';
  const exactCardQuery = useQuery({
    queryKey: [...tcgKeys.card(cardIdCandidate, language), 'binder-localized'],
    queryFn: async ({ signal }) => {
      try {
        return cardIdCandidate ? await getTCGCard(cardIdCandidate, language, signal, { allowEnglishFallback: false }) : null;
      } catch {
        return null;
      }
    },
    enabled: mounted && open && languageSupported && Boolean(cardIdCandidate),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const cards = useMemo(() => {
    const byId = new Map<string, TCGCard>();
    if (exactCardQuery.data && matchesTCGCardSearchFilters(exactCardQuery.data, filters, { ownedIds, wishlistIds: wantedIds })) byId.set(exactCardQuery.data.id, exactCardQuery.data);
    for (const card of catalogQuery.data?.pages.flatMap((page) => page.cards) ?? []) byId.set(card.id, card);
    return [...byId.values()];
  }, [catalogQuery.data, exactCardQuery.data, filters, ownedIds, wantedIds]);

  const addSelection = () => {
    if (!selectionIsValid || selection.size === 0) return;
    setAddError('');
    const count = addCards(collectionId, selectedCards.map(([, item]) => ({
      cardId: item.card.id,
      language: item.language,
      cardName: item.card.name,
      quantity: Number(item.quantity),
    })));
    if (count === 0) {
      setAddError(t('tcg.custom_collections.add_error'));
      return;
    }
    setSelection(new Map());
    setLiveMessage(t('tcg.custom_collections.selection_saved', { count }));
  };

  const toggleSelection = (card: TCGCard) => {
    const key = membershipKey(card.id, language);
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else next.set(key, { card, language, quantity: '1' });
      return next;
    });
    setLiveMessage('');
    setAddError('');
  };

  const updateQuantity = (key: string, quantity: string) => {
    setSelection((current) => {
      const selected = current.get(key);
      if (!selected) return current;
      const next = new Map(current);
      next.set(key, { ...selected, quantity });
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        finalFocus={() => returnFocusRef.current}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl gap-0 overflow-hidden p-0 sm:w-[88vw]"
        aria-label={t('tcg.custom_collections.add_cards')}
      >
        <SheetHeader className="shrink-0 border-b border-border/60 pb-3 pr-14">
          <SheetTitle className="text-lg font-black">{t('tcg.custom_collections.add_cards')}</SheetTitle>
        </SheetHeader>

        <div className="shrink-0 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TCGLanguageSelector
              value={language}
              onChange={(next) => {
                setLanguage(next);
                setFilters((current) => ({ ...DEFAULT_TCG_CARD_FILTERS, searchTerm: current.searchTerm }));
                setAddError('');
              }}
              ariaLabel={t('tcg.card_language')}
            />
            <button
              type="button"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((current) => !current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border/60 px-3 text-xs font-black text-foreground/70 hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              {t('tcg.catalog_filters')}
            </button>
          </div>
          <label className="relative mt-3 block" htmlFor="custom-binder-add-search">
            <span className="sr-only">{t('tcg.custom_collections.search_cards')}</span>
            <Input
              id="custom-binder-add-search"
              type="search"
              autoFocus
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={t('tcg.custom_collections.search_cards_placeholder')}
              className="min-h-12 pr-3"
            />
          </label>
        </div>

        {advancedOpen && (
          <div className="max-h-[30dvh] shrink-0 overflow-y-auto border-b border-border/60 px-4 py-3 sm:px-6">
            <TCGFilters
              key={language}
              filters={filters}
              onChange={setFilters}
              mode="advanced"
              autoApplyInitialSet={false}
              language={language}
              showSearchInput={false}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="mb-3 flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground">
            <span aria-live="polite">
              {query ? (catalogQuery.isPending ? t('tcg.custom_collections.loading') : t('tcg.custom_collections.cards_count', { count: catalogQuery.data?.pages.reduce((total, page) => total + page.cards.length, 0) ?? 0 })) : t('tcg.custom_collections.search_cards_placeholder')}
            </span>
            {catalogQuery.isFetchingNextPage && <span role="status">{t('tcg.custom_collections.loading')}</span>}
          </div>

          {addError && <p role="alert" className="mb-3 rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{addError}</p>}
          {liveMessage && <p role="status" className="mb-3 rounded-sm border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{liveMessage}</p>}

          {!languageSupported ? (
            <p role="status" className="rounded-sm border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">{t('tcg.custom_collections.language_unavailable')}</p>
          ) : !query ? (
            <p className="rounded-sm border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">{t('tcg.custom_collections.search_cards_placeholder')}</p>
          ) : catalogQuery.isError ? (
            <div role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-5 text-sm">
              <p>{t('tcg.custom_collections.search_error')}</p>
              <button type="button" onClick={() => void catalogQuery.refetch()} className="mt-3 inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-4 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('tcg.custom_collections.retry')}
              </button>
            </div>
          ) : (catalogQuery.isPending || (cardIdCandidate && exactCardQuery.isFetching)) && cards.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" role="status">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-sm bg-muted/40" />)}
            </div>
          ) : cards.length === 0 ? (
            <p className="rounded-sm border border-border/50 bg-card/40 p-6 text-center text-sm text-muted-foreground" role="status">{t('tcg.custom_collections.no_results')}</p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t('tcg.custom_collections.search_cards')}>
                {cards.map((card) => {
                  const key = membershipKey(card.id, language);
                  const alreadyAdded = memberships.some((entry) => entry.collectionId === collectionId && membershipKey(entry.cardId, entry.language) === key);
                  const selected = selection.has(key);
                  return (
                    <li key={key} className={`flex min-w-0 flex-col rounded-sm border bg-card/50 p-2 transition-colors ${selected ? 'border-primary/70 ring-1 ring-primary/30' : 'border-border/50'}`}>
                      <Link href={`${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}?tcgLang=${encodeURIComponent(language)}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-sm bg-muted/30">
                          <TCGImageWithFallback candidates={getTCGCardImageCandidates(card, 'high', { allowLanguageFallback: false })} alt={card.name} fill sizes="(min-width: 640px) 180px, 45vw" className="object-contain" />
                        </div>
                        <span className="mt-2 block min-h-10 line-clamp-2 break-words text-xs font-black group-hover:text-primary">{card.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{card.id}</span>
                      </Link>
                      <span className="my-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{language}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelection(card)}
                        disabled={alreadyAdded}
                        aria-pressed={selected}
                        className="mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-primary/40 px-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:cursor-default disabled:border-border/50 disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {alreadyAdded ? t('tcg.custom_collections.already_in_collection') : selected ? <><Check className="h-3.5 w-3.5" aria-hidden="true" />{t('tcg.custom_collections.selected')}</> : <><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('tcg.custom_collections.select_card')}</>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {catalogQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => void catalogQuery.fetchNextPage()}
                  disabled={catalogQuery.isFetchingNextPage}
                  className="mx-auto mt-4 inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-5 font-bold text-primary hover:bg-primary/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {catalogQuery.isFetchingNextPage ? t('tcg.custom_collections.loading') : t('tcg.custom_collections.load_more')}
                </button>
              )}
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-border/60 bg-card/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6">
          {selectedCards.length > 0 && (
            <div className="mb-3 max-h-[18dvh] space-y-2 overflow-y-auto" aria-label={t('tcg.custom_collections.cards_count', { count: selectedCards.length })}>
              {selectedCards.map(([key, item]) => (
                <div key={key} className="flex min-w-0 items-center gap-2 rounded-sm border border-border/40 bg-background/60 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{item.card.name} <span className="text-[10px] font-normal uppercase text-muted-foreground">{item.language}</span></span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={9_999}
                    step={1}
                    value={item.quantity}
                    aria-label={`${t('tcg.custom_collections.quantity')}: ${item.card.name} (${item.language})`}
                    onChange={(event) => updateQuantity(key, event.target.value)}
                    className="h-10 w-16 px-2 text-center tabular-nums"
                  />
                  <button type="button" onClick={() => toggleSelection(item.card)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive" aria-label={`${t('tcg.custom_collections.remove')}: ${item.card.name}`}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-foreground/65" aria-live="polite">
              {t('tcg.custom_collections.cards_count', { count: selectedCards.length })}
            </span>
            <button
              type="button"
              onClick={addSelection}
              disabled={selectedCards.length === 0 || !selectionIsValid}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('tcg.custom_collections.add')} ({t('tcg.custom_collections.cards_count', { count: selectedCards.length })})
            </button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
