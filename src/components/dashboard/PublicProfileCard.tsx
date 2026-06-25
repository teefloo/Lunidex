'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Trophy, Target, Zap, Users, Calendar, Copy, Check, Flame, Layers, Library } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { PublicProfile } from '@/types/dashboard';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const BADGE_ICON_MAP: Record<string, string> = {
  'first-catch': 'Pokeball',
  collector: 'Backpack',
  'pokedex-master': 'Award',
  'complete-dex': 'Trophy',
  'quiz-novice': 'Gamepad2',
  'quiz-master': 'Trophy',
  'speed-demon': 'Zap',
  'eagle-eye': 'EyeOff',
  professor: 'BrainCircuit',
  'fan-favorite': 'Heart',
  'team-builder': 'Users',
  'type-explorer': 'Shapes',
};

/** National Dex totals per generation (index 0 = gen 1 … index 8 = gen 9). */
const GEN_TOTALS = [151, 100, 135, 107, 156, 72, 88, 96, 120];

interface PublicProfileCardProps {
  profile: PublicProfile;
}

export default function PublicProfileCard({ profile }: PublicProfileCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/u/${profile.handle}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('profile.link_copied', { defaultValue: 'Profile link copied!' }));
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Header */}
      <div className="glass-card rounded-sm p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

        <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left">
          <div
            className={cn(
              'relative flex h-20 w-20 flex-none items-center justify-center rounded-full border-2',
              profile.avatarPokemonId
                ? 'border-primary/30 bg-primary/10'
                : 'border-border/50 bg-muted/50',
            )}
          >
            {profile.avatarPokemonId ? (
              <Image
                src={`${SPRITE_BASE}/${profile.avatarPokemonId}.png`}
                alt={profile.displayName}
                width={72}
                height={72}
                className="object-contain drop-shadow-md"
                unoptimized
              />
            ) : (
              <Trophy className="h-8 w-8 text-foreground/30" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-tight text-foreground">
              {profile.displayName}
            </h1>
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-[0.15em] mt-0.5">
              @{profile.handle}
            </p>
            {profile.memberSince && (
              <p className="text-[10px] font-semibold text-foreground/40 mt-1 flex items-center gap-1 justify-center sm:justify-start">
                <Calendar className="h-3 w-3" />
                {t('profile.member_since', { defaultValue: 'Member since' })}{' '}
                {new Date(profile.memberSince).toLocaleDateString()}
              </p>
            )}
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground/60 transition-all hover:bg-muted/60 hover:text-foreground/80"
            aria-label={t('profile.share', { defaultValue: 'Share profile' })}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied
              ? t('profile.copied', { defaultValue: 'Copied!' })
              : t('profile.share', { defaultValue: 'Share' })}
          </button>
        </div>
      </div>

      {/* Living Dex Progress */}
      <div className="glass-card rounded-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2 mb-4">
          <Target className="h-3.5 w-3.5 text-primary" />
          {t('profile.living_dex', { defaultValue: 'Living Dex' })}
        </h2>

        <div className="flex items-end gap-3 mb-3">
          <span className="text-3xl font-black text-primary">
            {profile.caughtCount}
          </span>
          <span className="text-sm font-bold text-foreground/40 mb-1">
            / {profile.totalPokemon}
          </span>
        </div>

        <div className="h-3 rounded-full bg-muted/60 overflow-hidden pixel-progress">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${profile.caughtPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary via-orange-400 to-yellow-400"
          />
        </div>
        <p className="text-[10px] font-bold text-foreground/40 mt-1.5 text-right">
          {profile.caughtPercent}%
        </p>
      </div>

      {/* Living Dex by generation */}
      {profile.caughtByGen.some((c) => c > 0) && (
        <div className="glass-card rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2 mb-4">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {t('profile.by_generation', { defaultValue: 'By Generation' })}
          </h2>

          <div className="space-y-2.5">
            {GEN_TOTALS.map((total, i) => {
              const caught = profile.caughtByGen[i] ?? 0;
              const percent = total > 0 ? Math.round((caught / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-12 flex-none text-[10px] font-black uppercase tracking-[0.1em] text-foreground/50">
                    {t('profile.gen_short', { defaultValue: 'Gen' })} {i + 1}
                  </span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted/60 overflow-hidden pixel-progress">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400"
                    />
                  </div>
                  <span className="w-14 flex-none text-right text-[10px] font-bold text-foreground/40 tabular-nums">
                    {caught}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      {profile.unlockedBadges.length > 0 && (
        <div className="glass-card rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500/25 to-transparent" />

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2 mb-4">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
            {t('profile.badges', { defaultValue: 'Badges' })}
            <span className="text-foreground/40 font-bold">
              ({profile.unlockedBadges.length})
            </span>
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {profile.unlockedBadges.map((badgeId) => (
              <div
                key={badgeId}
                className="p-3 rounded-sm border border-primary/20 bg-primary/5 flex flex-col items-center gap-1.5 text-center text-primary transition-all hover:bg-primary/10"
              >
                <div className="p-1.5 rounded-lg bg-primary/20 shadow-[0_0_10px_rgba(227,53,13,0.2)]">
                  <Trophy className="h-4 w-4" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-[0.08em] leading-tight text-foreground/60">
                  {BADGE_ICON_MAP[badgeId] ?? badgeId}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {profile.teamIds.length > 0 && (
        <div className="glass-card rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent" />

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2 mb-4">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            {t('profile.team', { defaultValue: 'Favorite Team' })}
          </h2>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {profile.teamIds.map((pokemonId) => (
              <div
                key={pokemonId}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-400/20 bg-blue-400/5 transition-all hover:scale-110"
              >
                <Image
                  src={`${SPRITE_BASE}/${pokemonId}.png`}
                  alt={`Pokemon #${pokemonId}`}
                  width={56}
                  height={56}
                  className="object-contain drop-shadow-sm"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Stats */}
      {(profile.quizBestScore > 0 ||
        profile.quizTotalCorrect > 0 ||
        profile.quizBestStreak > 0) && (
        <div className="glass-card rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/25 to-transparent" />

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2 mb-4">
            <Zap className="h-3.5 w-3.5 text-green-400" />
            {t('profile.quiz_stats', { defaultValue: 'Quiz Stats' })}
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-sm border border-green-400/20 bg-green-400/5 text-center">
              <p className="text-2xl font-black text-green-400">
                {profile.quizBestScore}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50 mt-1">
                {t('profile.best_score', { defaultValue: 'Best Score' })}
              </p>
            </div>
            <div className="p-4 rounded-sm border border-green-400/20 bg-green-400/5 text-center">
              <p className="text-2xl font-black text-green-400 flex items-center justify-center gap-1">
                <Flame className="h-5 w-5 text-orange-400" />
                {profile.quizBestStreak}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50 mt-1">
                {t('profile.best_streak', { defaultValue: 'Best Streak' })}
              </p>
            </div>
            <div className="p-4 rounded-sm border border-green-400/20 bg-green-400/5 text-center">
              <p className="text-2xl font-black text-green-400">
                {profile.quizTotalCorrect}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50 mt-1">
                {t('profile.total_correct', { defaultValue: 'Correct Answers' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TCG Collection */}
      {profile.tcgOwnedCount > 0 && (
        <div className="glass-card rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2 mb-4">
            <Library className="h-3.5 w-3.5 text-purple-400" />
            {t('profile.tcg_collection', { defaultValue: 'TCG Collection' })}
          </h2>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-purple-400">
              {profile.tcgOwnedCount}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/50 mb-0.5">
              {t('profile.cards_owned', { defaultValue: 'Cards Owned' })}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
