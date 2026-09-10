'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePriceHistory, computePriceTrend, type PriceHistoryEntry } from '@/hooks/usePriceHistory';
import { cn } from '@/lib/utils';
import { usePrimeDexStore } from '@/store/primedex';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceChartProps {
  cardId: string;
}

type Days = 7 | 30 | 90;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function toChartData(history: PriceHistoryEntry[], locale: string) {
  return history.map((entry) => ({
    date: formatDate(entry.recorded_at, locale),
    rawDate: entry.recorded_at,
    usd: entry.tcgplayer_mid ?? entry.tcgplayer_low ?? null,
    eur: entry.cardmarket_trend ?? entry.cardmarket_avg ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TrendBadgeProps {
  pct: number | null;
  label: string;
}

function TrendBadge({ pct, label }: TrendBadgeProps) {
  if (pct == null) return null;

  const isPositive = pct > 0;
  const isNeutral = Math.abs(pct) < 0.5;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
        isNeutral
          ? 'bg-foreground/10 text-muted-foreground'
          : isPositive
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
            : 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
      )}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {label} {isPositive ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-surface rounded-xl border border-border/70 bg-card px-3 py-2 text-xs shadow-[var(--shadow-pixel-sm)]">
      <p className="mb-1 font-bold text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="font-semibold">
          {item.name}: {item.value != null ? formatChartAmount(item.value, item.name) : '—'}
        </p>
      ))}
    </div>
  );
}

function formatChartAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PriceChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-border/55 bg-background/20 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded-lg bg-foreground/10" />
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <div key={d} className="h-11 w-11 rounded-lg bg-foreground/10" />
          ))}
        </div>
      </div>
      <div className="h-48 w-full rounded-xl bg-foreground/5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PriceChart({ cardId }: PriceChartProps) {
  const [days, setDays] = useState<Days>(30);
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const { data: history, isPending, isError } = usePriceHistory(cardId, days);

  if (isPending) return <PriceChartSkeleton />;

  if (isError || !history || history.length === 0) {
    return (
      <div className="rounded-2xl border border-border/55 bg-background/20 px-5 py-6 text-center text-xs text-muted-foreground">
        {t('tcg.price_history_unavailable')}
      </div>
    );
  }

  const chartData = toChartData(history, interfaceLanguage);
  const trend = computePriceTrend(history);
  const chartKey: 'usd' | 'eur' = displayCurrency === 'EUR' ? 'eur' : 'usd';
  const hasSelectedCurrencyHistory = chartData.some((entry) => entry[chartKey] != null);

  if (!hasSelectedCurrencyHistory) {
    return (
      <div className="rounded-2xl border border-border/55 bg-background/20 px-5 py-6 text-center text-xs text-muted-foreground">
        {t('tcg.price_history_unavailable')}
      </div>
    );
  }

  const DAY_BUTTONS: { label: string; value: Days }[] = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-border/55 bg-background/20 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {t('tcg.price_history')}
        </h3>

        <div className="flex items-center gap-1.5">
          <TrendBadge pct={displayCurrency === 'EUR' ? trend.eurChange : trend.usdChange} label={displayCurrency} />
        </div>

        {/* Day toggle */}
        <div className="ml-auto flex gap-1">
          {DAY_BUTTONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={days === value}
              className={cn(
                'touch-target min-w-11 rounded-lg border px-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                days === value
                  ? 'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-pixel-sm)]'
                  : 'border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-card/70 hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/45 bg-card/20 p-3">
        <ResponsiveContainer width="100%" height={192}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatChartAmount(v, displayCurrency)}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ color: 'var(--muted-foreground)', fontSize: 11, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey={chartKey}
              name={displayCurrency}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data source note */}
      <p className="text-right text-[11px] text-muted-foreground">
        {t('tcg.price_history_sources')}
      </p>
    </section>
  );
}
