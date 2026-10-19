'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getTCGCard, searchCards } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import type { TCGCard } from '@/types/tcg';
import type { TCGCardFilters } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { TCGFilters } from './TCGFilters';
import { TCGImageWithFallback } from './TCGImageWithFallback';

const PAGE_SIZE = 48;

interface TCGCustomCollectionAddPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  language: TCGCardLanguage;
}

export function TCGCustomCollectionAddPanel({ open, onOpenChange, collectionId, language }: TCGCustomCollectionAddPanelProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const addCard = usePrimeDexStore((state) => state.addTCGCustomCollectionCard);
  const memberships = usePrimeDexStore((state) => state.tcgCustomCollectionCards);
  const ownedCardIds = usePrimeDexStore((state) => state.tcgOwnedCards);
  const [filters, setFilters] = useState<TCGCardFilters>(DEFAULT_TCG_CARD_FILTERS);
  const [addError, setAddError] = useState('');
  const query = filters.searchTerm?.trim() ?? '';
  const catalogQuery = useInfiniteQuery({
    queryKey: tcgKeys.catalog(filters, language, PAGE_SIZE),
    queryFn: ({ pageParam, signal }) => searchCards(filters, language, pageParam, PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.length + 1 : undefined,
    enabled: mounted && open && query.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const cardIdCandidate = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i.test(query) ? query : '';
  const exactCardQuery = useQuery({
    queryKey: tcgKeys.card(cardIdCandidate, language),
    queryFn: async ({ signal }) => {
      try {
        return cardIdCandidate ? await getTCGCard(cardIdCandidate, language, signal, { allowEnglishFallback: false }) : null;
      } catch {
        return null;
      }
    },
    enabled: mounted && open && Boolean(cardIdCandidate),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const cards = useMemo(() => {
    const byId = new Map<string, TCGCard>();
    if (exactCardQuery.data) byId.set(exactCardQuery.data.id, exactCardQuery.data);
    for (const card of catalogQuery.data?.pages.flatMap((page) => page.cards) ?? []) byId.set(card.id, card);
    return [...byId.values()];
  }, [catalogQuery.data, exactCardQuery.data]);

  const add = (card: TCGCard) => {
    setAddError('');
    const added = addCard(collectionId, { cardId: card.id, language, cardName: card.name });
    if (!added && !memberships.some((entry) => entry.collectionId === collectionId && entry.cardId === card.id && entry.language === language)) {
      setAddError(t('tcg.custom_collections.add_error'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl gap-0 p-0 sm:w-[88vw]" aria-label={t('tcg.custom_collections.add_cards')}>
        <SheetHeader className="border-b border-border/60 pr-14">
          <SheetTitle className="text-lg font-black">{t('tcg.custom_collections.add_cards')}</SheetTitle>
          <p className="text-sm leading-6 text-muted-foreground">{t('tcg.custom_collections.description')}</p>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <TCGFilters filters={filters} onChange={setFilters} mode="advanced" autoApplyInitialSet={false} language={language} />
          {addError && <p role="alert" className="text-sm font-semibold text-destructive">{addError}</p>}

          {!query ? (
            <p className="rounded-sm border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              {t('tcg.custom_collections.search_cards_placeholder')}
            </p>
          ) : catalogQuery.isError ? (
            <div role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-5 text-sm">
              <p>{t('tcg.custom_collections.search_error')}</p>
              <button type="button" onClick={() => void catalogQuery.refetch()} className="mt-3 min-h-11 rounded-sm border border-primary/40 px-4 font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('tcg.custom_collections.retry')}
              </button>
            </div>
          ) : (catalogQuery.isPending || (cardIdCandidate && exactCardQuery.isFetching)) && cards.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" role="status">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-sm bg-muted/40" />)}
            </div>
          ) : cards.length === 0 ? (
            <p className="rounded-sm border border-border/50 bg-card/40 p-6 text-center text-sm text-muted-foreground" role="status">
              {t('tcg.custom_collections.no_results')}
            </p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t('tcg.custom_collections.search_cards')}>
                {cards.map((card) => {
                  const alreadyAdded = memberships.some((entry) => entry.collectionId === collectionId && entry.cardId === card.id && entry.language === language);
                  const owned = ownedCardIds.includes(card.id);
                  return (
                    <li key={card.id} className="flex min-w-0 flex-col rounded-sm border border-border/50 bg-card/50 p-2">
                      <Link href={`${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}?tcgLang=${encodeURIComponent(language)}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-sm bg-muted/30">
                          {/* TCGdex cards can be absent while their compact references remain searchable. */}
                          <TCGImageWithFallback candidates={getTCGCardImageCandidates(card)} alt={card.name} fill sizes="(min-width: 640px) 180px, 45vw" className="object-contain" />
                        </div>
                        <span className="mt-2 block min-h-10 line-clamp-2 break-words text-xs font-black group-hover:text-primary">{card.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{card.id}</span>
                      </Link>
                      <span className={`mt-2 inline-flex min-h-6 items-center self-start rounded-sm border px-2 text-[10px] font-black uppercase tracking-wide ${owned ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-border/60 bg-background/50 text-muted-foreground'}`}>
                        {t(owned ? 'tcg.custom_collections.possession_owned' : 'tcg.custom_collections.possession_not_owned')}
                      </span>
                      <button
                        type="button"
                        onClick={() => add(card)}
                        disabled={alreadyAdded}
                        className="mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-primary/40 px-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:cursor-default disabled:border-border/50 disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {alreadyAdded ? t('tcg.custom_collections.already_added') : <><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('tcg.custom_collections.add')}</>}
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
                  className="mx-auto inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-5 font-bold text-primary hover:bg-primary/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {catalogQuery.isFetchingNextPage ? t('tcg.custom_collections.loading') : t('tcg.custom_collections.load_more')}
                </button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
