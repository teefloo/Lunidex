'use client';

import { useMemo, useState } from 'react';
import { Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { useClientLanguage } from '@/hooks/useLocaleHref';

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getColorLevel(count: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  if (count <= 20) return 4;
  return 5;
}

const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-muted/30',
  1: 'bg-primary/15',
  2: 'bg-primary/30',
  3: 'bg-primary/50',
  4: 'bg-primary/70',
  5: 'bg-primary',
};

function getMonthLabels(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, i, 1)),
  );
}

function getDayLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 7 + i)),
  );
}

interface HeatMapCell {
  date: Date;
  dateKey: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4 | 5;
}

interface Week {
  monthLabel: string;
  cells: (HeatMapCell | null)[];
}

function computeGrid(actions: { date: string }[], monthLabels: string[]): {
  weeks: Week[];
  totalCount: number;
  mostActiveDay: { date: string; count: number } | null;
  currentStreak: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts: Record<string, number> = {};
  for (const action of actions) {
    const key = toKey(new Date(action.date));
    counts[key] = (counts[key] || 0) + 1;
  }

  // Start 364 days ago (52 complete weeks), aligned to previous Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);

  // Build weeks
  const weeks: Week[] = [];
  const cursor = new Date(startDate);
  let prevMonth = -1;

  while (cursor <= today) {
    const cells: (HeatMapCell | null)[] = [];

    // Fill 7 day slots per week
    for (let day = 0; day < 7; day++) {
      if (cursor > today) {
        cells.push(null);
      } else {
        const key = toKey(cursor);
        const count = counts[key] || 0;
        cells.push({
          date: new Date(cursor),
          dateKey: key,
          count,
          level: getColorLevel(count),
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Determine month label from the first non-null cell
    const firstCell = cells.find((c): c is HeatMapCell => c !== null);
    const weekMonth = firstCell ? firstCell.date.getMonth() : -1;
    const showMonth = weekMonth !== prevMonth && weekMonth !== -1;
    if (showMonth) prevMonth = weekMonth;

    weeks.push({
      monthLabel: showMonth ? monthLabels[weekMonth] : '',
      cells,
    });
  }

  // Stats
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  let mostActiveDay: { date: string; count: number } | null = null;
  let maxCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = { date: key, count };
    }
  }

  // Current streak: consecutive days from today backwards
  let currentStreak = 0;
  const streakCursor = new Date(today);
  while (counts[toKey(streakCursor)] && counts[toKey(streakCursor)] > 0) {
    currentStreak++;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  return { weeks, totalCount, mostActiveDay, currentStreak };
}

export default function ActivityHeatMap() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const recentActions = usePrimeDexStore((s) => s.recentActions);
  const _hasHydrated = usePrimeDexStore((s) => s._hasHydrated);
  const locale = useClientLanguage();

  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null);

  const monthLabels = useMemo(() => getMonthLabels(locale), [locale]);
  const dayLabels = useMemo(() => getDayLabels(locale), [locale]);

  const { weeks, totalCount, mostActiveDay, currentStreak } = useMemo(
    () => computeGrid(recentActions, monthLabels),
    [recentActions, monthLabels],
  );

  if (!mounted || !_hasHydrated) {
    return (
      <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <h2 id="dashboard-activity-heatmap-title" className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
          <Grid3X3 className="w-3.5 h-3.5 text-primary" />
          {t('dashboard.activity_heatmap.title')}
        </h2>
        <div className="h-32 animate-pulse rounded-sm bg-muted/20" />
      </div>
    );
  }

  if (recentActions.length === 0) {
    return (
      <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <h2 id="dashboard-activity-heatmap-title" className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
          <Grid3X3 className="w-3.5 h-3.5 text-primary" />
          {t('dashboard.activity_heatmap.title')}
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Grid3X3 className="w-10 h-10 text-foreground/20" />
          </div>
          <p className="text-sm font-semibold text-foreground/50">{t('dashboard.activity_heatmap.no_activity')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      <h2 id="dashboard-activity-heatmap-title" className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
        <Grid3X3 className="w-3.5 h-3.5 text-primary" />
        {t('dashboard.activity_heatmap.title')}
      </h2>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-sm border border-border/50 bg-card/50">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">
            {t('dashboard.activity_heatmap.total_actions')}
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">{totalCount}</p>
        </div>
        <div className="p-3 rounded-sm border border-border/50 bg-card/50">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">
            {t('dashboard.activity_heatmap.most_active')}
          </p>
          {mostActiveDay ? (
            <>
              <p className="text-sm font-black text-foreground tabular-nums">
                {mostActiveDay.count}
              </p>
              <p className="text-xs font-medium text-foreground/40">{mostActiveDay.date}</p>
            </>
          ) : (
            <p className="text-xl font-black text-foreground tabular-nums">-</p>
          )}
        </div>
        <div className="p-3 rounded-sm border border-border/50 bg-card/50">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">
            {t('dashboard.activity_heatmap.streak')}
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {currentStreak}
            <span className="text-xs font-bold text-foreground/40 ml-1">
              {t('dashboard.activity_heatmap.days')}
            </span>
          </p>
        </div>
      </div>

      {/* Heat map grid */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="relative">
          {/* Month labels */}
          <div className="flex gap-[2px] ml-8 mb-1">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="text-[11px] font-bold text-foreground/30 text-center"
                style={{ width: 12 }}
              >
                {week.monthLabel}
              </div>
            ))}
          </div>

          {/* Grid with day labels */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-1">
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end pr-1"
                  style={{ height: 12 }}
                >
                  <span className="text-[11px] font-bold text-foreground/30">
                    {i % 2 === 1 ? label.slice(0, 2) : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="flex gap-[2px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.cells.map((cell, ci) =>
                    cell ? (
                      <div
                        key={ci}
                        className={cn(
                          'rounded-[2px] cursor-pointer transition-transform hover:scale-150 hover:z-10',
                          LEVEL_CLASSES[cell.level],
                        )}
                        style={{ width: 12, height: 12 }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            date: cell.dateKey,
                            count: cell.count,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    ) : (
                      <div
                        key={ci}
                        style={{ width: 12, height: 12 }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-md bg-popover text-popover-foreground border border-border shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="text-[11px] font-bold tabular-nums">
            {t('dashboard.activity_heatmap.tooltip_count', { count: tooltip.count })}
          </p>
          <p className="text-[11px] text-foreground/50">{tooltip.date}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-[11px] font-bold text-foreground/30">{t('dashboard.activity_heatmap.less')}</span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn('rounded-[2px]', LEVEL_CLASSES[level])}
            style={{ width: 12, height: 12 }}
          />
        ))}
        <span className="text-[11px] font-bold text-foreground/30">{t('dashboard.activity_heatmap.more')}</span>
      </div>
    </div>
  );
}
