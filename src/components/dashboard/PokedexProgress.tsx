'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Compass, Eye } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import type { DashboardData } from '@/types/dashboard';

interface PokedexProgressProps {
  data: DashboardData;
}

export default function PokedexProgress({ data }: PokedexProgressProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const { pokedex } = data;

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-primary" />
        {t('dashboard.pokedex.title')}
      </h3>

      {/* Main progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-foreground/70">
            {t('dashboard.pokedex.caught')}: {pokedex.caughtCount}
          </span>
          <span className="text-foreground/50">
            {t('dashboard.pokedex.seen')}: {pokedex.seenCount}
          </span>
        </div>
        <div className="h-4 rounded-full bg-muted/70 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-teal-400 to-emerald-400 transition-all duration-1000 ease-out"
            style={{ width: `${pokedex.caughtPercent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {pokedex.caughtPercent}%
          </span>
        </div>
        <p className="text-[10px] font-semibold text-foreground/40 text-center">
          {t('dashboard.pokedex.progress', { count: pokedex.caughtCount, total: pokedex.totalPokemon })}
        </p>
      </div>

      {/* By generation */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-3">
          {t('dashboard.pokedex.by_generation')}
        </p>
        <div className="space-y-2">
          {pokedex.byGeneration.map((gen) => {
            const percent = gen.total > 0 ? Math.round((gen.caught / gen.total) * 100) : 0;
            return (
              <div key={gen.id} className="flex items-center gap-2">
                <span className="w-12 text-[9px] font-bold text-foreground/60 shrink-0">{gen.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-14 text-right text-[9px] font-bold text-foreground/50 tabular-nums shrink-0">
                  {gen.caught}/{gen.total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By type */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-3">
          {t('dashboard.pokedex.by_type')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {pokedex.byType.slice(0, 18).map((type) => {
            const percent = type.total > 0 ? Math.round((type.caught / type.total) * 100) : 0;
            return (
              <div
                key={type.name}
                className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border/30 bg-muted/20"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-[8px] font-bold capitalize text-foreground/60 flex-1 truncate">
                  {type.name}
                </span>
                <span className="text-[8px] font-bold text-foreground/40 tabular-nums">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most viewed */}
      {pokedex.mostViewed.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-3 flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            {t('dashboard.pokedex.most_viewed')}
          </p>
          <div className="flex flex-wrap gap-2">
            {pokedex.mostViewed.map((p) => (
              <Link
                key={p.id}
                href={localeHref(`/pokemon/${p.name}`)}
                className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-lg border border-border/30 bg-muted/20 hover:bg-primary/10 hover:border-primary/20 transition-all group"
              >
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <Image
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                    alt={p.name}
                    width={24}
                    height={24}
                    className="object-contain group-hover:scale-110 transition-transform"
                  />
                </div>
                <span className="text-[9px] font-bold capitalize text-foreground/60 truncate max-w-[80px]">
                  {p.name}
                </span>
                <span className="text-[8px] font-bold text-foreground/30">×{p.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Never viewed */}
      {pokedex.neverViewed.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-3 flex items-center gap-1.5">
            <Compass className="w-3 h-3" />
            {t('dashboard.pokedex.never_viewed')}
          </p>
          <div className="flex flex-wrap gap-2">
            {pokedex.neverViewed.map((p) => (
              <Link
                key={p.id}
                href={localeHref(`/pokemon/${p.name}`)}
                className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-lg border border-dashed border-border/40 bg-muted/10 hover:bg-primary/5 hover:border-primary/20 transition-all group"
              >
                <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                  <Image
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                    alt={p.name}
                    width={24}
                    height={24}
                    className="object-contain opacity-50 group-hover:opacity-100 transition-all grayscale group-hover:grayscale-0"
                  />
                </div>
                <span className="text-[9px] font-bold capitalize text-foreground/40 group-hover:text-foreground/70 transition-colors">
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
          <p className="text-[8px] font-medium text-foreground/30 mt-2 text-center">
            {t('dashboard.pokedex.never_viewed_hint')}
          </p>
        </div>
      )}
    </div>
  );
}
