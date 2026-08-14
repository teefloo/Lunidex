'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/neon/AuthProvider';
import { fetchLeaderboard } from '@/lib/supabase/leaderboard-client';
import {
  LEADERBOARD_PERIODS,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '@/lib/leaderboard';

interface QuizLeaderboardProps {
  /** Bump to force a refetch (e.g. after a score is submitted). */
  refreshKey?: number;
}

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  day: 'quiz.leaderboard.period_day',
  week: 'quiz.leaderboard.period_week',
  all: 'quiz.leaderboard.period_all',
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" aria-hidden />;
  if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" aria-hidden />;
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" aria-hidden />;
  return <span className="text-xs font-black tabular-nums text-foreground/40">{rank}</span>;
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-colors',
        isCurrentUser
          ? 'border-primary/40 bg-primary/[0.07]'
          : 'border-border/40 bg-card/40 hover:bg-primary/[0.03]',
      )}
    >
      <span className="flex w-6 flex-none items-center justify-center">
        <RankBadge rank={entry.rank} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{entry.pseudo}</span>
      <span className="flex-none text-base font-black tabular-nums text-foreground">{entry.score}</span>
    </div>
  );
}

/**
 * Daily challenge leaderboard with Day / Week / All-time tabs. Renders nothing
 * when Neon is unconfigured, keeping the optional online leaderboard out of
 * the local-only experience.
 */
export default function QuizLeaderboard({ refreshKey = 0 }: QuizLeaderboardProps) {
  const { t } = useTranslation();
  const { enabled, user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('day');

  const { data, isLoading: loading } = useQuery<LeaderboardResponse | null>({
    queryKey: ['quiz-leaderboard', period, refreshKey, user?.id ?? null],
    queryFn: () => fetchLeaderboard(period),
    enabled,
    staleTime: 30 * 1000,
  });

  if (!enabled) return null;

  const entries = data?.entries ?? [];
  // Show the user's own rank separately when they fall outside the visible top N.
  const showUserRow =
    data?.userEntry && !entries.some((entry) => entry.userId === data.userEntry?.userId);

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-5 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
        {t('quiz.leaderboard.title')}
      </h3>

      {/* Period tabs */}
      <div className="grid grid-cols-3 gap-1.5 rounded-sm border border-border/50 bg-card/40 p-1">
        {LEADERBOARD_PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            aria-pressed={period === value}
            className={cn(
              'rounded-sm px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] transition-colors',
              period === value
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/50 hover:text-foreground/80',
            )}
          >
            {t(PERIOD_LABELS[value])}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-3">
            <Trophy className="w-8 h-8 text-foreground/20" />
          </div>
          <p className="text-sm font-semibold text-foreground/50">{t('quiz.leaderboard.empty')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === user?.id}
            />
          ))}

          {showUserRow && data?.userEntry && (
            <>
              <div className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-border/40" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/30">
                  {t('quiz.leaderboard.your_rank')}
                </span>
                <span className="h-px flex-1 bg-border/40" />
              </div>
              <LeaderboardRow entry={data.userEntry} isCurrentUser />
            </>
          )}
        </div>
      )}

      {!user && (
        <p className="text-center text-[11px] font-semibold text-foreground/40">
          {t('quiz.leaderboard.signin_hint')}
        </p>
      )}
    </div>
  );
}
