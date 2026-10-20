'use client';

import { useEffect, useId, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_TCG_CARD_FILTERS, getTCGCard, searchCards } from '@/lib/api/tcg';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import { getInvestmentReferenceQuote } from '@/lib/tcg-investments';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGCard } from '@/types/tcg';
import { TCGImageWithFallback } from './TCGImageWithFallback';

export function TCGInvestmentCardPicker({ language, onSelect }: { language: TCGCardLanguage; onSelect: (card: TCGCard) => void }) {
  const { t, i18n } = useTranslation();
  const hintId = useId();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const catalog = useInfiniteQuery({
    queryKey: ['tcg', 'investment-search-localized', language, query],
    queryFn: ({ signal, pageParam }) => searchCards({ ...DEFAULT_TCG_CARD_FILTERS, sortBy: 'name', searchTerm: query }, language, pageParam, 12, signal, undefined, undefined, false, { allowEnglishFallback: false }),
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
      <Input aria-describedby={hintId} className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('tcg.custom_collections.search_cards_placeholder')} />
    </label>
    <p id={hintId} className="text-xs text-muted-foreground">{t('investments.search_hint')}</p>
    {query.length >= 2 && (catalog.isFetching || exact.isFetching) && <p role="status" className="text-sm text-muted-foreground">{t('tcg.custom_collections.loading')}</p>}
    {query.length >= 2 && catalog.isError && <div role="alert" className="text-sm text-destructive">{t('tcg.custom_collections.search_error')} <Button variant="outline" onClick={() => { void catalog.refetch(); void exact.refetch(); }}>{t('tcg.custom_collections.retry')}</Button></div>}
    {query.length >= 2 && !catalog.isError && !catalog.isPending && !catalog.isFetching && !exact.isFetching && cards.length === 0 && <p role="status">{t('investments.no_cards')}</p>}
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => <li key={card.id}>
        <button type="button" onClick={() => onSelect(card)} aria-label={`${t('investments.choose')}: ${card.name} ${card.id}`} aria-describedby={`${hintId}-${card.id}`} className="w-full rounded-sm border border-border/60 bg-card p-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <div className="relative mx-auto aspect-[2.5/3.5] w-full max-w-32"><TCGImageWithFallback candidates={getTCGCardImageCandidates(card)} alt={card.name} fill sizes="128px" className="object-contain" /></div>
          <span className="mt-2 block break-words text-sm font-bold">{card.name}</span>
          <span className="block break-all text-xs text-muted-foreground">{card.id}</span>
          <span className="block text-xs text-muted-foreground">{card.set?.name}</span>
        </button>
        <InvestmentCardReference id={`${hintId}-${card.id}`} card={card} locale={i18n.language} />
      </li>)}
    </ul>
    {cards.length > 0 && <p className="text-xs leading-relaxed text-muted-foreground">{t('investments.reference_note')}</p>}
    {catalog.hasNextPage && <Button variant="outline" disabled={catalog.isFetchingNextPage} onClick={() => void catalog.fetchNextPage()}>{t('tcg.custom_collections.load_more')}</Button>}
  </div>;
}

function InvestmentCardReference({ id, card, locale }: { id: string; card: TCGCard; locale: string }) {
  const { t } = useTranslation();
  const quotes = (['normal', 'holo', 'reverse'] as const).flatMap((variant) => {
    if (card.variants?.[variant] !== true) return [];
    const quote = getInvestmentReferenceQuote(card, variant, '');
    return quote ? [{ variant, quote }] : [];
  });
  const pricingRetrieved = card.pricing !== undefined || card.variants_detailed?.some((entry) => entry.pricing !== undefined);
  return (
    <div id={id} className="space-y-1 px-1 pt-2 text-xs text-muted-foreground">
      <p className="font-semibold">{t('investments.reference')}</p>
      {quotes.length ? quotes.map(({ variant, quote }) => (
        <div key={variant}>
          <p>{t(`tcg.collection_variant_${variant}`)} · {new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(quote.amount)}</p>
          <p>{quote.provider === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'}{quote.updatedAt ? ` · ${t('investments.reference_date')}: ${formatReferenceDate(quote.updatedAt, locale)}` : ''}</p>
        </div>
      )) : <p>{t(pricingRetrieved ? 'investments.reference_missing' : 'investments.reference_preview_missing')}</p>}
    </div>
  );
}

function formatReferenceDate(value: string, locale: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed);
}
