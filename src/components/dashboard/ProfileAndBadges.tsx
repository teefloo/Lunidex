'use client';

import { Trophy, Gamepad2, Zap, EyeOff, BrainCircuit, Heart, Users, Shapes, Backpack, Award, CircleDot } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { DashboardData } from '@/types/dashboard';

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
};

function BadgeIcon({ iconName }: { iconName: string }) {
  return ICON_MAP[iconName] || <Trophy className="w-5 h-5" />;
}

interface ProfileAndBadgesProps {
  data: DashboardData;
}

export default function ProfileAndBadges({ data }: ProfileAndBadgesProps) {
  const { t } = useTranslation();
  const { profile, badges } = data;

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
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
            />
          ) : (
            <CircleDot className="w-7 h-7 text-foreground/30" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {t('dashboard.profile.display_name', { name: profile.displayName })}
          </h3>
          <p className="text-xs font-semibold text-foreground/50 uppercase tracking-[0.15em] mt-0.5">
            {t('dashboard.profile.member_since')}: {profile.memberSince ?? t('common.unknown')}
          </p>
        </div>
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
          {badges.unlocked.slice(0, 6).map((badge) => (
            <div
              key={badge.id}
              className="relative p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary flex flex-col items-center gap-1.5 text-center group hover:bg-primary/10 transition-all duration-300"
            >
              <div className="p-1.5 rounded-lg bg-primary/20 shadow-[0_0_10px_rgba(227,53,13,0.2)] group-hover:scale-110 transition-transform duration-300">
                <BadgeIcon iconName={badge.icon} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] leading-tight">
                {t(badge.nameKey)}
              </span>
            </div>
          ))}
          {badges.unlocked.length === 0 && (
            <p className="col-span-full text-xs text-foreground/40 font-medium text-center py-4">
              {t('dashboard.badges.locked')}
            </p>
          )}
        </div>

        {/* Next badge */}
        {badges.next && (
          <div className="mt-4 p-3 rounded-xl border border-dashed border-border/60 bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-2">
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
                <p className="text-[9px] font-semibold text-foreground/40 mt-0.5">
                  {badges.next.progressCurrent} / {badges.next.progressMax}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
