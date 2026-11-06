'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePriceHistory, computePriceTrend } from '@/hooks/usePriceHistory';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGPriceVariant } from '@/lib/tcg-qualified-price-history';
import { cn } from '@/lib/utils';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';

interface PriceChartProps {
  cardId: string;
  language: TCGCardLanguage;
}

type Days = 7 | 30 | 90;

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function formatTimestamp(iso: string, locale: string): string | null {
  const timestamp = new Date(iso);
  if (!Number.isFinite(timestamp.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
}

function TrendBadge({ pct, label }: { pct: number | null; label: string }) {
  if (pct == null) return null;
  const isPositive = pct > 0;
  const isNeutral = Math.abs(pct) < 0.5;
  return <span className={cn(
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
    isNeutral ? 'bg-foreground/10 text-muted-foreground' : isPositive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' : 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
  )}>
    {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
    {label} {isPositive ? '+' : ''}{pct.toFixed(1)}%
  </span>;
}

function PriceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="glass-surface rounded-xl border border-border/70 bg-card px-3 py-2 text-xs shadow-[var(--shadow-pixel-sm)]">
    <p className="mb-1 font-bold text-muted-foreground">{label}</p>
    <p className="font-semibold text-primary">{formatCurrency(payload[0].value)}</p>
  </div>;
}

function PriceChartSkeleton() {
  return <div className="animate-pulse space-y-3 rounded-2xl border border-border/55 bg-background/20 p-4 sm:p-5">
    <div className="flex items-center justify-between"><div className="h-4 w-36 rounded-lg bg-foreground/10" /><div className="flex gap-1">{[7, 30, 90].map((d) => <div key={d} className="h-11 w-11 rounded-lg bg-foreground/10" />)}</div></div>
    <div className="h-48 w-full rounded-xl bg-foreground/5" />
  </div>;
}

export function PriceChart({ cardId, language }: PriceChartProps) {
  const [days, setDays] = useState<Days>(30);
  const [requestedVariant, setRequestedVariant] = useState<TCGPriceVariant>('normal');
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const { data: history, historyStatus, availableVariants, selectedVariant, isPending, isError } = usePriceHistory(cardId, language, requestedVariant, days);
  if (isPending) return <PriceChartSkeleton />;

  const variantLabel = (variant: TCGPriceVariant) => t(`tcg.price_history_variant_${variant}`);
  const daysButtons: Array<{ label: string; value: Days }> = [
    { label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: '90d', value: 90 },
  ];
  const errorMessage = isError || historyStatus === 'unavailable' || historyStatus === 'empty'
    ? t('tcg.price_history_unavailable')
    : historyStatus === 'unqualified-history'
      ? t('tcg.price_history_unqualified')
      : historyStatus === 'insufficient-data'
        ? t('tcg.price_history_insufficient')
        : null;

  const latest = history?.at(-1);
  const latestSnapshotLabel = latest ? formatTimestamp(latest.source_observed_at, interfaceLanguage) : null;
  const trend = computePriceTrend(history ?? []);
  const chartData = (history ?? []).map((entry) => ({
    date: formatDate(entry.source_observed_at, interfaceLanguage),
    rawDate: entry.source_observed_at,
    value: entry.value,
  }));

  return <section className="space-y-4 rounded-2xl border border-border/55 bg-background/20 p-4 sm:p-5">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('tcg.price_history')}</h3>
      <TrendBadge pct={trend.eurChange} label="EUR" />
      {availableVariants.length > 1 ? <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <span>{t('tcg.price_history_variant')}</span>
        <select value={selectedVariant} onChange={(event) => setRequestedVariant(event.currentTarget.value as TCGPriceVariant)} className="glass-control h-11 rounded-lg px-3 text-xs text-foreground">
          {availableVariants.map((variant) => <option key={variant} value={variant}>{variantLabel(variant)}</option>)}
        </select>
      </label> : null}
      <div className="ml-auto flex gap-1">
        {daysButtons.map(({ label, value }) => <button key={value} type="button" onClick={() => setDays(value)} aria-pressed={days === value} className={cn(
          'touch-target min-w-11 rounded-lg border px-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          days === value ? 'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-pixel-sm)]' : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-card/70 hover:text-foreground',
        )}>{label}</button>)}
      </div>
    </div>

    {errorMessage ? <div role="status" className="rounded-xl border border-border/45 bg-card/20 px-5 py-6 text-center text-xs text-muted-foreground">{errorMessage}</div> : <div className="rounded-xl border border-border/45 bg-card/20 p-3">
      <ResponsiveContainer width="100%" height={192}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} width={64} />
          <Tooltip content={<PriceTooltip />} />
          <Line type="monotone" dataKey="value" name={t('tcg.price_history_metric')} stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>}

    <div className="space-y-1 text-right text-[11px] text-muted-foreground">
      <p>{t('tcg.price_history_metric')} · {t(`tcg.price_history_variant_${selectedVariant}`)}</p>
      <p>{t('tcg.price_history_scope')}</p>
      {latestSnapshotLabel ? <p>{t('tcg.price_history_last_snapshot', { date: latestSnapshotLabel })}</p> : null}
      <p>{t('tcg.price_history_capture_note')}</p>
    </div>
  </section>;
}
