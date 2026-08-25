'use client';

import { useQueries } from '@tanstack/react-query';
import { getMoveDetail, MoveDetail } from '@/lib/api';
import { PokemonDetail, TYPE_COLORS } from '@/types/pokemon';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { 
  Swords, 
  ShieldCheck, 
  Zap, 
  Trophy,
  Activity,
  Target
} from 'lucide-react';
import { cn, formatName } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { useShallow } from 'zustand/react/shallow';
import { useMounted } from '@/hooks/useMounted';

interface PokemonBuildsProps {
  pokemon: PokemonDetail;
}

export function PokemonBuilds({ pokemon }: PokemonBuildsProps) {
  const { t } = useTranslation();
  const { language, systemLanguage } = usePrimeDexStore(useShallow((state) => ({
    language: state.language,
    systemLanguage: state.systemLanguage,
  })));
  const mounted = useMounted();

  const resolvedLang = mounted 
    ? (language === 'auto' ? systemLanguage : language) 
    : 'en';

  const moveNames = pokemon.moves.slice(0, 20).map(m => m.move.name);
  
  const moveQueries = useQueries({
    queries: moveNames.map(name => ({
      queryKey: ['move-detail', name, resolvedLang],
      queryFn: () => getMoveDetail(name),
      staleTime: 24 * 60 * 60 * 1000,
    }))
  });

  const moves = moveQueries.map(q => q.data).filter((m): m is MoveDetail => !!m);
  const isLoading = moveQueries.some(q => q.isLoading);

  const atk = pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
  const spAtk = pokemon.stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0;

  const builds = useMemo(() => {
    if (moves.length === 0) return [];

    const physicalMoves = moves.filter(m => m.damage_class.name === 'physical');
    const specialMoves = moves.filter(m => m.damage_class.name === 'special');
    const statusMoves = moves.filter(m => m.damage_class.name === 'status');

    // Sweeper Build
    const mainOffensiveMoves = atk >= spAtk ? physicalMoves : specialMoves;
    const sweeperMoves = [...mainOffensiveMoves].sort((a, b) => (b.power || 0) - (a.power || 0)).slice(0, 4);

    // Tank Build
    const tankMoves = [...statusMoves, ...moves.filter(m => m.name.includes('rest') || m.name.includes('protect') || m.name.includes('substitute'))]
      .slice(0, 2)
      .concat(moves.filter(m => m.damage_class.name !== 'status').sort((a, b) => (b.power || 0) - (a.power || 0)).slice(0, 2));

    // Balanced Build
    const balancedMoves = [...moves].sort((a, b) => (b.power || 0) - (a.power || 0)).slice(0, 3).concat(statusMoves.slice(0, 1));

    return [
      {
        name: t('builds.sweeper_title'),
        desc: t('builds.sweeper_desc'),
        icon: <Swords className="w-5 h-5 text-red-500" />,
        moves: sweeperMoves,
        color: 'border-red-500/20 bg-red-500/5'
      },
      {
        name: t('builds.tank_title'),
        desc: t('builds.tank_desc'),
        icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
        moves: tankMoves.length >= 4 ? tankMoves : moves.slice(0, 4),
        color: 'border-blue-500/20 bg-blue-500/5'
      },
      {
        name: t('builds.balanced_title'),
        desc: t('builds.balanced_desc'),
        icon: <Zap className="w-5 h-5 text-yellow-500" />,
        moves: balancedMoves.length >= 4 ? balancedMoves : moves.slice(4, 8),
        color: 'border-yellow-500/20 bg-yellow-500/5'
      }
    ];
  }, [moves, atk, spAtk, t]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Activity className="w-10 h-10 animate-pulse text-primary/40" />
        <p className="text-xs font-black uppercase tracking-widest text-foreground/30">{t('builds.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {builds.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
          <Trophy className="w-10 h-10 text-foreground/20" />
          <p className="text-sm font-black uppercase tracking-widest text-foreground/40">{t('builds.no_builds')}</p>
          <p className="text-[11px] text-foreground/30 max-w-xs">{t('builds.no_builds_desc')}</p>
        </div>
      ) : (
        builds.map((build, idx) => (
          <motion.div 
            key={build.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn("glass-panel p-6 md:p-8 rounded-sm border", build.color)}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-background/50 rounded-sm border border-border/40 shadow-inner">
                  {build.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-black">{build.name}</h3>
                  <p className="text-xs text-foreground/50 font-medium">{build.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background/40 rounded-sm border border-border/40">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-foreground/60">{t('builds.recommended')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {build.moves.map((move, i) => {
                const localizedMoveName = move.names.find(n => n.language.name === resolvedLang)?.name 
                  || move.names.find(n => n.language.name === 'en')?.name 
                  || formatName(move.name);

                return (
                  <div key={`${move.name}-${i}`} className="bg-background/40 p-4 rounded-sm border border-border/40 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-black text-sm capitalize group-hover:text-primary transition-colors">
                        {localizedMoveName}
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded text-[11px] sm:text-[11px] font-black uppercase text-primary-foreground shadow-sm"
                        style={{ backgroundColor: TYPE_COLORS[move.type.name] }}
                      >
                        {t(`types.${move.type.name}`)}
                      </span>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-yellow-500/60" />
                        <span className="text-[11px] font-bold text-foreground/40 uppercase">{t('moves.power_short')}</span>
                        <span className="text-xs font-black">{move.power || '--'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-blue-500/60" />
                        <span className="text-[11px] font-bold text-foreground/40 uppercase">{t('moves.accuracy_short')}</span>
                        <span className="text-xs font-black">{move.accuracy || '--'}%</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <div className={cn(
                          "w-2 h-2 rounded-sm",
                          move.damage_class.name === 'physical' ? 'bg-orange-500' : 
                          move.damage_class.name === 'special' ? 'bg-blue-500' : 'bg-gray-500'
                        )} />
                        <span className="text-[11px] sm:text-[11px] font-black uppercase text-foreground/30">{t(`moves.damage_class.${move.damage_class.name}`)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

