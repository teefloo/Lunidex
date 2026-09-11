'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CloudOff,
  Database,
  Download,
  ExternalLink,
  LockKeyhole,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  formatSealedEuroInput,
  parseSealedEuroInput,
  SEALED_MONEY_FIELDS,
  sealedEuroPlaceholder,
  type SealedMoneyField,
} from '@/lib/tcg-sealed-input';
import {
  createSealedTransaction,
  downloadSealedExport,
  fetchSealedCatalogue,
  fetchSealedOverview,
  fetchSealedProduct,
  fetchSealedSources,
  fetchSealedTransactions,
  SealedApiError,
  syncSealedSources,
  updateSealedAlias,
  updateSealedTransaction,
  voidSealedTransaction,
  type SealedCatalogueResponse,
  type SealedOverviewResponse,
  type SealedProductDetailResponse,
  type SealedSourcesResponse,
} from '@/lib/api/tcg-sealed';
import { SEALED_SUBVIEWS, getSealedSubnavPath } from '@/lib/tcg-sealed-navigation';
import type {
  SealedProduct,
  SealedProductLanguage,
  SealedTransaction,
  SealedTransactionDraft,
} from '@primedex/core';

type SealedView = 'dashboard' | 'collection' | 'journal' | 'sales' | 'cashflow' | 'analytics' | 'catalogue' | 'sources' | 'product';
type FormState = { transaction?: SealedTransaction; product?: SealedProduct; kind?: 'buy' | 'sell' };
type PeriodPreset = 'all' | '1' | '7' | '30' | 'year' | 'custom';

function money(cents: number | null | undefined, language: string): string {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(cents / 100);
}

