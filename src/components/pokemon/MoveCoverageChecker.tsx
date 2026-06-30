'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { useQueries } from '@tanstack/react-query';
import { getPokemonDetail, getPokemonMovesLocalized } from '@/lib/api';
import { TYPE_COLORS } from '@/types/pokemon';
import type { PokemonDetail } from '@/types/pokemon';
import { motion } from 'framer-motion';
import { Loader2, Crosshair, AlertTriangle, Swords } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { analyzeMoveCoverage } from '@/lib/move-coverage';
import type { MoveCoverageResult } from '@/lib/move-coverage';

interface MoveCoverageCheckerProps {
  className?: string;
}

interface MoveData {
  pokemonName: string;
  pokemonId: number;
  moves: Array<{ name: string; type: string; power: number }>;
}

export default function MoveCoverageChecker({ className }: MoveCoverageCheckerProps) {
  const { team, language, getLanguageId } = usePrimeDexStore();

  const pokemonQueries = useQueries({
    queries: team.map(id => ({
      queryKey: ['pokemon-team', id],
      queryFn: async () => {
        const pokemon = await getPokemonDetail(id.toString());
        return pokemon;
      },
      staleTime: 10 * 60 * 1000,
    }))
  });

  const pokemonDetails = useMemo(() => {
    return pokemonQueries
      .map(q => q.data)
      .filter((d): d is NonNullable<typeof d> => !!d) as PokemonDetail[];
  }, [pokemonQueries]);

  const moveQueries = useQueries({
    queries: team.map(id => {
      const pokemon = pokemonDetails.find(p => p.id === id);
      const pokemonName = pokemon?.name || '';
      return {
        queryKey: ['pokemon-moves', pokemonName, language],
        queryFn: async () => {
          if (!pokemonName) return null;
          const langId = getLanguageId();
          const moveData = await getPokemonMovesLocalized(pokemonName, langId);
          return {
            pokemonName,
            pokemonId: id,
            moves: moveData.map(m => ({
              name: m.pokemon_v2_move.pokemon_v2_movenames[0]?.name || m.pokemon_v2_move.name,
              type: m.pokemon_v2_move.pokemon_v2_type?.name ?? 'normal',
              power: m.pokemon_v2_move.power ?? 0,
            })),
          };
        },
        enabled: !!pokemonName && pokemonQueries.every(q => q.isSuccess),
        staleTime: 10 * 60 * 1000,
      };
    })
  });

  const moveData = useMemo(() => {
    return moveQueries
      .map(q => q.data)
      .filter((d): d is MoveData => !!d) as MoveData[];
  }, [moveQueries]);

  const coverage = useMemo<MoveCoverageResult | null>(() => {
    if (pokemonDetails.length === 0 || moveData.length === 0) return null;
    return analyzeMoveCoverage(team, pokemonDetails, moveData);
  }, [team, pokemonDetails, moveData]);

  if (team.length === 0) {
    return (
      <div className={cn("glass-panel p-6 rounded-sm text-center", className)}>
        <Crosshair className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-foreground/40">Add Pokemon to your team to analyze move coverage.</p>
      </div>
    );
  }

  const isLoading = pokemonQueries.some(q => q.isLoading) || moveQueries.some(q => q.isLoading);

  if (isLoading) {
    return (
      <div className={cn("glass-panel p-6 rounded-sm text-center", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary/40 mx-auto mb-3" />
        <p className="text-sm text-foreground/40">Analyzing move coverage...</p>
      </div>
    );
  }

  if (!coverage) {
    return (
      <div className={cn("glass-panel p-6 rounded-sm text-center", className)}>
        <p className="text-sm text-foreground/40">Unable to compute move coverage.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Coverage Summary */}
      <div className="glass-panel p-6 rounded-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-sm">
            <Crosshair className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-black">Type Coverage</h3>
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
              {coverage.coveredTypes.length} / 18 types covered
            </p>
          </div>
          <div className="ml-auto text-3xl font-black">
            <span className={cn(
              coverage.uncoveredTypes.length === 0
                ? 'text-green-600 dark:text-green-400'
                : coverage.uncoveredTypes.length <= 3
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            )}>
              {Math.round((coverage.coveredTypes.length / 18) * 100)}%
            </span>
          </div>
        </div>

        {/* Coverage Bar */}
        <div className="w-full h-3 bg-card/50 rounded-full overflow-hidden mb-6 border border-border/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(coverage.coveredTypes.length / 18) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              coverage.uncoveredTypes.length === 0 ? 'bg-green-500'
                : coverage.uncoveredTypes.length <= 3 ? 'bg-yellow-500'
                : 'bg-red-500'
            )}
          />
        </div>

        {/* Type Matrix */}
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {Object.keys(TYPE_COLORS).map(type => {
            const isCovered = coverage.coveredTypes.includes(type);
            return (
              <div
                key={type}
                className={cn(
                  "px-2 py-2 rounded-sm text-center text-[10px] font-black uppercase border transition-all",
                  isCovered
                    ? "border-border/40 shadow-sm"
                    : "border-red-500/20 bg-red-500/5 opacity-50"
                )}
                style={isCovered ? { backgroundColor: `${TYPE_COLORS[type]}cc`, color: 'white' } : undefined}
              >
                {type}
              </div>
            );
          })}
        </div>
      </div>

      {/* Uncovered Types + Suggestions */}
      {coverage.uncoveredTypes.length > 0 && (
        <div className="glass-panel p-6 rounded-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-sm">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black">Coverage Gaps</h3>
              <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                {coverage.uncoveredTypes.length} types not covered
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {coverage.uncoveredTypes.map(type => (
              <span
                key={type}
                className="px-3 py-1.5 rounded-sm border border-red-500/20 bg-red-500/5 text-[10px] font-black uppercase"
                style={{ color: TYPE_COLORS[type] }}
              >
                {type}
              </span>
            ))}
          </div>

          {coverage.suggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3">
                Suggested Moves
              </p>
              <div className="space-y-2">
                {coverage.suggestions.map((s, i) => (
                  <div
                    key={`${s.pokemonName}-${s.moveType}-${s.coversType}-${i}`}
                    className="flex items-center gap-3 p-3 rounded-sm bg-secondary/20 border border-border/40"
                  >
                    <span className="text-xs font-black text-foreground/60">{s.pokemonName}</span>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                      style={{ backgroundColor: `${TYPE_COLORS[s.moveType]}cc`, color: 'white' }}
                    >
                      {s.moveType}
                    </span>
                    <span className="text-[10px] text-foreground/40">covers</span>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                      style={{ backgroundColor: `${TYPE_COLORS[s.coversType]}cc`, color: 'white' }}
                    >
                      {s.coversType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Per-Pokemon Breakdown */}
      <div className="glass-panel p-6 rounded-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-sm">
            <Swords className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-black">Per-Pokemon Breakdown</h3>
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
              Which types each member covers
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {coverage.pokemonBreakdown.map(pm => (
            <div key={pm.pokemonId} className="p-4 rounded-sm bg-secondary/20 border border-border/40">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-black">{pm.pokemonName}</span>
                <span className="text-[10px] text-foreground/40">
                  {pm.coveredTypes.length} types / {pm.offensiveMoves.length} offensive moves
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pm.coveredTypes.map(type => (
                  <span
                    key={type}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                    style={{ backgroundColor: `${TYPE_COLORS[type]}cc`, color: 'white' }}
                  >
                    {type}
                  </span>
                ))}
                {pm.coveredTypes.length === 0 && (
                  <span className="text-[10px] text-foreground/30 italic">No super-effective coverage</span>
                )}
              </div>
              {pm.offensiveMoves.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {pm.offensiveMoves.slice(0, 8).map((m, i) => (
                    <span
                      key={`${m.name}-${i}`}
                      className="px-1.5 py-0.5 rounded text-[9px] border border-border/30 text-foreground/50"
                    >
                      {m.name}
                      {m.power > 0 && <span className="ml-1 text-foreground/30">({m.power})</span>}
                    </span>
                  ))}
                  {pm.offensiveMoves.length > 8 && (
                    <span className="px-1.5 py-0.5 text-[9px] text-foreground/30">
                      +{pm.offensiveMoves.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
