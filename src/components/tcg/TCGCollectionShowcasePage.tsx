'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { getTCGShowcasePage, type TCGShowcasePage as TCGShowcasePageData } from '@/lib/api/tcg-share';
import { useTranslation } from '@/lib/i18n';
import type { TCGCard } from '@/types/tcg';
import { TCGCardImage } from './TCGCardImage';

interface TCGCollectionShowcasePageProps {
  token: string;
}

function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function TCGCollectionShowcasePage({ token }: TCGCollectionShowcasePageProps) {
  const { t } = useTranslation();
  const locale = useClientLanguage();
  const [page, setPage] = useState(1);
  const { data: result = null, isPending: loading, isError, error, refetch } = useQuery<TCGShowcasePageData>({
    queryKey: ['tcg', 'showcase', token, page],
    queryFn: ({ signal }) => getTCGShowcasePage(token, page, signal),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') void refetch(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [refetch]);

  const hasNoCards = result?.totalCards === 0;
  const failed = isError && error instanceof Error && error.message.includes('404');
  const unavailable = isError || (!loading && !result);
  const errorCopy = failed
    ? t('tcg.custom_collections.showcase_unavailable')
    : t('tcg.custom_collections.showcase_error');

  return (
    <main className="mx-auto min-h-[60vh] w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {loading && !result ? (
        <p className="rounded-sm border border-border/40 bg-card/30 p-6 text-sm font-semibold text-foreground/65" role="status">
          {t('tcg.custom_collections.showcase_loading')}
        </p>
      ) : unavailable ? (
        <section className="rounded-sm border border-border/40 bg-card/30 p-6" role="alert">
          <h1 className="text-xl font-black">{t('tcg.custom_collections.showcase_title')}</h1>
          <p className="mt-2 text-sm text-foreground/65">{errorCopy}</p>
          {!failed && <button type="button" onClick={() => void refetch()} className="mt-4 min-h-11 rounded-sm border border-border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('tcg.custom_collections.retry')}</button>}
        </section>
      ) : result ? (
        <>
          <header className="border-b border-border/40 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">{t('tcg.custom_collections.showcase_title')}</p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-tight">{result.collection.name}</h1>
            {result.collection.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-foreground/65">{result.collection.description}</p>}
          </header>
          {result.showPrices && <p className="mt-4 text-xs leading-5 text-foreground/55">{t('tcg.custom_collections.showcase_market_note')}</p>}
          {hasNoCards ? (
            <p className="mt-6 rounded-sm border border-border/35 p-5 text-sm font-semibold text-foreground/60">{t('tcg.custom_collections.showcase_empty')}</p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {result.cards.map((card) => {
                  const imageCard: TCGCard = {
                    id: card.id,
                    localId: card.localId ?? card.id,
                    name: card.name,
                    ...(card.image ? { image: card.image } : {}),
                  };
                  return (
                    <article key={`${card.language}:${card.id}`} className="overflow-hidden rounded-sm border border-border/40 bg-card/35">
                      <div className="relative aspect-[5/7] bg-foreground/5">
                        <TCGCardImage card={imageCard} alt={card.name} language={card.language} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw" />
                      </div>
                      <div className="space-y-1 p-3">
                        <h2 className="line-clamp-2 text-sm font-black">{card.name}</h2>
                        {(card.setName || card.localId) && <p className="truncate text-[10px] font-semibold text-foreground/50">{[card.setName, card.localId ? `#${card.localId}` : ''].filter(Boolean).join(' · ')}</p>}
                        {typeof card.quantity === 'number' && <p className="text-xs font-bold text-foreground/70">{t('tcg.custom_collections.showcase_card_quantity', { count: card.quantity })}</p>}
                        {result.showPrices && (
                          <div className="pt-1">
                            {card.price ? (
                              <>
                                <p className="text-sm font-black tabular-nums text-primary">{formatPrice(card.price.amount, card.price.currency, locale)}</p>
                                <p className="text-[10px] text-foreground/50">{card.price.source === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'}</p>
                                <p className="text-[10px] text-foreground/45">
                                  {card.price.updatedAt
                                    ? t('tcg.market_provider_timestamp', { date: `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(card.price.updatedAt))} UTC` })
                                    : t('tcg.market_provider_timestamp_unavailable')}
                                </p>
                              </>
                            ) : <p className="text-xs font-semibold text-foreground/50">{t('tcg.custom_collections.showcase_price_unavailable')}</p>}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              {result.pageCount > 1 && (
                <nav className="mt-6 flex items-center justify-between gap-4 border-t border-border/40 pt-4" aria-label={t('tcg.custom_collections.showcase_title')}>
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={result.page <= 1 || loading} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border px-3 text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t('common.previous')}
                  </button>
                  <p className="text-xs font-bold text-foreground/60" aria-live="polite">{t('tcg.custom_collections.showcase_page', { page: result.page, total: result.pageCount })}</p>
                  <button type="button" onClick={() => setPage((current) => Math.min(result.pageCount, current + 1))} disabled={result.page >= result.pageCount || loading} className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border px-3 text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {t('common.next')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              )}
              {loading && <p className="mt-3 text-xs text-foreground/50" role="status">{t('tcg.custom_collections.showcase_loading')}</p>}
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
