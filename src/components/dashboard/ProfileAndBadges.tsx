'use client';

import { Trophy, Gamepad2, Zap, EyeOff, BrainCircuit, Heart, Users, Shapes, Backpack, Award, CircleDot, Star, Flame, Droplets, Leaf, Layers, Check } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/neon/AuthProvider';
import { fetchAppApi } from '@/lib/app-api';
import { usePrimeDexStore } from '@/store/primedex';
import { useState, useEffect } from 'react';
import { computeTotalXP, getTrainerLevel, getXPProgress, computeWeeklyQuest } from '@/lib/trainer';
import { ShareButton } from '@/components/share/ShareButton';
import { SITE_URL } from '@/lib/site';
import type { DashboardData, BadgeTier } from '@/types/dashboard';

const ICON_MAP: Record<string, React.ReactNode> = {
  Pokeball: <CircleDot className="w-5 h-5" />,
  Backpack: <Backpack className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  EyeOff: <EyeOff className="w-5 h-5" />,
  BrainCircuit: <BrainCircuit className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Shapes: <Shapes className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Droplets: <Droplets className="w-5 h-5" />,
  Leaf: <Leaf className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
};

function BadgeIcon({ iconName }: { iconName: string }) {
  return ICON_MAP[iconName] || <Trophy className="w-5 h-5" />;
}

const TIER_COLORS: Record<BadgeTier, { bg: string; border: string; text: string; glow: string }> = {
  bronze: { bg: 'bg-amber-700/15', border: 'border-amber-700/30', text: 'text-amber-600', glow: 'shadow-[0_0_8px_rgba(180,83,9,0.25)]' },
  silver: { bg: 'bg-slate-300/15', border: 'border-slate-400/30', text: 'text-slate-400', glow: 'shadow-[0_0_8px_rgba(148,163,184,0.3)]' },
  gold: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]' },
};

const TIER_LABELS: Record<BadgeTier, string> = {
  bronze: 'dashboard.badges.tier_bronze',
  silver: 'dashboard.badges.tier_silver',
  gold: 'dashboard.badges.tier_gold',
};

interface ProfileAndBadgesProps {
  data: DashboardData;
}