function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function dateLabel(value: string | null | undefined, language: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function dayShift(day: string, offset: number): string {
  return new Date(`${day}T00:00:00Z`).getTime() + offset * 86_400_000 > 0
    ? new Date(new Date(`${day}T00:00:00Z`).getTime() + offset * 86_400_000).toISOString().slice(0, 10)
    : day;
}

function todayDay(): string {
  return new Date().toISOString().slice(0, 10);
}

interface SealedErrorPresentation {
  title: string;
  message: string;
  unavailable: boolean;
}

function presentSealedError(error: unknown, t: (key: string, options?: Record<string, unknown>) => string): SealedErrorPresentation {
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalizedMessage = rawMessage.toLowerCase();
  const status = error instanceof SealedApiError ? error.status : null;

  if (status === 401) {
    return {
      title: t('tcg.sealed.auth_error_title'),
      message: t('tcg.sealed.auth_error_description'),
      unavailable: false,
    };
  }

  if (status === 429) {
    return {
      title: t('tcg.sealed.rate_limit_title'),
      message: t('tcg.sealed.rate_limit_description'),
      unavailable: false,
    };
  }

  if (status === 404) {
    return {
      title: t('tcg.sealed.error_title'),
      message: t('tcg.sealed.no_catalogue'),
      unavailable: false,
    };
  }

  const unavailable = status !== null && status >= 500
    || normalizedMessage.includes('temporarily unavailable')
    || normalizedMessage.includes('request failed')
    || normalizedMessage.includes('failed to fetch')
    || normalizedMessage.includes('networkerror');

  if (unavailable) {
    return {
      title: t('tcg.sealed.unavailable_title'),
      message: process.env.NODE_ENV === 'development'
        ? t('tcg.sealed.local_unavailable_description')
        : t('tcg.sealed.unavailable_description'),
      unavailable: true,
    };
  }

  return {
    title: t('tcg.sealed.error_title'),
    message: t('tcg.sealed.error_description'),
    unavailable: false,
  };
}

function productImagePath(product: SealedProduct): string {
  return `/api/tcg/sealed/products/${product.cardmarketProductId}/image`;
}

function ProductThumb({ product, size = 'md' }: { product: SealedProduct; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const dimensions = size === 'lg' ? { width: 112, height: 148 } : size === 'sm' ? { width: 52, height: 68 } : { width: 76, height: 100 };
  if (!product.imageAvailable || failed) {
    return <div className={`flex shrink-0 items-center justify-center rounded-sm border border-border/60 bg-muted/30 text-primary/50 ${size === 'lg' ? 'h-36 w-28' : size === 'sm' ? 'h-[4.25rem] w-[3.25rem]' : 'h-[6.25rem] w-[4.75rem]'}`} aria-label={t('tcg.sealed.no_price')}><Package className="h-6 w-6" aria-hidden="true" /></div>;
  }
  return <Image src={productImagePath(product)} alt={t('tcg.sealed.image_alt', { name: product.name })} width={dimensions.width} height={dimensions.height} unoptimized className={`shrink-0 rounded-sm object-cover ${size === 'lg' ? 'h-36 w-28' : size === 'sm' ? 'h-[4.25rem] w-[3.25rem]' : 'h-[6.25rem] w-[4.75rem]'}`} onError={() => setFailed(true)} />;
}

function StatCard({ icon: Icon, label, value, tone = 'default', hint }: { icon: typeof Package; label: string; value: string; tone?: 'default' | 'positive' | 'negative'; hint?: string }) {
  return (
    <Card className="min-w-0 border-primary/15 bg-card/65 p-0">
      <CardContent className="flex min-h-28 flex-col justify-between p-4">
        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-foreground/45"><span>{label}</span><Icon className="h-4 w-4 text-primary/65" aria-hidden="true" /></div>
        <p className={`mt-4 truncate text-2xl font-black tracking-tight ${tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-rose-400' : 'text-foreground'}`}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-foreground/45">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function PriceStatus({ valuation, t }: { valuation: SealedOverviewResponse['positions'][number]['valuation']; t: (key: string, options?: Record<string, unknown>) => string }) {
  const label = valuation.priceCents === null
    ? t('tcg.sealed.price_unavailable')
    : valuation.stale
      ? t('tcg.sealed.stale_price')
      : null;
  return label ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-300/80">{label}</p> : null;
}

function PortfolioChart({ history, language, label, chartLabel }: { history: SealedOverviewResponse['history']; language: string; label: string; chartLabel: string }) {
  const points = history.filter((point) => point.valueCents !== null);
  if (points.length < 2) return <div className="flex min-h-56 items-center justify-center rounded-sm border border-dashed border-border/70 text-sm text-foreground/45">{label}</div>;
  const values = points.map((point) => point.valueCents as number);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  const coordinates = points.map((point, index) => `${(index / (points.length - 1)) * 100},${100 - (((point.valueCents as number) - min) / range) * 82 - 9}`).join(' ');
  return (
    <div className="rounded-sm border border-border/60 bg-background/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/50"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />{chartLabel}</span><span>EUR</span></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-56 w-full overflow-visible" role="img" aria-label={chartLabel}>
        <defs><linearGradient id="sealed-portfolio-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".26" /><stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" /></linearGradient></defs>
        <polyline points={`0,100 ${coordinates} 100,100`} fill="url(#sealed-portfolio-fill)" stroke="none" />
        <polyline points={coordinates} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/40"><span>{dateLabel(points[0]?.day, language)}</span><span>{money(points.at(-1)?.valueCents, language)}</span><span>{dateLabel(points.at(-1)?.day, language)}</span></div>
      <p className="sr-only">{label}: {money(points.at(-1)?.valueCents, language)} au {dateLabel(points.at(-1)?.day, language)}.</p>
    </div>
  );
}

function ProductPriceHistoryChart({ prices, transactions, language, t }: { prices: SealedProductDetailResponse['prices']; transactions: SealedTransaction[]; language: string; t: (key: string, options?: Record<string, unknown>) => string }) {
  const series = [
    { key: 'trendCents', label: 'Trend', color: 'hsl(var(--primary))' },
    { key: 'lowCents', label: 'Low', color: '#fbbf24' },
    { key: 'avg1Cents', label: 'AVG1', color: '#34d399' },
    { key: 'avg7Cents', label: 'AVG7', color: '#a78bfa' },
    { key: 'avg30Cents', label: 'AVG30', color: '#fb7185' },
  ] as const;
  const tradeTotals = new Map<string, { kind: 'buy' | 'sell'; quantity: number; totalCents: number; index: number }>();
  for (const transaction of transactions) {
    if (transaction.voided) continue;
    const index = prices.findIndex((price) => price.day === transaction.date);
    if (index < 0) continue;
    const key = `${index}:${transaction.kind}`;
    const current = tradeTotals.get(key) ?? { kind: transaction.kind, quantity: 0, totalCents: 0, index };
    current.quantity += transaction.quantity;
    current.totalCents += transaction.quantity * transaction.unitPriceCents;
    tradeTotals.set(key, current);
  }
  const tradePoints = [...tradeTotals.values()].map((trade) => ({ ...trade, valueCents: trade.totalCents / trade.quantity }));
  const values = [
    ...series.flatMap((item) => prices.map((price) => price.metrics[item.key]).filter((value): value is number => value !== null)),
    ...tradePoints.map((trade) => trade.valueCents),
  ];
  if (prices.length < 2 || values.length === 0) return <div className="flex min-h-56 items-center justify-center rounded-sm border border-dashed border-border/70 text-sm text-foreground/45">{t('tcg.sealed.no_history')}</div>;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  const coordinate = (value: number, index: number) => `${(index / Math.max(1, prices.length - 1)) * 100},${100 - ((value - min) / range) * 82 - 9}`;
  return <div className="rounded-sm border border-border/60 bg-background/20 p-3">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-64 w-full overflow-visible" role="img" aria-label={t('tcg.sealed.price_history')}>
      {series.map((item) => {
        const points = prices.map((price, index) => {
          const value = price.metrics[item.key];
          return value === null ? null : coordinate(value, index);
        }).filter((point): point is string => point !== null).join(' ');
        return points ? <polyline key={item.key} points={points} fill="none" stroke={item.color} strokeWidth="1.15" vectorEffect="non-scaling-stroke" /> : null;
      })}
      {tradePoints.map((trade) => <circle key={`${trade.index}-${trade.kind}`} cx={(trade.index / Math.max(1, prices.length - 1)) * 100} cy={100 - ((trade.valueCents - min) / range) * 82 - 9} r="1.8" fill={trade.kind === 'buy' ? '#34d399' : '#a78bfa'} vectorEffect="non-scaling-stroke"><title>{`${trade.kind === 'buy' ? t('tcg.sealed.buy') : t('tcg.sealed.sell')} · ${money(trade.valueCents, language)}`}</title></circle>)}
    </svg>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/55">{series.map((item) => <span key={item.key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</span>)}<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />{t('tcg.sealed.buy')}</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />{t('tcg.sealed.sell')}</span></div>
    <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/40"><span>{dateLabel(prices[0]?.day, language)}</span><span>{money(prices.at(-1)?.metrics.trendCents, language)}</span><span>{dateLabel(prices.at(-1)?.day, language)}</span></div>
  </div>;
}

function SealedSubnav({ view, localizedHref, t }: { view: SealedView; localizedHref: (path: string) => string; t: (key: string, options?: Record<string, unknown>) => string }) {
  const router = useRouter();

  return (
    <nav className="mb-6" aria-label={t('tcg.sealed.title')}>
      <div className="relative md:hidden">
        <label htmlFor="sealed-view-select" className="sr-only">{t('tcg.sealed.title')}</label>
        <select
          id="sealed-view-select"
          value={view}
          onChange={(event) => router.push(localizedHref(getSealedSubnavPath(event.target.value)))}
          className="glass-control h-12 w-full cursor-pointer appearance-none px-4 pr-10 text-sm font-black uppercase tracking-[0.12em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35"
          aria-label={t('tcg.sealed.title')}
        >
          {SEALED_SUBVIEWS.map((item) => (
            <option key={item.key} value={item.key}>
              {t(`tcg.sealed.${item.labelKey}`)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
      </div>
      <div className="glass-toolbar hidden w-full flex-wrap gap-1 p-1.5 md:flex">
        {SEALED_SUBVIEWS.map((item) => <Link key={item.key} href={localizedHref(item.path)} aria-current={view === item.key ? 'page' : undefined} className={`touch-target inline-flex min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${view === item.key ? 'border border-primary/40 bg-primary/15 text-primary' : 'text-foreground/50 hover:bg-muted/50 hover:text-foreground'}`}>{t(`tcg.sealed.${item.labelKey}`)}</Link>)}
      </div>
    </nav>
  );
}

function PeriodBar({
  view,
  preset,
  from,
  to,
  t,
  onPreset,
  onFrom,
  onTo,
}: {
  view: SealedView;
  preset: PeriodPreset;
  from: string;
  to: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  onPreset: (preset: PeriodPreset) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  if (!['dashboard', 'journal', 'sales', 'cashflow', 'analytics'].includes(view)) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-card/55 p-3 shadow-[var(--shadow-pixel-sm)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-primary"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground/50">{t('tcg.sealed.period')}</p>
          <p className="mt-0.5 text-xs text-foreground/55">{t(`tcg.sealed.${preset === 'all' ? 'period_since_start' : preset === '1' ? 'today' : preset === '7' ? 'last_7_days' : preset === '30' ? 'last_30_days' : preset === 'year' ? 'current_year' : 'custom'}`)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/50">
          <span className="sr-only">{t('tcg.sealed.period')}</span>
          <select className="glass-control h-10 min-w-52 px-3 text-sm normal-case tracking-normal" value={preset} onChange={(event) => onPreset(event.target.value as PeriodPreset)}>
            <option value="all">{t('tcg.sealed.period_since_start')}</option>
            <option value="1">{t('tcg.sealed.today')}</option>
            <option value="7">{t('tcg.sealed.last_7_days')}</option>
            <option value="30">{t('tcg.sealed.last_30_days')}</option>
            <option value="year">{t('tcg.sealed.current_year')}</option>
            <option value="custom">{t('tcg.sealed.custom')}</option>
          </select>
        </label>
      {preset === 'custom' ? (
        <>
          <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/50">
            <span>{t('tcg.sealed.from')}</span>
            <Input type="date" value={from} max={to || todayDay()} onChange={(event) => onFrom(event.target.value)} />
          </label>
          <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/50">
            <span>{t('tcg.sealed.to')}</span>
            <Input type="date" value={to} max={todayDay()} min={from || undefined} onChange={(event) => onTo(event.target.value)} />
          </label>
        </>
      ) : null}
      </div>
    </div>
  );
}

function EmptyPortfolio({ t, localizedHref, onAdd }: { t: (key: string, options?: Record<string, unknown>) => string; localizedHref: (path: string) => string; onAdd?: () => void }) {
  return (
    <Card className="border-primary/25 bg-primary/[0.04] p-0">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-primary/35 bg-primary/10 text-primary"><Boxes className="h-6 w-6" aria-hidden="true" /></div>
            <h2 className="mt-5 text-2xl font-black tracking-tight">{t('tcg.sealed.empty')}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/60">{t('tcg.sealed.empty_description')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {onAdd ? <Button type="button" onClick={onAdd}><Plus aria-hidden="true" />{t('tcg.sealed.add_transaction')}</Button> : null}
              <Link href={localizedHref('/tcg/sealed/catalogue')} className={buttonVariants({ variant: 'outline' })}>{t('tcg.sealed.catalogue')}</Link>
            </div>
          </div>
          <div className="border-t border-border/60 bg-background/15 p-6 md:border-l md:border-t-0 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground/45">{t('tcg.sealed.empty_steps')}</p>
            <ol className="mt-4 space-y-4">
              {[t('tcg.sealed.empty_step_one'), t('tcg.sealed.empty_step_two'), t('tcg.sealed.empty_step_three')].map((step, index) => <li key={step} className="flex gap-3 text-sm leading-5 text-foreground/65"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-black text-primary">{index + 1}</span><span>{step}</span></li>)}
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionRow({ transaction, product, language, t, onEdit, onVoid }: { transaction: SealedTransaction; product?: SealedProduct; language: string; t: (key: string, options?: Record<string, unknown>) => string; onEdit: () => void; onVoid: () => void }) {
  return <div className={`flex flex-col gap-3 border-b border-border/50 px-4 py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_100px_100px_96px_auto] sm:items-center ${transaction.voided ? 'opacity-50' : ''}`}>
    <div className="flex min-w-0 items-center gap-3">{product ? <ProductThumb product={product} size="sm" /> : null}<div className="min-w-0"><p className="truncate font-bold">{product?.name ?? `#${transaction.cardmarketProductId}`}</p><p className="mt-1 text-xs text-foreground/45">{dateLabel(transaction.date, language)} · {transaction.language.toUpperCase()} · {transaction.quantity} {t('tcg.sealed.units').toLowerCase()}</p></div></div>
    <Badge variant={transaction.kind === 'buy' ? 'secondary' : 'default'}>{transaction.kind === 'buy' ? t('tcg.sealed.buy') : t('tcg.sealed.sell')}</Badge>
    <span className="text-sm font-bold">{money(transaction.unitPriceCents, language)} <span className="text-xs font-normal text-foreground/45">× {transaction.quantity}</span></span>
    <span className="text-xs text-foreground/50">{transaction.voided ? t('tcg.sealed.void') : transaction.allocationMethod.toUpperCase()}</span>
    <div className="flex items-center gap-2 sm:justify-end"><Button variant="ghost" size="icon-sm" type="button" onClick={onEdit} aria-label={t('tcg.sealed.edit')} title={t('tcg.sealed.edit')}><Pencil aria-hidden="true" /></Button><Button variant="ghost" size="icon-sm" type="button" onClick={onVoid} disabled={transaction.voided} aria-label={t('tcg.sealed.void')} title={t('tcg.sealed.void')}><Ban aria-hidden="true" /></Button></div>
  </div>;
}

const SEALED_FORM_FOCUS_CLASS = 'sealed-form-control focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-primary/60';

function TransactionForm({ state, products, lots, language, t, onClose, onSave, busy }: { state: FormState; products: SealedProduct[]; lots: SealedOverviewResponse['lots']; language: string; t: (key: string, options?: Record<string, unknown>) => string; onClose: () => void; onSave: (draft: SealedTransactionDraft, existing?: SealedTransaction) => void; busy: boolean }) {
  const existing = state.transaction;
  const initial: SealedTransactionDraft = existing ?? {
    kind: state.kind ?? 'buy', cardmarketProductId: state.product?.cardmarketProductId ?? 0, language: 'unknown', date: new Date().toISOString().slice(0, 10), quantity: 1, unitPriceCents: 0, feesCents: 0, shippingCents: 0, discountCents: 0, paymentFeesCents: 0, otherCostsCents: 0, platform: '', counterparty: '', notes: '', storage: '', allocationMethod: 'fifo', selections: [],
  };
  const [form, setForm] = useState<SealedTransactionDraft>(initial);
  const [productSearch, setProductSearch] = useState(state.product?.name ?? '');
  const [selectedProduct, setSelectedProduct] = useState<SealedProduct | undefined>(state.product ?? products.find((product) => product.cardmarketProductId === initial.cardmarketProductId));
  const [manualLots, setManualLots] = useState<Record<string, number>>(() => Object.fromEntries(initial.selections.map((selection) => [selection.lotId, selection.quantity])));
  const [moneyInputs, setMoneyInputs] = useState<Record<SealedMoneyField, string>>(() => Object.fromEntries(SEALED_MONEY_FIELDS.map((key) => [key, formatSealedEuroInput(initial[key], language)])) as Record<SealedMoneyField, string>);
  const [moneyError, setMoneyError] = useState<SealedMoneyField | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const catalogue = useQuery<SealedCatalogueResponse>({ queryKey: ['tcg-sealed', 'form-catalogue', productSearch], queryFn: ({ signal }) => fetchSealedCatalogue(productSearch, 0, signal), enabled: catalogueOpen && productSearch.trim().length > 1 });
  const availableLots = lots.filter((lot) => (lot.remaining > 0 || manualLots[lot.transaction.id] > 0) && lot.transaction.cardmarketProductId === form.cardmarketProductId && lot.transaction.language === form.language);
  const setField = <K extends keyof SealedTransactionDraft>(key: K, value: SealedTransactionDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const handleMoneyChange = (key: SealedMoneyField, value: string) => {
    setMoneyInputs((current) => ({ ...current, [key]: value }));
    const cents = parseSealedEuroInput(value);
    if (cents !== null) setField(key, cents);
    if (moneyError === key && cents !== null) setMoneyError(null);
  };
  const handleMoneyBlur = (key: SealedMoneyField) => {
    if (parseSealedEuroInput(moneyInputs[key]) === null) setMoneyError(key);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const moneyValues = {} as Pick<SealedTransactionDraft, SealedMoneyField>;
    for (const key of SEALED_MONEY_FIELDS) {
      const cents = parseSealedEuroInput(moneyInputs[key]);
      if (cents === null) {
        setMoneyError(key);
        return;
      }
      moneyValues[key] = cents;
    }
    const selections = form.allocationMethod === 'manual' ? Object.entries(manualLots).filter(([, quantity]) => quantity > 0).map(([lotId, quantity]) => ({ lotId, quantity })) : [];
    onSave({ ...form, ...moneyValues, selections }, existing);
  };
  const quantityField = () => <label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.quantity')}</span><Input className={SEALED_FORM_FOCUS_CLASS} type="number" inputMode="numeric" min={1} step={1} value={form.quantity} onChange={(event) => setField('quantity', Math.max(1, Math.floor(Number(event.target.value) || 1)))} /></label>;
  const moneyField = (label: string, key: SealedMoneyField) => {
    const errorId = `sealed-${key}-error`;
    return <label className="space-y-1.5 text-xs font-bold text-foreground/65"><span className="flex items-center justify-between gap-2"><span>{label}</span><span className="text-[10px] font-black uppercase tracking-[0.12em] text-foreground/35">EUR</span></span><Input id={`sealed-${key}`} className={SEALED_FORM_FOCUS_CLASS} type="text" inputMode="decimal" autoComplete="off" value={moneyInputs[key]} placeholder={sealedEuroPlaceholder(language)} aria-invalid={moneyError === key || undefined} aria-describedby={moneyError === key ? errorId : undefined} onChange={(event) => handleMoneyChange(key, event.target.value)} onBlur={() => handleMoneyBlur(key)} />{moneyError === key ? <span id={errorId} className="block text-[11px] font-medium leading-4 text-rose-300" role="alert">{t('tcg.sealed.invalid_amount', { defaultValue: 'Enter a valid amount, for example 12 or 12,50.' })}</span> : null}</label>;
  };
  const textField = (label: string, key: 'platform' | 'counterparty' | 'storage') => <label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{label}</span><Input className={SEALED_FORM_FOCUS_CLASS} type="text" value={form[key]} onChange={(event) => setField(key, event.target.value)} /></label>;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="!overflow-hidden sm:max-w-2xl"><DialogHeader><DialogTitle>{existing ? t('tcg.sealed.edit_transaction') : t('tcg.sealed.add_transaction')}</DialogTitle><DialogDescription>{t('tcg.sealed.private_note')}</DialogDescription></DialogHeader><form onSubmit={submit} className="flex min-h-0 flex-col gap-5">
    <div className="min-h-0 max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-contain pr-1 sm:max-h-[calc(100dvh-15rem)]"><div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.buy')} / {t('tcg.sealed.sell')}</span><select className={`glass-control h-11 w-full px-3 text-sm ${SEALED_FORM_FOCUS_CLASS}`} value={form.kind} onChange={(event) => setField('kind', event.target.value as 'buy' | 'sell')} disabled={Boolean(existing)}><option value="buy">{t('tcg.sealed.buy')}</option><option value="sell">{t('tcg.sealed.sell')}</option></select></label><label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.date')}</span><Input className={SEALED_FORM_FOCUS_CLASS} type="date" max={todayDay()} value={form.date} onChange={(event) => setField('date', event.target.value)} /></label></div>
      <div className="space-y-2"><label className="text-xs font-bold text-foreground/65" htmlFor="sealed-product-search">{t('tcg.sealed.product')}</label><div className="relative"><Input id="sealed-product-search" className={`pr-10 ${SEALED_FORM_FOCUS_CLASS}`} value={selectedProduct?.name ?? (existing ? `#${form.cardmarketProductId}` : productSearch)} placeholder={t('tcg.sealed.search')} autoComplete="off" onFocus={() => setCatalogueOpen(true)} onChange={(event) => { setSelectedProduct(undefined); setProductSearch(event.target.value); setCatalogueOpen(true); }} disabled={Boolean(existing)} /><Search className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-foreground/35" aria-hidden="true" /></div>{catalogueOpen && !selectedProduct && productSearch.length > 1 ? <div role="listbox" aria-label={t('tcg.sealed.search')} aria-busy={catalogue.isPending} className="max-h-64 overflow-y-auto rounded-sm border border-border bg-card shadow-[var(--shadow-pixel-sm)]">{catalogue.isPending ? <p className="p-3 text-sm text-foreground/50">{t('tcg.sealed.loading')}</p> : catalogue.data?.products.length ? catalogue.data.products.slice(0, 8).map((product) => <button type="button" role="option" aria-selected={false} key={product.cardmarketProductId} className="group flex min-h-[4.75rem] w-full items-center gap-3 border-b border-border/40 p-2 text-left last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40" onClick={() => { setSelectedProduct(product); setProductSearch(product.name); setField('cardmarketProductId', product.cardmarketProductId); setCatalogueOpen(false); }}><ProductThumb product={product} size="sm" /><span className="min-w-0"><span className="line-clamp-2 text-sm font-bold group-hover:text-primary">{product.name}</span><span className="mt-1 block text-xs text-foreground/45">{product.categoryName} · #{product.cardmarketProductId}</span></span></button>) : <p className="p-3 text-sm text-foreground/50">{t('tcg.sealed.no_catalogue')}</p>}</div> : null}</div>
      <div className="grid gap-3 sm:grid-cols-3">{quantityField()}{moneyField(t('tcg.sealed.unit_price'), 'unitPriceCents')}{moneyField(t('tcg.sealed.fees'), 'feesCents')}</div>
      <p className="-mt-2 text-[11px] leading-4 text-foreground/45">{t('tcg.sealed.currency_hint', { defaultValue: 'EUR · enter 12 or 12,50 — the decimal separator is optional.' })}</p>
      <div className="grid gap-3 sm:grid-cols-3">{moneyField(t('tcg.sealed.shipping'), 'shippingCents')}{form.kind === 'buy' ? moneyField(t('tcg.sealed.discount'), 'discountCents') : moneyField(t('tcg.sealed.payment_fees'), 'paymentFeesCents')}{form.kind === 'sell' ? moneyField(t('tcg.sealed.other_costs'), 'otherCostsCents') : <span />}</div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.language')}</span><select className={`glass-control h-11 w-full px-3 text-sm ${SEALED_FORM_FOCUS_CLASS}`} value={form.language} onChange={(event) => setField('language', event.target.value as SealedProductLanguage)}><option value="unknown">—</option>{(['en', 'fr', 'es', 'de', 'it', 'ja'] as const).map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label><label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.allocation')}</span><select className={`glass-control h-11 w-full px-3 text-sm ${SEALED_FORM_FOCUS_CLASS}`} value={form.allocationMethod} onChange={(event) => setField('allocationMethod', event.target.value as 'fifo' | 'manual')} disabled={form.kind === 'buy'}><option value="fifo">{t('tcg.sealed.fifo')}</option><option value="manual">{t('tcg.sealed.manual')}</option></select></label></div>
      {form.kind === 'sell' && form.allocationMethod === 'manual' ? <div className="rounded-sm border border-primary/25 bg-primary/5 p-3"><p className="text-xs text-foreground/60">{t('tcg.sealed.manual_hint')}</p><div className="mt-3 space-y-2">{availableLots.length ? availableLots.map((lot) => { const capacity = lot.remaining + (manualLots[lot.transaction.id] ?? 0); return <label key={lot.transaction.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate">{dateLabel(lot.transaction.date, language)} · {capacity} {t('tcg.sealed.units').toLowerCase()}</span><Input className={`h-9 w-24 ${SEALED_FORM_FOCUS_CLASS}`} type="number" min="0" max={capacity} value={manualLots[lot.transaction.id] ?? 0} onChange={(event) => setManualLots((current) => ({ ...current, [lot.transaction.id]: Math.min(capacity, Math.max(0, Math.floor(Number(event.target.value) || 0))) }))} /></label>; }) : <p className="text-sm text-foreground/50">{t('tcg.sealed.no_transactions')}</p>}</div></div> : null}
      <div className="grid gap-3 sm:grid-cols-2">{textField(t('tcg.sealed.platform'), 'platform')}{textField(t('tcg.sealed.counterparty'), 'counterparty')}{textField(t('tcg.sealed.storage'), 'storage')}</div><label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.notes')}</span><Textarea className={SEALED_FORM_FOCUS_CLASS} value={form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={4000} /></label>
    </div></div>
    <DialogFooter className="shrink-0"><Button type="button" variant="outline" onClick={onClose}>{t('tcg.sealed.cancel')}</Button><Button type="submit" disabled={busy || !form.cardmarketProductId || (!selectedProduct && !existing)}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{t('tcg.sealed.save')}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

export function SealedPortfolioPage({ view: rawView, productId }: { view: string; productId?: number }) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const language = useClientLanguage();
  const localizedHref = useLocaleHref();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState(todayDay);
  const [rangeGroup, setRangeGroup] = useState<'day' | 'month' | 'year'>('month');
  const [catalogueQuery, setCatalogueQuery] = useState('');
  const [cataloguePage, setCataloguePage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const view: SealedView = rawView === 'product' || (rawView === 'products' && productId) ? 'product' : (['dashboard', 'collection', 'journal', 'sales', 'cashflow', 'analytics', 'catalogue', 'sources'].includes(rawView) ? rawView as SealedView : 'dashboard');
  const ready = mounted && !authLoading && Boolean(user) && syncStatus === 'ready';
  const overview = useQuery<SealedOverviewResponse>({ queryKey: ['tcg-sealed', 'overview', rangeGroup, periodFrom, periodTo], queryFn: ({ signal }) => fetchSealedOverview({ from: periodFrom || undefined, to: periodTo, group: rangeGroup, signal }), enabled: ready });
  const transactions = useQuery({ queryKey: ['tcg-sealed', 'transactions'], queryFn: ({ signal }) => fetchSealedTransactions(true, signal), enabled: ready && ['journal', 'sales'].includes(view) });
  const catalogue = useQuery<SealedCatalogueResponse>({ queryKey: ['tcg-sealed', 'catalogue', catalogueQuery, cataloguePage], queryFn: ({ signal }) => fetchSealedCatalogue(catalogueQuery, cataloguePage, signal), enabled: ready && view === 'catalogue' });
  const sources = useQuery<SealedSourcesResponse>({ queryKey: ['tcg-sealed', 'sources'], queryFn: ({ signal }) => fetchSealedSources(signal), enabled: ready && view === 'sources' });
  const productDetail = useQuery<SealedProductDetailResponse>({ queryKey: ['tcg-sealed', 'product', productId], queryFn: ({ signal }) => fetchSealedProduct(productId as number, signal), enabled: ready && view === 'product' && productId !== undefined });
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['tcg-sealed'] }); };
  const saveMutation = useMutation({ mutationFn: ({ draft, existing }: { draft: SealedTransactionDraft; existing?: SealedTransaction }) => existing ? updateSealedTransaction({ ...existing, ...draft }, overview.data?.revision) : createSealedTransaction(draft, overview.data?.revision), onSuccess: () => { setForm(null); invalidate(); } });
  const voidMutation = useMutation({ mutationFn: (transaction: SealedTransaction) => voidSealedTransaction(transaction, overview.data?.revision), onSuccess: invalidate });
  const syncMutation = useMutation({ mutationFn: syncSealedSources, onSuccess: () => { invalidate(); void queryClient.invalidateQueries({ queryKey: ['tcg-sealed', 'sources'] }); } });
  const transactionProducts = useMemo(() => new Map((overview.data?.positions ?? []).map((position) => [position.product.cardmarketProductId, position.product])), [overview.data?.positions]);
  const openForm = (state: FormState = {}) => setForm(state);
  const changePeriod = (preset: PeriodPreset) => {
    const today = todayDay();
    setPeriodPreset(preset);
    setPeriodTo(today);
    if (preset === 'all') setPeriodFrom('');
    else if (preset === 'year') setPeriodFrom(`${today.slice(0, 4)}-01-01`);
    else if (preset === 'custom') setPeriodFrom('');
    else setPeriodFrom(dayShift(today, -(Number(preset) - 1)));
  };
  const onVoid = (transaction: SealedTransaction) => { if (window.confirm(t('tcg.sealed.cancel_confirm'))) voidMutation.mutate(transaction); };
  const exportFile = async (format: 'json' | 'csv') => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await downloadSealedExport(format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `lunidex-sealed-portfolio.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || !mounted || !user && syncStatus !== 'unauthenticated') return <PageFrame><LoadingState label={t('tcg.sealed.loading')} /></PageFrame>;
  if (!user || syncStatus === 'unauthenticated') return <PageFrame><SyncRequiredPanel /></PageFrame>;
  if (syncStatus !== 'ready') return <PageFrame><SyncStatusPanel status={syncStatus} /></PageFrame>;

  const currentOverview = overview.data;
  const overviewError = overview.error;
  const overviewErrorPresentation = overviewError ? presentSealedError(overviewError, t) : null;
  return <PageFrame>
    <SealedSubnav view={view === 'product' ? 'collection' : view} localizedHref={localizedHref} t={t} />
    <section className="page-header-surface relative mb-6 overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="page-eyebrow">{t('tcg.sealed.eyebrow')}</p>
            <span aria-hidden="true" className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-border/60 bg-background/25 px-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/55"><LockKeyhole className="h-3.5 w-3.5 text-primary" />{t('tcg.sealed.private_badge')}</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{view === 'product' ? t('tcg.sealed.product') : t(`tcg.sealed.${view}`)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/60">{t('tcg.sealed.subtitle')}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-auto xl:justify-end">
          <Button className="w-full sm:w-auto" type="button" onClick={() => openForm()} disabled={Boolean(overviewError && !currentOverview)}><Plus aria-hidden="true" />{t('tcg.sealed.add_transaction')}</Button>
          <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => void syncMutation.mutateAsync()} disabled={syncMutation.isPending}><RefreshCw className={syncMutation.isPending ? 'animate-spin' : ''} aria-hidden="true" />{t('tcg.sealed.sync')}</Button>
          <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={() => void exportFile('csv')} disabled={exporting || Boolean(overviewError && !currentOverview)}><Download aria-hidden="true" />{exporting ? t('tcg.sealed.exporting') : t('tcg.sealed.export_csv')}</Button>
        </div>
      </div>
    </section>
    {!overviewError || currentOverview ? <PeriodBar view={view} preset={periodPreset} from={periodFrom} to={periodTo} t={t} onPreset={changePeriod} onFrom={(value) => { setPeriodPreset('custom'); setPeriodFrom(value); }} onTo={(value) => { setPeriodPreset('custom'); setPeriodTo(value); }} /> : null}
    {overviewError && currentOverview ? <ErrorPanel error={overviewError} compact onRetry={() => void overview.refetch()} t={t} /> : null}
    {overviewError && !currentOverview && overviewErrorPresentation?.unavailable ? <UnavailablePortfolioState t={t} onRetry={() => void overview.refetch()} /> : null}
    {overviewError && !currentOverview && !overviewErrorPresentation?.unavailable ? <ErrorPanel error={overviewError} onRetry={() => void overview.refetch()} t={t} /> : null}
    {syncMutation.error ? <ErrorPanel error={syncMutation.error} onRetry={() => syncMutation.reset()} t={t} /> : null}
    {exportError ? <ErrorPanel error={exportError} onRetry={() => void exportFile('csv')} compact t={t} /> : null}
    {overview.isPending ? <LoadingState label={t('tcg.sealed.loading')} /> : currentOverview ? <>
      {view === 'dashboard' ? <DashboardView data={currentOverview} language={language} t={t} localizedHref={localizedHref} onAdd={() => openForm()} /> : null}
      {view === 'collection' ? <CollectionView data={currentOverview} language={language} t={t} localizedHref={localizedHref} onAdd={(product) => openForm({ product, kind: 'buy' })} /> : null}
      {view === 'journal' ? <JournalView data={currentOverview} transactions={transactions.data?.transactions ?? []} loading={transactions.isPending} error={transactions.error} language={language} t={t} onAdd={() => openForm()} onEdit={(transaction) => openForm({ transaction, product: transactionProducts.get(transaction.cardmarketProductId) })} onVoid={onVoid} onRetry={() => void transactions.refetch()} /> : null}
      {view === 'sales' ? <SalesView data={currentOverview} language={language} t={t} onEdit={(transaction) => openForm({ transaction, product: transactionProducts.get(transaction.cardmarketProductId) })} onVoid={onVoid} /> : null}
      {view === 'cashflow' ? <CashflowView data={currentOverview} language={language} t={t} group={rangeGroup} onGroupChange={setRangeGroup} /> : null}
      {view === 'analytics' ? <AnalyticsView data={currentOverview} language={language} t={t} /> : null}
      {view === 'catalogue' ? <CatalogueView data={catalogue.data} error={catalogue.error} query={catalogueQuery} page={cataloguePage} language={language} t={t} onQuery={(value) => { setCatalogueQuery(value); setCataloguePage(0); }} onPage={setCataloguePage} onAdd={(product) => openForm({ product, kind: 'buy' })} onRetry={() => void catalogue.refetch()} onSync={() => void syncMutation.mutateAsync()} syncing={syncMutation.isPending} loading={catalogue.isPending} /> : null}
      {view === 'sources' ? <SourcesView data={sources.data} loading={sources.isPending} error={sources.error} language={language} t={t} onSync={() => void syncMutation.mutateAsync()} syncing={syncMutation.isPending} onRetry={() => void sources.refetch()} /> : null}
      {view === 'product' ? <ProductView data={productDetail.data} loading={productDetail.isPending} error={productDetail.error} language={language} t={t} localizedHref={localizedHref} onAdd={(product) => openForm({ product, kind: 'buy' })} onEdit={(transaction) => openForm({ transaction, product: productDetail.data?.product })} onVoid={onVoid} onRetry={() => void productDetail.refetch()} /> : null}
    </> : null}
    {!(overviewError && !currentOverview) ? <p className="mt-8 text-center text-xs text-foreground/40">{t('tcg.sealed.private_note')}</p> : null}
    {form ? <TransactionForm state={form} products={catalogue.data?.products ?? []} lots={currentOverview?.lots ?? []} language={language} t={t} onClose={() => setForm(null)} onSave={(draft, existing) => saveMutation.mutate({ draft, existing })} busy={saveMutation.isPending} /> : null}
  </PageFrame>;
}

function PageFrame({ children }: { children: React.ReactNode }) { return <div className="app-page"><Header /><main id="main-content" tabIndex={-1} className="page-shell page-shell--header-offset relative pb-32 outline-none"> <TCGPageTabs /> {children}</main></div>; }
function LoadingState({ label }: { label: string }) {
  return <div className="space-y-4" aria-busy="true" role="status">
    <span className="sr-only">{label}</span>
    <div className="grid gap-3 sm:grid-cols-3"><div className="motion-safe:animate-pulse rounded-xl border border-border/50 bg-card/55 p-5"><div className="h-3 w-24 rounded bg-muted/70" /><div className="mt-6 h-8 w-32 rounded bg-muted/70" /></div><div className="motion-safe:animate-pulse rounded-xl border border-border/50 bg-card/55 p-5"><div className="h-3 w-28 rounded bg-muted/70" /><div className="mt-6 h-8 w-24 rounded bg-muted/70" /></div><div className="motion-safe:animate-pulse rounded-xl border border-border/50 bg-card/55 p-5"><div className="h-3 w-20 rounded bg-muted/70" /><div className="mt-6 h-8 w-28 rounded bg-muted/70" /></div></div>
    <div className="motion-safe:animate-pulse h-64 rounded-xl border border-border/50 bg-card/55" />
  </div>;
}
function ErrorPanel({ error, onRetry, t, compact = false, fallbackMessage }: { error?: unknown; onRetry: () => void; t: (key: string, options?: Record<string, unknown>) => string; compact?: boolean; fallbackMessage?: string }) {
  const presentation = error ? presentSealedError(error, t) : { title: t('tcg.sealed.error_title'), message: fallbackMessage ?? t('tcg.sealed.error_description'), unavailable: false };
  return <div className={`mb-6 rounded-xl border border-destructive/30 bg-destructive/[0.07] ${compact ? 'p-3' : 'p-4'}`} role="alert" aria-live="assertive">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-destructive/30 bg-destructive/10 text-destructive"><AlertTriangle className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="font-bold">{presentation.title}</p><p className="mt-1 text-sm leading-5 text-foreground/65">{presentation.message}</p></div></div>
      <Button type="button" variant="outline" className="w-full sm:w-auto" size="sm" onClick={onRetry}><RefreshCw aria-hidden="true" />{t('tcg.sealed.retry')}</Button>
    </div>
  </div>;
}
function UnavailablePortfolioState({ t, onRetry }: { t: (key: string, options?: Record<string, unknown>) => string; onRetry: () => void }) {
  return <Card className="border-amber-300/30 bg-amber-300/[0.04] p-0">
    <CardContent className="p-0">
      <div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)]">
        <div className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-amber-300/35 bg-amber-300/10 text-amber-200"><CloudOff className="h-6 w-6" aria-hidden="true" /></div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200/80">{t('tcg.sealed.service_status')}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{t('tcg.sealed.unavailable_title')}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">{process.env.NODE_ENV === 'development' ? t('tcg.sealed.local_unavailable_description') : t('tcg.sealed.unavailable_description')}</p>
          <Button type="button" variant="outline" className="mt-6" onClick={onRetry}><RefreshCw aria-hidden="true" />{t('tcg.sealed.retry')}</Button>
        </div>
        <div className="border-t border-border/60 bg-background/15 p-6 md:border-l md:border-t-0 sm:p-8">
          <div className="flex items-start gap-3"><Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" /><div><p className="text-sm font-bold">{t('tcg.sealed.connection_check')}</p><p className="mt-1 text-xs leading-5 text-foreground/55">{t('tcg.sealed.connection_check_pending')}</p></div></div>
          <div className="mt-5 flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-sm font-bold">{t('tcg.sealed.private_badge')}</p><p className="mt-1 text-xs leading-5 text-foreground/55">{t('tcg.sealed.private_note')}</p></div></div>
        </div>
      </div>
    </CardContent>
  </Card>;
}

function DashboardView({ data, language, t, localizedHref, onAdd }: { data: SealedOverviewResponse; language: string; t: (key: string, options?: Record<string, unknown>) => string; localizedHref: (path: string) => string; onAdd: () => void }) {
  const totalTone = data.totals.totalCents === null ? 'default' : data.totals.totalCents >= 0 ? 'positive' : 'negative';
  if (data.totals.bought === 0) return <EmptyPortfolio t={t} localizedHref={localizedHref} onAdd={onAdd} />;
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard icon={WalletCards} label={t('tcg.sealed.value')} value={money(data.totals.valueCents, language)} hint={data.totals.missingPrices ? `${data.totals.missingPrices} ${t('tcg.sealed.missing_prices').toLowerCase()}` : undefined} /><StatCard icon={Boxes} label={t('tcg.sealed.cost')} value={money(data.totals.costCents, language)} /><StatCard icon={TrendingUp} label={t('tcg.sealed.total')} value={money(data.totals.totalCents, language)} tone={totalTone} /><StatCard icon={ShoppingCart} label={t('tcg.sealed.cash_flow')} value={money(data.totals.cashFlowCents, language)} tone={data.totals.cashFlowCents >= 0 ? 'positive' : 'negative'} /><StatCard icon={Package} label={t('tcg.sealed.units')} value={String(data.totals.units)} hint={`${data.totals.distinct} ${t('tcg.sealed.collection').toLowerCase()}`} /></div><div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />{t('tcg.sealed.portfolio')}</CardTitle></CardHeader><CardContent><PortfolioChart history={data.history} language={language} label={t('tcg.sealed.no_history')} chartLabel={t('tcg.sealed.portfolio')} /></CardContent></Card><Card><CardHeader><CardTitle>{t('tcg.sealed.recent_change')}</CardTitle></CardHeader><CardContent className="space-y-3">{data.recent.map((item) => <div key={item.days} className="flex items-center justify-between rounded-sm border border-border/50 bg-background/20 p-3"><span className="text-sm font-bold">{item.days}d</span><span className={`flex items-center gap-1 text-sm font-black ${item.deltaCents !== null && item.deltaCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{item.deltaCents !== null && item.deltaCents >= 0 ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : <ArrowDownRight className="h-4 w-4" aria-hidden="true" />}{money(item.deltaCents, language)}</span></div>)}</CardContent></Card></div><Card><CardHeader><CardTitle>{t('tcg.sealed.period')}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricLine label={t('tcg.sealed.buy')} value={money(data.period.buysCents, language)} /><MetricLine label={t('tcg.sealed.net')} value={money(data.period.netSalesCents, language)} /><MetricLine label={t('tcg.sealed.realized')} value={money(data.period.realizedCents, language)} /><MetricLine label={t('tcg.sealed.cash_flow')} value={money(data.period.cashFlowCents, language)} /></CardContent></Card><PositionTable data={data} language={language} t={t} /></div>;
}

function PositionTable({ data, language, t }: { data: SealedOverviewResponse; language: string; t: (key: string, options?: Record<string, unknown>) => string }) { return <Card><CardHeader><CardTitle>{t('tcg.sealed.collection')}</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border/50 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/45"><tr><th className="px-4 py-3">{t('tcg.sealed.product')}</th><th className="px-4 py-3">{t('tcg.sealed.stock')}</th><th className="px-4 py-3">{t('tcg.sealed.cost')}</th><th className="px-4 py-3">{t('tcg.sealed.value')}</th><th className="px-4 py-3">{t('tcg.sealed.latent')}</th></tr></thead><tbody>{data.positions.filter((position) => position.quantity > 0).slice(0, 12).map((position) => <tr key={`${position.cardmarketProductId}-${position.language}`} className="border-b border-border/35 last:border-0"><td className="px-4 py-3"><div className="flex items-center gap-3"><ProductThumb product={position.product} size="sm" /><span className="max-w-[260px] truncate font-bold">{position.product.alias ?? position.product.name}</span></div></td><td className="px-4 py-3 font-bold">{position.quantity}</td><td className="px-4 py-3">{money(position.costCents, language)}</td><td className="px-4 py-3">{money(position.valueCents, language)}<PriceStatus valuation={position.valuation} t={t} /></td><td className={`px-4 py-3 font-bold ${position.latentCents !== null && position.latentCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(position.latentCents, language)}</td></tr>)}</tbody></table></div>{data.positions.filter((position) => position.quantity > 0).length === 0 ? <p className="p-8 text-center text-sm text-foreground/50">{t('tcg.sealed.no_transactions')}</p> : null}</CardContent></Card>; }

function CollectionView({ data, language, t, localizedHref, onAdd }: { data: SealedOverviewResponse; language: string; t: (key: string, options?: Record<string, unknown>) => string; localizedHref: (path: string) => string; onAdd: (product: SealedProduct) => void }) {
  const [query, setQuery] = useState('');
  const [includeSold, setIncludeSold] = useState(false);
  const [sort, setSort] = useState<'cost' | 'value' | 'latent' | 'quantity'>('cost');
  const positions = data.positions
    .filter((position) => {
      if (!includeSold && position.quantity <= 0) return false;
      const haystack = [position.product.name, position.product.alias, position.product.categoryName, position.product.expansionId, position.cardmarketProductId, position.language].join(' ').toLocaleLowerCase();
      return haystack.includes(query.trim().toLocaleLowerCase());
    })
    .sort((left, right) => {
      const sortValue = (position: SealedOverviewResponse['positions'][number]) => sort === 'cost'
        ? position.costCents
        : sort === 'value'
          ? position.valueCents ?? -Infinity
          : sort === 'latent'
            ? position.latentCents ?? -Infinity
            : position.quantity;
      return sortValue(right) - sortValue(left) || left.product.name.localeCompare(right.product.name);
    });
  return <div>
    <div className="mb-5 flex flex-col gap-3 rounded-sm border border-border/50 bg-background/20 p-3 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1 space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.filter_collection')}</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('tcg.sealed.search')} /></label>
      <label className="space-y-1.5 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.sort_by')}</span><select className="glass-control h-11 w-full px-3 text-sm sm:w-44" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="cost">{t('tcg.sealed.cost')}</option><option value="value">{t('tcg.sealed.value')}</option><option value="latent">{t('tcg.sealed.latent')}</option><option value="quantity">{t('tcg.sealed.quantity')}</option></select></label>
      <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-foreground/65"><input type="checkbox" checked={includeSold} onChange={(event) => setIncludeSold(event.target.checked)} />{t('tcg.sealed.include_sold')}</label>
    </div>
    {positions.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{positions.map((position) => <Card key={`${position.cardmarketProductId}-${position.language}`} className={`p-0 ${position.quantity <= 0 ? 'opacity-60' : ''}`}><CardContent className="flex gap-4 p-4"><ProductThumb product={position.product} size="md" /><div className="min-w-0 flex-1"><p className="truncate font-black">{position.product.alias ?? position.product.name}</p><p className="mt-1 text-xs text-foreground/50">{position.product.categoryName} · {position.language.toUpperCase()}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-[10px] font-black uppercase text-foreground/40">{t('tcg.sealed.stock')}</p><p className="font-black">{position.quantity}</p></div><div><p className="text-[10px] font-black uppercase text-foreground/40">{t('tcg.sealed.value')}</p><p className="font-black">{money(position.valueCents, language)}</p><PriceStatus valuation={position.valuation} t={t} /></div><div><p className="text-[10px] font-black uppercase text-foreground/40">{t('tcg.sealed.cost')}</p><p>{money(position.costCents, language)}</p></div><div><p className="text-[10px] font-black uppercase text-foreground/40">{t('tcg.sealed.latent')}</p><p className={position.latentCents !== null && position.latentCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{money(position.latentCents, language)}</p></div></div><Button type="button" variant="outline" className="mt-4 w-full" onClick={() => onAdd(position.product)}><Plus aria-hidden="true" />{t('tcg.sealed.buy')}</Button></div></CardContent></Card>)}</div> : data.positions.length ? <Card className="border-dashed"><CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center"><Search className="h-8 w-8 text-primary/60" aria-hidden="true" /><p className="mt-4 text-sm font-bold text-foreground/65">{t('tcg.sealed.no_matches')}</p><p className="mt-2 text-sm text-foreground/50">{t('tcg.sealed.clear_filters_hint')}</p></CardContent></Card> : <EmptyPortfolio t={t} localizedHref={localizedHref} />}
  </div>;
}

function JournalView({ data, transactions, loading, error, language, t, onAdd, onEdit, onVoid, onRetry }: { data: SealedOverviewResponse; transactions: SealedTransaction[]; loading: boolean; error: unknown; language: string; t: (key: string, options?: Record<string, unknown>) => string; onAdd: () => void; onEdit: (transaction: SealedTransaction) => void; onVoid: (transaction: SealedTransaction) => void; onRetry: () => void }) {
  const [query, setQuery] = useState('');
  if (loading) return <LoadingState label={t('tcg.sealed.loading')} />;
  if (error) return <ErrorPanel error={error} onRetry={onRetry} t={t} />;
  const byId = new Map(data.positions.map((position) => [position.cardmarketProductId, position.product]));
  const visibleTransactions = transactions.filter((transaction) => {
    if (transaction.date < data.period.from || transaction.date > data.period.to) return false;
    const product = byId.get(transaction.cardmarketProductId);
    const haystack = [product?.name, product?.alias, transaction.platform, transaction.counterparty, transaction.notes, transaction.cardmarketProductId, transaction.language].join(' ').toLocaleLowerCase();
    return haystack.includes(query.trim().toLocaleLowerCase());
  });
  return <Card><CardHeader><CardTitle className="flex items-center justify-between gap-3"><span>{t('tcg.sealed.journal')}</span><Button type="button" size="sm" onClick={onAdd}><Plus aria-hidden="true" />{t('tcg.sealed.add_transaction')}</Button></CardTitle></CardHeader><CardContent className="p-0"><div className="border-b border-border/50 p-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('tcg.sealed.search')} aria-label={t('tcg.sealed.search')} /></div>{visibleTransactions.length ? visibleTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} product={byId.get(transaction.cardmarketProductId)} language={language} t={t} onEdit={() => onEdit(transaction)} onVoid={() => onVoid(transaction)} />) : <p className="p-10 text-center text-sm text-foreground/50">{t('tcg.sealed.no_transactions')}</p>}</CardContent></Card>;
}

function SalesView({ data, language, t, onEdit, onVoid }: { data: SealedOverviewResponse; language: string; t: (key: string, options?: Record<string, unknown>) => string; onEdit: (transaction: SealedTransaction) => void; onVoid: (transaction: SealedTransaction) => void }) {
  const productById = new Map(data.positions.map((position) => [position.cardmarketProductId, position.product]));
  const sales = data.sales.filter((sale) => sale.transaction.date >= data.period.from && sale.transaction.date <= data.period.to);
  const soldUnits = sales.reduce((total, sale) => total + sale.transaction.quantity, 0);
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-3"><StatCard icon={TrendingUp} label={t('tcg.sealed.realized')} value={money(data.period.realizedCents, language)} tone={data.period.realizedCents >= 0 ? 'positive' : 'negative'} /><StatCard icon={ShoppingCart} label={t('tcg.sealed.sold')} value={String(soldUnits)} /><StatCard icon={BarChart3} label={t('tcg.sealed.roi')} value={percent(data.totals.roi)} /></div><Card><CardHeader><CardTitle>{t('tcg.sealed.sales')}</CardTitle></CardHeader><CardContent className="p-0">{sales.length ? sales.map((sale) => { const product = productById.get(sale.transaction.cardmarketProductId); return <div key={sale.transaction.id} className="grid gap-3 border-b border-border/50 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_120px_120px_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-bold">{product?.alias ?? product?.name ?? `#${sale.transaction.cardmarketProductId}`}</p><p className="mt-1 text-xs text-foreground/45">{dateLabel(sale.transaction.date, language)} · {sale.transaction.quantity} {t('tcg.sealed.units').toLowerCase()} · {sale.transaction.allocationMethod.toUpperCase()}</p></div><span className="text-sm text-foreground/65">{t('tcg.sealed.gross')} {money(sale.grossCents, language)}</span><span className="text-sm text-foreground/65">{t('tcg.sealed.net')} {money(sale.netCents, language)}</span><span className={sale.profitCents >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'}>{money(sale.profitCents, language)}<span className="ml-1 text-xs">({percent(sale.roi)})</span></span><div className="flex gap-2 sm:justify-end"><Button variant="ghost" size="icon-sm" className="min-h-11 min-w-11" type="button" onClick={() => onEdit(sale.transaction)} aria-label={t('tcg.sealed.edit')} title={t('tcg.sealed.edit')}><Pencil aria-hidden="true" /></Button><Button variant="ghost" size="icon-sm" className="min-h-11 min-w-11" type="button" onClick={() => onVoid(sale.transaction)} aria-label={t('tcg.sealed.void')} title={t('tcg.sealed.void')}><Ban aria-hidden="true" /></Button></div></div>; }) : <p className="p-10 text-center text-sm text-foreground/50">{t('tcg.sealed.no_transactions')}</p>}</CardContent></Card></div>;
}

function CashflowView({ data, language, t, group, onGroupChange }: { data: SealedOverviewResponse; language: string; t: (key: string, options?: Record<string, unknown>) => string; group: 'day' | 'month' | 'year'; onGroupChange: (group: 'day' | 'month' | 'year') => void }) { return <div className="space-y-6"><div className="flex justify-end"><label className="flex items-center gap-2 text-xs font-bold text-foreground/55">{t('tcg.sealed.period')}<select className="glass-control h-10 px-3 text-sm" value={group} onChange={(event) => onGroupChange(event.target.value as typeof group)}><option value="month">{t('tcg.sealed.month')}</option><option value="day">{t('tcg.sealed.day')}</option><option value="year">{t('tcg.sealed.year')}</option></select></label></div><div className="grid gap-3 sm:grid-cols-3"><StatCard icon={ArrowDownRight} label={t('tcg.sealed.invested')} value={money(data.period.buysCents, language)} tone="negative" /><StatCard icon={ArrowUpRight} label={t('tcg.sealed.recovered')} value={money(data.period.netSalesCents, language)} tone="positive" /><StatCard icon={WalletCards} label={t('tcg.sealed.cash_flow')} value={money(data.period.cashFlowCents, language)} tone={data.period.cashFlowCents >= 0 ? 'positive' : 'negative'} /></div><Card><CardHeader><CardTitle>{t('tcg.sealed.cashflow')}</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-border/50 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/45"><tr><th className="px-4 py-3">{t('tcg.sealed.period')}</th><th className="px-4 py-3">{t('tcg.sealed.buy')}</th><th className="px-4 py-3">{t('tcg.sealed.sell')}</th><th className="px-4 py-3">{t('tcg.sealed.cash_flow')}</th><th className="px-4 py-3">{t('tcg.sealed.stock_cost')}</th></tr></thead><tbody>{data.cashflow.map((row) => <tr key={row.period} className="border-b border-border/35"><td className="px-4 py-3 font-bold">{row.period}</td><td className="px-4 py-3 text-rose-300">{money(row.buysCents + row.buyFeesCents - row.discountCents, language)}</td><td className="px-4 py-3 text-emerald-300">{money(row.netSalesCents, language)}</td><td className={`px-4 py-3 font-bold ${row.netCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(row.netCents, language)}</td><td className="px-4 py-3">{money(row.stockCostCents, language)}</td></tr>)}</tbody></table></div>{!data.cashflow.length ? <p className="p-10 text-center text-sm text-foreground/50">{t('tcg.sealed.no_transactions')}</p> : null}</CardContent></Card></div>; }

function AnalyticsView({ data, language, t }: { data: SealedOverviewResponse; language: string; t: (key: string, options?: Record<string, unknown>) => string }) { return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard icon={TrendingUp} label={t('tcg.sealed.roi')} value={percent(data.totals.roi)} tone={data.totals.roi !== null && data.totals.roi >= 0 ? 'positive' : 'negative'} /><StatCard icon={CalendarDays} label={t('tcg.sealed.holding_days')} value={data.totals.holdingDays === null ? '—' : `${data.totals.holdingDays.toFixed(0)} d`} /><StatCard icon={BarChart3} label={t('tcg.sealed.winning_sales')} value={percent(data.totals.winningSales)} /><StatCard icon={Boxes} label={t('tcg.sealed.sell_through')} value={percent(data.totals.sellThrough)} /></div><Card><CardHeader><CardTitle>{t('tcg.sealed.analytics')}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><MetricLine label={t('tcg.sealed.average_entry')} value={money(data.totals.averageEntryCents, language)} /><MetricLine label={t('tcg.sealed.average_exit')} value={money(data.totals.averageExitCents, language)} /><MetricLine label={t('tcg.sealed.profit')} value={money(data.totals.profitPerSoldUnitCents, language)} /><MetricLine label={t('tcg.sealed.buy_fees')} value={money(data.totals.buyFeesCents, language)} /><MetricLine label={t('tcg.sealed.sell_fees')} value={money(data.totals.sellFeesCents, language)} /><MetricLine label={t('tcg.sealed.missing_prices')} value={String(data.totals.missingPrices)} /></CardContent></Card><Card><CardHeader><CardTitle>{t('tcg.sealed.recent_change')}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{data.positions.filter((position) => position.quantity > 0).slice(0, 9).map((position) => <div key={`${position.cardmarketProductId}-${position.language}`} className="flex items-center justify-between gap-3 rounded-sm border border-border/50 p-3"><span className="min-w-0 truncate text-sm font-bold">{position.product.name}</span><span className={position.changes['7']?.percent !== undefined && position.changes['7']!.percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{percent(position.changes['7']?.percent)}</span></div>)}</CardContent></Card></div>; }
function MetricLine({ label, value }: { label: string; value: string }) { return <div className="rounded-sm border border-border/50 bg-background/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-foreground/45">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>; }

function CatalogueView({ data, error, query, page, language, t, onQuery, onPage, onAdd, onRetry, onSync, syncing, loading }: { data?: SealedCatalogueResponse; error: unknown; query: string; page: number; language: string; t: (key: string, options?: Record<string, unknown>) => string; onQuery: (value: string) => void; onPage: (page: number) => void; onAdd: (product: SealedProduct) => void; onRetry: () => void; onSync: () => void; syncing: boolean; loading: boolean }) {
  if (error) return <ErrorPanel error={error} onRetry={onRetry} t={t} />;
  return <div className="space-y-5"><div className="flex gap-2"><div className="relative min-w-0 flex-1"><Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t('tcg.sealed.search')} aria-label={t('tcg.sealed.search')} /><Search className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-foreground/35" aria-hidden="true" /></div>{loading ? <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" aria-label={t('tcg.sealed.loading')} /> : null}</div>{data?.products.length ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.products.map((product) => <Card key={product.cardmarketProductId} className="p-0"><CardContent className="flex gap-3 p-3"><ProductThumb product={product} size="md" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black">{product.name}</p><p className="mt-1 text-xs text-foreground/45">{product.categoryName} · {product.expansionId}</p><div className="mt-3 text-sm font-bold">{money(data.prices.find((price) => price.cardmarketProductId === product.cardmarketProductId)?.metrics.trendCents ?? null, language)}</div><Button type="button" size="sm" className="mt-3 w-full" onClick={() => onAdd(product)}><Plus aria-hidden="true" />{t('tcg.sealed.buy')}</Button></div></CardContent></Card>)}</div><div className="flex items-center justify-between"><Button type="button" variant="outline" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}>←</Button><span className="text-xs font-bold text-foreground/50">{page + 1} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button type="button" variant="outline" onClick={() => onPage(page + 1)} disabled={(page + 1) * data.pageSize >= data.total}>→</Button></div></> : <Card className="border-dashed"><CardContent className="flex flex-col items-center py-14 text-center"><Database className="h-10 w-10 text-primary/60" aria-hidden="true" /><p className="mt-4 text-sm text-foreground/55">{data ? t('tcg.sealed.no_catalogue') : t('tcg.sealed.catalogue_hint')}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Button variant="outline" type="button" onClick={onRetry}><RefreshCw aria-hidden="true" />{t('tcg.sealed.retry')}</Button><Button type="button" onClick={onSync} disabled={syncing}><RefreshCw className={syncing ? 'animate-spin' : ''} aria-hidden="true" />{t('tcg.sealed.sync')}</Button></div></CardContent></Card>}</div>;
}

function SourcesView({ data, loading, error, language, t, onSync, syncing, onRetry }: { data?: SealedSourcesResponse; loading: boolean; error: unknown; language: string; t: (key: string, options?: Record<string, unknown>) => string; onSync: () => void; syncing: boolean; onRetry: () => void }) { if (loading) return <LoadingState label={t('tcg.sealed.loading')} />; if (error) return <ErrorPanel error={error} onRetry={onRetry} t={t} />; return <div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center justify-between gap-3"><span>{t('tcg.sealed.sources')}</span><Button type="button" onClick={onSync} disabled={syncing}><RefreshCw className={syncing ? 'animate-spin' : ''} aria-hidden="true" />{t('tcg.sealed.sync')}</Button></CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><SourceRow label={t('tcg.sealed.source_catalogue')} value={data?.sources.catalogue ?? '—'} /><SourceRow label={t('tcg.sealed.source_prices')} value={data?.sources.prices ?? '—'} /><SourceRow label={t('tcg.sealed.catalogue')} value={String(data?.catalogueCount ?? 0)} /><SourceRow label={t('tcg.sealed.market_price')} value={String(data?.priceCount ?? 0)} /><SourceRow label={t('tcg.sealed.last_sync')} value={dateLabel(data?.fetchedAt, language)} /><SourceRow label={t('tcg.sealed.official_source')} value={t('tcg.sealed.official_source')} /></CardContent></Card><Card><CardHeader><CardTitle>{t('tcg.sealed.journal')}</CardTitle></CardHeader><CardContent className="space-y-2">{data?.sync.length ? data.sync.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border/50 p-3 text-sm"><span>{dateLabel(run.startedAt, language)}</span><Badge variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>{run.status}</Badge></div>) : <p className="text-sm text-foreground/50">{t('tcg.sealed.not_synced')}</p>}</CardContent></Card></div>; }
function SourceRow({ label, value }: { label: string; value: string }) { return <div className="rounded-sm border border-border/50 bg-background/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-foreground/45">{label}</p><p className="mt-2 break-all text-sm font-bold">{value}</p></div>; }

function AliasEditor({ product, t }: { product: SealedProduct; t: (key: string, options?: Record<string, unknown>) => string }) {
  const queryClient = useQueryClient();
  const [alias, setAlias] = useState(product.alias ?? '');
  const mutation = useMutation({
    mutationFn: () => updateSealedAlias(product.cardmarketProductId, alias.trim() || null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tcg-sealed'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tcg.sealed.alias')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Input
            value={alias}
            maxLength={512}
            onChange={(event) => setAlias(event.target.value)}
            placeholder={product.name}
            aria-label={t('tcg.sealed.alias')}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {t('tcg.sealed.save_alias')}
          </Button>
        </form>
        {mutation.error instanceof Error ? <p className="mt-3 text-sm text-rose-300" role="alert">{mutation.error.message}</p> : null}
      </CardContent>
    </Card>
  );
}

function ProductView({ data, loading, error, language, t, localizedHref, onAdd, onEdit, onVoid, onRetry }: { data?: SealedProductDetailResponse; loading: boolean; error: unknown; language: string; t: (key: string, options?: Record<string, unknown>) => string; localizedHref: (path: string) => string; onAdd: (product: SealedProduct) => void; onEdit: (transaction: SealedTransaction) => void; onVoid: (transaction: SealedTransaction) => void; onRetry: () => void }) {
  if (loading) return <LoadingState label={t('tcg.sealed.loading')} />;
  if (error || !data) return <ErrorPanel error={error} fallbackMessage={t('tcg.sealed.load_error')} onRetry={onRetry} t={t} />;
  const stock = data.positions.reduce((total, position) => total + position.quantity, 0);
  const cost = data.positions.reduce((total, position) => total + position.costCents, 0);
  const value = data.positions.some((position) => position.quantity > 0 && position.valueCents === null)
    ? null
    : data.positions.reduce((total, position) => total + (position.valueCents ?? 0), 0);
  const latent = value === null ? null : value - cost;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(240px,320px)]">
        <ProductThumb product={data.product} size="lg" />
        <div>
          <Link href={localizedHref('/tcg/sealed/collection')} className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('tcg.sealed.back_to_collection')}</Link>
          <p className="page-eyebrow mt-3">{data.product.categoryName}</p>
          <h2 className="mt-2 text-2xl font-black">{data.product.name}</h2>
          <p className="mt-2 text-sm text-foreground/55">{t('tcg.sealed.expansion')} {data.product.expansionId} · {t('tcg.sealed.id')} {data.product.cardmarketProductId}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={() => onAdd(data.product)}><Plus aria-hidden="true" />{t('tcg.sealed.buy')}</Button>
            <a href={data.product.cardmarketUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}><ExternalLink aria-hidden="true" />Cardmarket</a>
          </div>
        </div>
        <Card className="p-0">
          <CardContent className="grid grid-cols-2 gap-4 p-4">
            <div><MetricLine label={t('tcg.sealed.market_price')} value={money(data.valuation.priceCents, language)} /><PriceStatus valuation={data.valuation} t={t} /></div>
            <MetricLine label={t('tcg.sealed.stock')} value={String(stock)} />
            <MetricLine label={t('tcg.sealed.value')} value={money(value, language)} />
            <MetricLine label={t('tcg.sealed.latent')} value={money(latent, language)} />
          </CardContent>
        </Card>
      </div>
      <AliasEditor key={data.product.cardmarketProductId} product={data.product} t={t} />
      <Card>
        <CardHeader><CardTitle>{t('tcg.sealed.price_history')}</CardTitle></CardHeader>
        <CardContent><ProductPriceHistoryChart prices={data.prices} transactions={data.transactions} language={language} t={t} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('tcg.sealed.journal')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.transactions.length
            ? data.transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} product={data.product} language={language} t={t} onEdit={() => onEdit(transaction)} onVoid={() => onVoid(transaction)} />)
            : <p className="p-10 text-center text-sm text-foreground/50">{t('tcg.sealed.no_transactions')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
