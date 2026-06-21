'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  BrainCircuit,
  Trophy,
  Flame,
  CheckCircle2,
  BarChart3,
  Gamepad2,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { DashboardData } from '@/types/dashboard';
import { useMounted } from '@/hooks/useMounted';

const LineChart = dynamic(() => import('recharts').then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div className="relative p-3 md:p-4 rounded-sm border border-border/50 bg-card/50 flex items-center gap-3 group hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-300">
      <div className={cn(
        'p-2 rounded-lg shrink-0 transition-colors duration-300',
        accent ? accent : 'bg-primary/10 text-primary'
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50">{label}</p>
        <p className="text-lg md:text-xl font-black text-foreground mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

interface QuizStatisticsProps {
  data: DashboardData;
}

export default function QuizStatistics({ data }: QuizStatisticsProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { quiz } = data;

  const chartData = useMemo(() => {
    return quiz.progression.map((p) => ({
      date: p.date,
      score: p.score,
    }));
  }, [quiz.progression]);

  const hasData = quiz.totalSessions > 0;

  if (!hasData) {
    return (
      <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
          <BrainCircuit className="w-3.5 h-3.5 text-primary" />
          {t('dashboard.quiz.title')}
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <BrainCircuit className="w-10 h-10 text-foreground/20" />
          </div>
          <p className="text-sm font-semibold text-foreground/50 mb-4">{t('dashboard.quiz.no_data')}</p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.15em] hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Gamepad2 className="w-4 h-4" />
            {t('dashboard.quiz.no_data_action')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
        <BrainCircuit className="w-3.5 h-3.5 text-primary" />
        {t('dashboard.quiz.title')}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="w-4 h-4" />}
          label={t('dashboard.quiz.total_sessions')}
          value={quiz.totalSessions}
        />
        <StatCard
          icon={<Trophy className="w-4 h-4 text-yellow-500" />}
          label={t('dashboard.quiz.best_score')}
          value={quiz.bestScore}
          accent="bg-yellow-500/15 text-yellow-600"
        />
        <StatCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          label={t('dashboard.quiz.best_streak')}
          value={quiz.bestStreak}
          accent="bg-orange-500/15 text-orange-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          label={t('dashboard.quiz.total_correct')}
          value={quiz.totalCorrect}
          accent="bg-emerald-500/15 text-emerald-600"
        />
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'classic', icon: <Gamepad2 className="w-3 h-3" />, color: 'text-blue-500' },
          { key: 'silhouette', icon: <EyeOff className="w-3 h-3" />, color: 'text-purple-500' },
          { key: 'stats', icon: <BarChart3 className="w-3 h-3" />, color: 'text-rose-500' },
        ].map((cat) => {
          const stats = quiz.perCategory[cat.key as keyof typeof quiz.perCategory];
          if (!stats) return null;
          return (
            <div
              key={cat.key}
              className="p-3 rounded-sm border border-border/40 bg-muted/20 text-center"
            >
              <div className={cn('flex items-center justify-center gap-1 mb-1', cat.color)}>
                {cat.icon}
                <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{cat.key}</span>
              </div>
              <p className="text-base font-black text-foreground tabular-nums">{stats.bestScore}</p>
              <p className="text-[9px] font-semibold text-foreground/40">
                {stats.averageScore} avg · {stats.totalSessions} sessions
              </p>
            </div>
          );
        })}
      </div>

      {/* Progression chart */}
      {chartData.length > 1 && mounted && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-3">
            {t('dashboard.quiz.progression_chart')}
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--primary)' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