export default function ProfileAndBadges({ data }: ProfileAndBadgesProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, badges } = data;
  const [publicHandle, setPublicHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchAppApi('/api/profile', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile?: { public_handle?: string | null } | null;
        };
        if (payload.profile?.public_handle) setPublicHandle(payload.profile.public_handle);
      })
      .catch(() => {});
  }, [user]);

  const displayName = publicHandle
    ? publicHandle
    : (user?.user_metadata?.name as string | undefined)?.trim() ||
      (user?.user_metadata?.display_name as string | undefined)?.trim() ||
      user?.email?.split('@')[0] ||
      profile.displayName;

  const memberSinceRaw = user?.created_at ?? profile.memberSince;
  const memberSince = memberSinceRaw
    ? new Date(memberSinceRaw).toLocaleDateString()
    : t('common.unknown');
  const tcgOwnedCards = usePrimeDexStore((s) => s.tcgOwnedCards);
  const totalQuizCorrect = usePrimeDexStore((s) => s.totalQuizCorrect);
  const weeklyQuestClaimedWeek = usePrimeDexStore((s) => s.weeklyQuestClaimedWeek);
  const claimWeeklyQuest = usePrimeDexStore((s) => s.claimWeeklyQuest);

  const xp = computeTotalXP(
    {
      caughtCount: data.pokedex.caughtCount,
      favoriteCount: data.badges.unlocked.filter((b) => b.category === 'social').length,
      teamCount: 0,
      quizHighScore: data.quiz.bestScore,
      quizHighScoreTA: 0,
      quizHighScoreSilhouette: 0,
      quizHighScoreStats: 0,
      totalQuizSessions: data.quiz.totalSessions,
      uniqueTypesViewed: data.pokedex.byType.length,
      tcgOwnedCount: tcgOwnedCards.length,
      currentStreak: data.quiz.currentStreak,
    },
    { tcgOwnedCount: tcgOwnedCards.length, totalQuizCorrect },
  );

  const trainerLevel = getTrainerLevel(xp);
  const xpProgress = getXPProgress(xp);

  const weeklyQuest = computeWeeklyQuest(
    new Date(),
    {
      caughtCount: data.pokedex.caughtCount,
      favoriteCount: 0,
      teamCount: 0,
      quizHighScore: data.quiz.bestScore,
      quizHighScoreTA: 0,
      quizHighScoreSilhouette: 0,
      quizHighScoreStats: 0,
      totalQuizSessions: data.quiz.totalSessions,
      uniqueTypesViewed: data.pokedex.byType.length,
      tcgOwnedCount: tcgOwnedCards.length,
      currentStreak: data.quiz.currentStreak,
    },
    tcgOwnedCards.length,
  );

  const weekNum = (() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  })();

  const questClaimed = weeklyQuestClaimedWeek === weekNum;
  const questComplete = weeklyQuest.progress >= weeklyQuest.target;

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      {/* Profile */}
      <div className="flex items-center gap-4">
        <div className={cn(
          'relative flex h-16 w-16 flex-none items-center justify-center rounded-full border-2',
          profile.avatarPokemonId
            ? 'border-primary/30 bg-primary/10'
            : 'border-border/50 bg-muted/50'
        )}>
          {profile.avatarPokemonId ? (
            <Image
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${profile.avatarPokemonId}.png`}
              alt="Avatar"
              width={56}
              height={56}
              className="object-contain drop-shadow-md"
              unoptimized
            />
          ) : (
            <CircleDot className="w-7 h-7 text-foreground/30" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {t('dashboard.profile.display_name', { name: displayName })}
          </h3>
          <p className="text-xs font-semibold text-foreground/50 uppercase tracking-[0.15em] mt-0.5">
            {t('dashboard.profile.member_since')}: {memberSince}
          </p>
        </div>
        <ShareButton
          url={`${SITE_URL}/dashboard?utm_source=share&utm_medium=social`}
          title={`${displayName} on Lunidex`}
          description={`Level ${trainerLevel.level} Trainer — ${data.pokedex.caughtPercent}% Dex completed`}
          label={t('detail.share')}
          variant="outline"
          className="rounded-full text-[11px] font-black uppercase border-border/50 text-foreground/60 hover:bg-primary/10 shrink-0"
        />
      </div>

      {/* Trainer Level + XP Bar */}
      <div className="p-4 rounded-sm border border-primary/20 bg-primary/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground/60">
              {t('dashboard.trainer.title')}
            </span>
          </div>
          <span className="text-sm font-black text-primary">
            {t('dashboard.trainer.level', { level: trainerLevel.level })}
          </span>
        </div>
        <p className="text-[11px] font-bold text-foreground/40 mb-2">
          {t(trainerLevel.titleKey)}
        </p>
        <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden pixel-progress">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-orange-400 to-yellow-400 transition-all duration-700"
            style={{ width: `${xpProgress.percent}%` }}
          />
        </div>
        <p className="text-[11px] font-semibold text-foreground/40 mt-1 text-right">
          {t('dashboard.trainer.xp_bar', { current: xpProgress.current, max: xpProgress.max })}
        </p>
      </div>

      {/* Badges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            {t('dashboard.badges.title')}
            <span className="text-foreground/40 font-bold">
              {t('dashboard.badges.count', { count: badges.unlocked.length, total: badges.all.length })}
            </span>
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {badges.unlocked.slice(0, 6).map((badge) => {
            const tier = badge.tierStatus?.currentTier;
            const tierStyle = tier ? TIER_COLORS[tier] : null;
            return (
              <div
                key={badge.id}
                className={cn(
                  'relative p-3 rounded-sm border flex flex-col items-center gap-1.5 text-center group transition-all duration-300',
                  tierStyle
                    ? `${tierStyle.bg} ${tierStyle.border} ${tierStyle.text} hover:brightness-110 ${tierStyle.glow}`
                    : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300',
                  tierStyle ? `${tierStyle.bg}` : 'bg-primary/20 shadow-[0_0_10px_rgba(227,53,13,0.2)]'
                )}>
                  <BadgeIcon iconName={badge.icon} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] leading-tight">
                  {t(badge.nameKey)}
                </span>
                {tier && (
                  <span className={cn('text-[11px] font-black uppercase tracking-wider', tierStyle?.text)}>
                    {t(TIER_LABELS[tier])}
                  </span>
                )}
              </div>
            );
          })}
          {badges.unlocked.length === 0 && (
            <p className="col-span-full text-xs text-foreground/40 font-medium text-center py-4">
              {t('dashboard.badges.locked')}
            </p>
          )}
        </div>

        {/* Next badge */}
        {badges.next && (
          <div className="mt-4 p-3 rounded-sm border border-dashed border-border/60 bg-muted/30">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-2">
              {t('dashboard.badges.next_badge')}
            </p>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/60 text-foreground/50">
                <BadgeIcon iconName={badges.next.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground/70 truncate">
                  {t(badges.next.nameKey)}
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-teal-400 transition-all duration-700"
                    style={{
                      width: `${badges.next.progressMax > 0
                        ? Math.round((badges.next.progressCurrent / badges.next.progressMax) * 100)
                        : 0}%`
                    }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-foreground/40 mt-0.5">
                  {badges.next.progressCurrent} / {badges.next.progressMax}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Quest */}
      <div className={cn(
        'p-4 rounded-sm border transition-all duration-300',
        questComplete && !questClaimed
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border/40 bg-muted/20'
      )}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            {t('dashboard.weekly.title')}
          </h4>
          {questComplete && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-green-500">
              {t('dashboard.weekly.complete')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/60 text-foreground/50">
            <BadgeIcon iconName={weeklyQuest.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground/70 truncate">
              {t(weeklyQuest.nameKey)}
            </p>
            <p className="text-[11px] text-foreground/40 mt-0.5">
              {t(weeklyQuest.descKey)}
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted/70 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  questComplete
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-400'
                )}
                style={{
                  width: `${weeklyQuest.target > 0
                    ? Math.round((weeklyQuest.progress / weeklyQuest.target) * 100)
                    : 0}%`
                }}
              />
            </div>
            <p className="text-[11px] font-semibold text-foreground/40 mt-0.5">
              {weeklyQuest.progress} / {weeklyQuest.target}
            </p>
          </div>
          <div className="text-right">
            {questComplete && !questClaimed ? (
              <button
                onClick={() => claimWeeklyQuest()}
                className="text-[11px] font-bold uppercase tracking-wider text-green-500 hover:text-green-400 transition-colors px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20"
              >
                {t('dashboard.weekly.xp_reward', { amount: weeklyQuest.xpReward })}
              </button>
            ) : questClaimed ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {t('dashboard.weekly.complete')}
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/30">
                {t('dashboard.weekly.xp_reward', { amount: weeklyQuest.xpReward })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
