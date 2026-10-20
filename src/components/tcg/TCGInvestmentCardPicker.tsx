'use client';

import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getTCGCard, searchCards } from '@/lib/api/tcg';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGCard } from '@/types/tcg';
import { TCGImageWithFallback } from './TCGImageWithFallback';

export function TCGInvestmentCardPicker({ language, onSelect }: { language: TCGCardLanguage; onSelect: (card: TCGCard) => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const catalog = useInfiniteQuery({
    queryKey: ['tcg', 'investment-search', language, query],
    queryFn: ({ signal, pageParam }) => searchCards({ ...DEFAULT_TCG_CARD_FILTERS, sortBy: 'name', searchTerm: query }, language, pageParam, 12, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => last.hasMore ? pages.length + 1 : undefined,
    enabled: query.length >= 2,
    retry: false,
  });
  const candidate = /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i.test(query) ? query : '';
  const exact = useQuery({
    queryKey: ['tcg', 'investment-exact', language, candidate],
    queryFn: ({ signal }) => getTCGCard(candidate, language, signal, { allowEnglishFallback: false }),
    enabled: !!candidate, retry: false,
  });
  const cards = [...new Map([...(exact.data ? [exact.data] : []), ...(catalog.data?.pages.flatMap((page) => page.cards) ?? [])].map((card) => [card.id, card])).values()];
  return <div className="space-y-4">
    <label className="block text-sm font-semibold">
      {t('tcg.custom_collections.search_cards')}
      <Input className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('tcg.custom_collections.search_cards_placeholder')} />
    </label>
    {query.length >= 2 && (catalog.isFetching || exact.isFetching) && <p role="status" className="text-sm text-muted-foreground">{t('tcg.custom_collections.loading')}</p>}
    {query.length >= 2 && catalog.isError && <div role="alert" className="text-sm text-destructive">{t('tcg.custom_collections.search_error')} <Button variant="outline" onClick={() => { void catalog.refetch(); void exact.refetch(); }}>{t('tcg.custom_collections.retry')}</Button></div>}
    {query.length >= 2 && !catalog.isError && !catalog.isPending && !catalog.isFetching && !exact.isFetching && cards.length === 0 && <p role="status">{t('tcg.custom_collections.no_results')}</p>}
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => <li key={card.id}>
        <button type="button" onClick={() => onSelect(card)} aria-label={`${t('investments.choose')}: ${card.name} ${card.id}`} className="h-full w-full rounded-sm border border-border/60 bg-card p-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <div className="relative mx-auto aspect-[2.5/3.5] w-full max-w-32"><TCGImageWithFallback candidates={getTCGCardImageCandidates(card)} alt={card.name} fill sizes="128px" className="object-contain" /></div>
          <span className="mt-2 block break-words text-sm font-bold">{card.name}</span>
          <span className="block break-all text-xs text-muted-foreground">{card.id}</span>
          <span className="block text-xs text-muted-foreground">{card.set?.name}</span>
        </button>
      </li>)}
    </ul>
    {catalog.hasNextPage && <Button variant="outline" disabled={catalog.isFetchingNextPage} onClick={() => void catalog.fetchNextPage()}>{t('tcg.custom_collections.load_more')}</Button>}
  </div>;
}
