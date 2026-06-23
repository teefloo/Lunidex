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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  return `$${value.toFixed(2)}`;
}

function toChartData(history: PriceHistoryEntry[]) {
  return history.map((entry) => ({
    date: formatDate(entry.recorded_at),
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
          ? 'bg-foreground/10 text-foreground/60'
          : isPositive
            ? 'bg-green-500/15 text-green-500'
            : 'bg-red-500/15 text-red-400',
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
    <div className="glass-surface rounded-xl border border-foreground/10 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-foreground/70">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="font-semibold">
          {item.name}: {item.value != null ? `${item.name === 'EUR' ? '€' : '$'}${item.value.toFixed(2)}` : '—'}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PriceChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-foreground/10" />
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <div key={d} className="h-7 w-10 rounded-lg bg-foreground/10" />
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
  const { data: history, isPending, isError } = usePriceHistory(cardId, days);

  if (isPending) return <PriceChartSkeleton />;

  if (isError || !history || history.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-6 text-center text-xs text-foreground/40">
        No price history available yet. Data is collected every 6 hours.
      </div>
    );
  }

  const chartData = toChartData(history);
  const trend = computePriceTrend(history);

  const DAY_BUTTONS: { label: string; value: Days }[] = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-foreground/50">
          Price History
        </span>

        <div className="flex items-center gap-1.5">
          <TrendBadge pct={trend.usdChange} label="USD" />
          <TrendBadge pct={trend.eurChange} label="EUR" />
        </div>

        {/* Day toggle */}
        <div className="ml-auto flex gap-1">
          {DAY_BUTTONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
                days === value
                  ? 'bg-primary text-white'
                  : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/15',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
        <ResponsiveContainer width="100%" height={192}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="usd"
              name="USD"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="eur"
              name="EUR"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data source note */}
      <p className="text-right text-[10px] text-foreground/30">
        TCGPlayer (USD) · Cardmarket (EUR) · updated every 6h
      </p>
    </div>
  );
}
