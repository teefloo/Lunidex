'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NatureSelector, { NATURES, type NatureName } from './NatureSelector';
import StatInput from './StatInput';
import { useTranslation } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatKey = 'hp' | 'atk' | 'def' | 'spatk' | 'spdef' | 'spd';
const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spatk', 'spdef', 'spd'];

interface BaseStats {
  hp: number; atk: number; def: number; spatk: number; spdef: number; spd: number;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface PokeApiPokemon {
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}
const STAT_MAP: Record<string, StatKey> = {
  hp: 'hp', attack: 'atk', defense: 'def',
  'special-attack': 'spatk', 'special-defense': 'spdef', speed: 'spd',
};
async function fetchPokemonStats(name: string): Promise<BaseStats> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase().trim()}`);
  if (!res.ok) throw new Error('Not found');
  const data: PokeApiPokemon = await res.json();
  const base: Partial<BaseStats> = {};
  for (const s of data.stats) {
    const key = STAT_MAP[s.stat.name];
    if (key) base[key] = s.base_stat;
  }
  return base as BaseStats;
}

// ---------------------------------------------------------------------------
// Stat formulas
// ---------------------------------------------------------------------------

function calcHP(base: number, iv: number, ev: number, level: number): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}
function calcStat(base: number, iv: number, ev: number, level: number, mult: number): number {
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * mult);
}

function computeStats(
  baseStats: BaseStats,
  ivs: BaseStats,
  evs: BaseStats,
  nature: NatureName,
  level: number
): BaseStats {
  const natureDef = NATURES.find((n) => n.name === nature)!;
  const [atkMult, defMult, spatkMult, spdefMult, spdMult] = natureDef.mults;
  const mults: Record<StatKey, number> = {
    hp: 1.0, atk: atkMult, def: defMult, spatk: spatkMult, spdef: spdefMult, spd: spdMult,
  };
  const result: Partial<BaseStats> = {};
  for (const key of STAT_KEYS) {
    result[key] =
      key === 'hp'
        ? calcHP(baseStats[key], ivs[key], evs[key], level)
        : calcStat(baseStats[key], ivs[key], evs[key], level, mults[key]);
  }
  return result as BaseStats;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const FULL_IVS: BaseStats = { hp: 31, atk: 31, def: 31, spatk: 31, spdef: 31, spd: 31 };
const ZERO_EVS: BaseStats = { hp: 0,  atk: 0,  def: 0,  spatk: 0,  spdef: 0,  spd: 0 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EVPlanner() {
  const { t } = useTranslation();

  const [pokemonInput, setPokemonInput] = useState('');
  const [pokemonName, setPokemonName]   = useState('');
  const [nature, setNature]             = useState<NatureName>('hardy');
  const [ivs, setIvs]                   = useState<BaseStats>({ ...FULL_IVS });
  const [evs, setEvs]                   = useState<BaseStats>({ ...ZERO_EVS });

  const { data: baseStats, isFetching, isError } = useQuery({
    queryKey: ['pokemon-base-stats', pokemonName],
    queryFn: () => fetchPokemonStats(pokemonName),
    enabled: pokemonName.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const totalEVs = STAT_KEYS.reduce((s, k) => s + evs[k], 0);

  const handleEVChange = useCallback((key: StatKey, newVal: number) => {
    setEvs((prev) => {
      const rest = STAT_KEYS.filter((k) => k !== key).reduce((s, k) => s + prev[k], 0);
      const clamped = Math.min(newVal, 510 - rest, 252);
      return { ...prev, [key]: clamped };
    });
  }, []);

  const handleSearch = () => {
    const trimmed = pokemonInput.trim();
    if (!trimmed) return;
    setPokemonName(trimmed);
  };

  const handleReset = () => setEvs({ ...ZERO_EVS });

  const handleMaxSpeed = () =>
    handleEVChange('spd', 252);

  const stats50  = baseStats ? computeStats(baseStats, ivs, evs, nature, 50)  : null;
  const stats100 = baseStats ? computeStats(baseStats, ivs, evs, nature, 100) : null;

  const statLabel: Record<StatKey, string> = {
    hp:    t('ev_iv.stat_names.hp'),
    atk:   t('ev_iv.stat_names.atk'),
    def:   t('ev_iv.stat_names.def'),
    spatk: t('ev_iv.stat_names.spatk'),
    spdef: t('ev_iv.stat_names.spdef'),
    spd:   t('ev_iv.stat_names.spd'),
  };

  return (
    <div className="space-y-6">
      {/* Pokémon search */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
          {t('ev_iv.pokemon_label')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pokemonInput}
            onChange={(e) => setPokemonInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="garchomp"
            className="flex-1 h-10 rounded-sm bg-card/50 border border-border/60 px-3 text-sm font-medium text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearch}
            disabled={isFetching}
            className="h-10 px-3 rounded-sm border-border/60"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {isFetching && <p className="text-[11px] text-foreground/40 animate-pulse">Loading…</p>}
        {isError   && <p className="text-[11px] text-red-400">Pokémon not found.</p>}
        {baseStats && !isFetching && (
          <p className="text-[11px] text-emerald-400 font-semibold capitalize">{pokemonName} loaded</p>
        )}
      </div>

      {/* Nature */}
      <NatureSelector value={nature} onChange={setNature} label={t('ev_iv.nature_label')} />

      {/* IVs */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">IVs</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STAT_KEYS.map((key) => (
            <StatInput
              key={key}
              label={statLabel[key]}
              value={ivs[key]}
              onChange={(v) => setIvs((prev) => ({ ...prev, [key]: Math.min(31, Math.max(0, v)) }))}
              min={0}
              max={31}
            />
          ))}
        </div>
      </div>

      {/* EVs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
            {t('ev_iv.ev_label')}
          </p>
          <span className={`text-[11px] font-black tabular-nums ${totalEVs > 510 ? 'text-red-400' : 'text-foreground/50'}`}>
            {t('ev_iv.total_ev')}: {totalEVs}/510
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STAT_KEYS.map((key) => (
            <StatInput
              key={key}
              label={`${statLabel[key]}${evs[key] === 252 ? ' ★' : ''}`}
              value={evs[key]}
              onChange={(v) => handleEVChange(key, v)}
              min={0}
              max={252}
              slider
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex-1 h-10 rounded-sm border-border/60 font-bold uppercase tracking-widest text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {t('ev_iv.reset')}
        </Button>
        <Button
          variant="outline"
          onClick={handleMaxSpeed}
          className="flex-1 h-10 rounded-sm border-border/60 font-bold uppercase tracking-widest text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/5"
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          {t('ev_iv.max_speed')}
        </Button>
      </div>

      {/* Stat preview */}
      {stats50 && stats100 && (
        <div className="border-t border-border/30 pt-4 space-y-3">
          <div className="grid grid-cols-3 gap-px bg-border/30 rounded-sm overflow-hidden text-[10px] font-black uppercase tracking-widest">
            <div className="bg-card/50 px-3 py-2 text-foreground/40">Stat</div>
            <div className="bg-card/50 px-3 py-2 text-center text-foreground/40">Lv 50</div>
            <div className="bg-card/50 px-3 py-2 text-center text-foreground/40">Lv 100</div>
          </div>
          {STAT_KEYS.map((key) => {
            const isMaxed = evs[key] === 252;
            return (
              <div
                key={key}
                className={`grid grid-cols-3 gap-px rounded-sm overflow-hidden text-sm ${isMaxed ? 'ring-1 ring-primary/30' : ''}`}
              >
                <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${isMaxed ? 'bg-primary/10 text-primary' : 'bg-card/40 text-foreground/50'}`}>
                  {statLabel[key]}
                </div>
                <div className={`px-3 py-2 text-center font-black tabular-nums ${isMaxed ? 'bg-primary/10 text-primary' : 'bg-card/40 text-foreground/80'}`}>
                  {stats50[key]}
                </div>
                <div className={`px-3 py-2 text-center font-black tabular-nums ${isMaxed ? 'bg-primary/10 text-primary' : 'bg-card/40 text-foreground/80'}`}>
                  {stats100[key]}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
