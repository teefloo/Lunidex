'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, TrendingUp } from 'lucide-react';
import { summarizeTCGInvestments, valueTCGInvestment, type TCGInvestment } from '@primedex/core/lib/tcg-investments';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { encodeTCGCollectionKey, getTCGCollectionCardQuantity } from '@/lib/tcg-collections';
import { getTCGCardLanguageName, resolveRequestedTCGCardLanguage } from '@/lib/tcg-language';
import { getTCGCard } from '@/lib/api/tcg';
import { getInvestmentMarketReference } from '@/lib/tcg-investments';
import type { SyncAccessStatus } from '@/store/sync-access';
import { cn } from '@/lib/utils';
import { TCGPageTabs } from './TCGPageTabs';
import { investmentSelectClass, TCGInvestmentForm } from './TCGInvestmentForm';

const PAGE_SIZE = 20;
const performanceClass = (gain: number | null) => gain === null || gain === 0 ? 'text-foreground' : gain > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';

function InvestmentPortfolio({ onEdit, notice, setNotice }: { onEdit: (lot: TCGInvestment | 'new') => void; notice: string; setNotice: (notice: string) => void }) {
  const { t, i18n } = useTranslation();
  const localeHref = useLocaleHref();
  const lots = usePrimeDexStore((state) => state.tcgInvestments);
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const remove = usePrimeDexStore((state) => state.deleteTCGInvestment);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const summary = summarizeTCGInvestments(lots);
  const money = (cents: number | null) => cents === null ? '—' : new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const signedMoney = (cents: number | null) => cents === null ? '—' : `${cents > 0 ? '+' : ''}${money(cents)}`;
  const percent = (value: number | null) => value === null ? '—' : new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value / 100);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(i18n.language, { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : t('investments.date_unknown');
  const filtered = lots.filter((lot) => (filter !== 'missing' || lot.valuation === null) && `${lot.cardName} ${lot.cardId} ${lot.printing}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a, b) => {
    const av = valueTCGInvestment(a), bv = valueTCGInvestment(b);
    if (sort === 'best') return (bv.gainCents ?? -Infinity) - (av.gainCents ?? -Infinity) || a.id.localeCompare(b.id);
    if (sort === 'cost') return bv.investedCents - av.investedCents || a.id.localeCompare(b.id);
    return (b.acquiredOn ?? '').localeCompare(a.acquiredOn ?? '') || b.createdAt.localeCompare(a.createdAt);
  });
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const activePage = Math.min(page, lastPage);
  const metrics = [
    { label: t('investments.invested'), value: money(summary.investedCents) },
    { label: t('investments.value'), value: money(summary.valueCents) },
    { label: t('investments.gain'), value: signedMoney(summary.gainCents), gain: summary.gainCents },
    { label: t('investments.yield'), value: percent(summary.returnPercent), gain: summary.gainCents },
  ];
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('investments.inventory_note')}</p>
      <Button onClick={() => { setNotice(''); onEdit('new'); }}><Plus aria-hidden="true" />{t('investments.add')}</Button>
    </div>
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <div key={metric.label} className="page-surface min-w-0 p-5"><dt className="text-sm text-muted-foreground">{metric.label}</dt><dd className={cn('mt-3 break-words text-2xl font-black tabular-nums sm:text-3xl', performanceClass(metric.gain ?? null))}>{metric.value}</dd></div>)}
    </dl>
    <p className={cn('my-4 rounded-sm border p-4 text-sm', summary.unvaluedQuantity ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/60 text-muted-foreground')}>
      {summary.unvaluedQuantity ? t(summary.unvaluedQuantity === 1 ? 'investments.partial_one' : 'investments.partial', { count: summary.unvaluedQuantity, amount: money(summary.unvaluedCostCents) }) : lots.length ? t('investments.complete') : t('investments.empty_hint')}
    </p>
    {lots.length > 0 && <p className="-mt-2 mb-4 text-xs leading-relaxed text-muted-foreground">{t('investments.reference_note')}</p>}
    <p role="status" className="mb-4 text-sm text-muted-foreground">{notice}</p>
    {lots.length === 0 ? <div className="page-surface py-14 text-center"><TrendingUp aria-hidden="true" className="mx-auto mb-4 size-8 text-muted-foreground" /><h2 className="text-xl font-bold">{t('investments.empty')}</h2><p className="mx-auto mt-2 max-w-lg px-4 text-sm text-muted-foreground">{t('investments.empty_hint')}</p></div> : <>
      <div className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
        <Input aria-label={t('investments.search')} placeholder={t('investments.search')} value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        <select aria-label={t('investments.filter')} className={cn(investmentSelectClass, 'mt-0')} value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="all">{t('investments.all')}</option><option value="missing">{t('investments.missing')}</option></select>
        <select aria-label={t('investments.sort')} className={cn(investmentSelectClass, 'mt-0')} value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }}><option value="newest">{t('investments.newest')}</option><option value="best">{t('investments.best')}</option><option value="cost">{t('investments.cost')}</option></select>
      </div>
      {filtered.length === 0 && <p role="status" className="py-10 text-center text-muted-foreground">{t('investments.no_purchases')}</p>}
      <ul className="space-y-4">
        {filtered.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE).map((lot) => {
          const value = valueTCGInvestment(lot);
          const collectionKey = encodeTCGCollectionKey(lot.language, lot.setId);
          const inventoryQuantity = collectionKey && !lot.printing && lot.condition !== 'graded' && ['normal', 'holo', 'reverse'].includes(lot.variant) ? getTCGCollectionCardQuantity(collectionKey, lot.cardId, lot.variant as 'normal' | 'holo' | 'reverse', collectionCards) : null;
          const variant = t(['normal', 'holo', 'reverse'].includes(lot.variant) ? `tcg.collection_variant_${lot.variant}` : `investments.${lot.variant}`);
          return <li key={lot.id} className="page-surface overflow-hidden p-4 sm:p-5" data-testid="investment-lot">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="break-words text-lg font-bold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={`${localeHref(`/tcg/cards/${encodeURIComponent(lot.cardId)}`)}?tcgLang=${lot.language}`}>{lot.cardName}</Link>
                <p className="mt-1 break-words text-xs text-muted-foreground">{lot.cardId} · {getTCGCardLanguageName(lot.language, i18n.language)} · {variant} · {t(`investments.${lot.condition === 'unknown' ? 'unknown_condition' : lot.condition}`)}{lot.printing ? ` · ${lot.printing}` : ''}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t('investments.quantity')}: {lot.quantity} · {date(lot.acquiredOn)} · {money(lot.unitCostCents)} × {lot.quantity} + {money(lot.feesCents)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onEdit(lot)}>{t('investments.edit')}</Button>
                <Button variant="ghost" onClick={() => { if (window.confirm(t('investments.delete_confirm')) && !remove(lot.id)) setNotice(t('tcg.custom_collections.delete_error')); }}>{t('tcg.custom_collections.delete')}</Button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border/50 pt-4 lg:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">{t('investments.invested')}</dt><dd className="mt-1 font-bold tabular-nums">{money(value.investedCents)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{lot.valuation ? t('investments.manual') : t('investments.unknown')}</dt><dd className="mt-1 font-bold tabular-nums">{money(value.valueCents)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('investments.gain')}</dt><dd className={cn('mt-1 font-bold tabular-nums', performanceClass(value.gainCents))}>{signedMoney(value.gainCents)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t('investments.yield')}</dt><dd className={cn('mt-1 font-bold tabular-nums', performanceClass(value.gainCents))}>{percent(value.returnPercent)}</dd></div>
            </dl>
            <InvestmentMarketReference lot={lot} locale={i18n.language} />
            <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
              <span>{t('investments.valuation_date')}: {date(lot.valuation?.valuedOn ?? null)}</span>
              <Link className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={localeHref(`/tcg/collection/${lot.language}/${encodeURIComponent(lot.setId)}`)}>{inventoryQuantity === null ? t('tcg.collection_open_in_language') : t('investments.inventory', { count: inventoryQuantity })}</Link>
            </div>
          </li>;
        })}
      </ul>
      {lastPage > 0 && <div className="mt-5 flex items-center justify-center gap-4"><Button variant="outline" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}>{t('tcg.custom_collections.previous')}</Button><span className="text-sm tabular-nums">{activePage + 1} / {lastPage + 1}</span><Button variant="outline" disabled={activePage === lastPage} onClick={() => setPage(activePage + 1)}>{t('tcg.custom_collections.next')}</Button></div>}
    </>}
  </>;
}

function InvestmentMarketReference({ lot, locale }: { lot: TCGInvestment; locale: string }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['tcg', 'investment-market-reference', lot.language, lot.cardId],
    queryFn: ({ signal }) => getTCGCard(lot.cardId, lot.language, signal, { allowEnglishFallback: false, requirePricing: true }),
    retry: false,
  });
  if (!query.data) return null;

  const reference = getInvestmentMarketReference(query.data, lot.variant, lot.printing);
  if (!reference) return null;

  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: reference.quote.currency }).format(reference.quote.amount);
  const updatedAt = reference.quote.updatedAt ? new Date(reference.quote.updatedAt) : null;
  const updatedLabel = updatedAt && Number.isFinite(updatedAt.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(updatedAt)
    : null;

  return (
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
      <span className="font-semibold">{t('investments.reference')} · {t(`tcg.collection_variant_${reference.variant}`)}: {money} · {reference.quote.provider === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'}</span>
      {!reference.matchesFinish && <span> · {t('investments.reference_special')}</span>}
      {updatedLabel && <span> · {t('investments.reference_date')}: {updatedLabel}</span>}
    </p>
  );
}

function InvestmentWorkspace({ status }: { status: SyncAccessStatus }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const language = resolveRequestedTCGCardLanguage(searchParams.get('tcgLang')) ?? browseLanguage;
  const [form, setForm] = useState<TCGInvestment | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  return <>
    {status === 'ready' ? <InvestmentPortfolio onEdit={(lot) => { setNotice(''); setForm(lot); }} notice={notice} setNotice={setNotice} /> : status === 'unauthenticated' ? <SyncRequiredPanel headingLevel={2} /> : <SyncStatusPanel status={status} headingLevel={2} />}
    {form && <TCGInvestmentForm key={typeof form === 'string' ? form : form.id} lot={typeof form === 'string' ? undefined : form} language={language} onClose={() => setForm(null)} onSaved={() => { setForm(null); setNotice(t('investments.saved')); }} />}
  </>;
}

function TCGInvestmentsPageContent() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const status = useSyncAccessStatus();
  const hydrated = usePrimeDexStore((state) => state._hasHydrated);
  return <div className="app-page"><Header /><main className="page-shell page-shell--header-offset pb-40" aria-labelledby="investments-title">
    <TCGPageTabs />
    <div className="mb-6"><h1 id="investments-title" className="text-2xl font-black uppercase tracking-tight sm:text-3xl">{t('investments.title')}</h1><p className="mt-2 text-sm text-muted-foreground">{t('investments.subtitle')}</p></div>
    {loading || !hydrated ? <p role="status">{t('tcg.custom_collections.loading')}</p> : !user ? <SyncRequiredPanel headingLevel={2} /> : <InvestmentWorkspace key={user.id} status={status} />}
  </main></div>;
}

export function TCGInvestmentsPage() {
  return <Suspense><TCGInvestmentsPageContent /></Suspense>;
}
