'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NatureSelector, { NATURES, type NatureName } from './NatureSelector';
import StatInput from './StatInput';
import IVResult from './IVResult';
import { useTranslation } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spatk: number;
  spdef: number;
  spd: number;
}

interface IVRange {
  min: number;
  max: number;
}

type StatKey = keyof BaseStats;

const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spatk', 'spdef', 'spd'];

// ---------------------------------------------------------------------------
// Pokémon data fetch
// ---------------------------------------------------------------------------

interface PokeApiPokemon {
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}

const STAT_MAP: Record<string, StatKey> = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spatk',
  'special-defense': 'spdef',
  speed: 'spd',
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
// IV formula
// ---------------------------------------------------------------------------

function calcHP(base: number, iv: number, ev: number, level: number): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

function calcStat(base: number, iv: number, ev: number, level: number, mult: number): number {
  return Math.floor(
    (Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * mult
  );
}

function findIVRange(
  statKey: StatKey,
  base: number,
  actualStat: number,
  ev: number,
  level: number,
  natureMult: number
): IVRange {
  const matches: number[] = [];
  for (let iv = 0; iv <= 31; iv++) {
    const computed =
      statKey === 'hp'
        ? calcHP(base, iv, ev, level)
        : calcStat(base, iv, ev, level, natureMult);
    if (computed === actualStat) matches.push(iv);
  }
  if (matches.length === 0) return { min: 0, max: 31 };
  return { min: matches[0], max: matches[matches.length - 1] };
}

// ---------------------------------------------------------------------------
// Default state helpers
// ---------------------------------------------------------------------------

const DEFAULT_STATS: BaseStats = { hp: 0, atk: 0, def: 0, spatk: 0, spdef: 0, spd: 0 };
const DEFAULT_EVS: BaseStats  = { hp: 0, atk: 0, def: 0, spatk: 0, spdef: 0, spd: 0 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EVIVCalculator() {
  const { t } = useTranslation();

  const [pokemonInput, setPokemonInput] = useState('');
  const [pokemonName, setPokemonName]   = useState('');
  const [level, setLevel]               = useState(50);
  const [nature, setNature]             = useState<NatureName>('hardy');
  const [actualStats, setActualStats]   = useState<BaseStats>({ ...DEFAULT_STATS });
  const [evs, setEvs]                   = useState<BaseStats>({ ...DEFAULT_EVS });
  const [results, setResults]           = useState<Record<StatKey, IVRange> | null>(null);

  const { data: baseStats, isFetching, isError } = useQuery({
    queryKey: ['pokemon-base-stats', pokemonName],
    queryFn: () => fetchPokemonStats(pokemonName),
    enabled: pokemonName.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const handleSearch = () => {
    const trimmed = pokemonInput.trim();
    if (!trimmed) return;
    setResults(null);
    setPokemonName(trimmed);
  };

  const handleCalculate = useCallback(() => {
    if (!baseStats) return;
    const natureDef = NATURES.find((n) => n.name === nature)!;
    const [atkMult, defMult, spatkMult, spdefMult, spdMult] = natureDef.mults;
    const mults: Record<StatKey, number> = {
      hp: 1.0,
      atk: atkMult,
      def: defMult,
      spatk: spatkMult,
      spdef: spdefMult,
      spd: spdMult,
    };

    const calc: Record<StatKey, IVRange> = {} as Record<StatKey, IVRange>;
    for (const key of STAT_KEYS) {
      calc[key] = findIVRange(key, baseStats[key], actualStats[key], evs[key], level, mults[key]);
    }
    setResults(calc);
  }, [baseStats, nature, actualStats, evs, level]);

  const totalEVs = STAT_KEYS.reduce((s, k) => s + evs[k], 0);

  const statLabelKey: Record<StatKey, string> = {
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
        <label className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
          {t('ev_iv.pokemon_label')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="pokemon"
            autoComplete="off"
            value={pokemonInput}
            onChange={(e) => setPokemonInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="pikachu"
            className="touch-target flex-1 rounded-sm bg-card/50 border border-border/60 px-3 text-sm font-medium text-foreground placeholder:text-foreground/55 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-[border-color,box-shadow]"
          />
          <Button
            variant="outline"
            size="icon-touch"
            onClick={handleSearch}
            disabled={isFetching}
            className="rounded-sm border-border/60"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {isFetching && (
          <p className="text-[11px] text-foreground/55 animate-pulse" aria-live="polite">Loading…</p>
        )}
        {isError && (
          <p className="text-[11px] text-red-400" role="alert">Pokémon not found. Check the name and retry.</p>
        )}
        {baseStats && !isFetching && (
          <p className="text-[11px] text-emerald-400 font-semibold" aria-live="polite">
            Base stats loaded for <span className="capitalize">{pokemonName}</span>
          </p>
        )}
      </div>

      {/* Level + Nature */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
            {t('ev_iv.level_label')}
          </label>
          <input
            type="number"
            name="level"
            inputMode="numeric"
            min={1}
            max={100}
            value={level}
            onChange={(e) => setLevel(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            className="touch-target w-full rounded-sm bg-card/50 border border-border/60 px-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-[border-color,box-shadow]"
          />
        </div>
        <NatureSelector
          value={nature}
          onChange={setNature}
          label={t('ev_iv.nature_label')}
        />
      </div>

      {/* Actual stats */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
          {t('ev_iv.stats_label')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STAT_KEYS.map((key) => (
            <StatInput
              key={key}
              label={statLabelKey[key]}
              value={actualStats[key]}
              onChange={(v) => setActualStats((prev) => ({ ...prev, [key]: v }))}
              min={1}
              max={999}
            />
          ))}
        </div>
      </div>

      {/* EV distribution */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
            {t('ev_iv.ev_label')}
          </p>
          <span
            className={`text-[11px] font-black tabular-nums ${totalEVs > 510 ? 'text-red-400' : 'text-foreground/50'}`}
          >
            {t('ev_iv.total_ev')}: {totalEVs}/510
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STAT_KEYS.map((key) => (
            <StatInput
              key={key}
              label={statLabelKey[key]}
              value={evs[key]}
              onChange={(v) => setEvs((prev) => ({ ...prev, [key]: v }))}
              min={0}
              max={252}
              slider
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleCalculate}
          disabled={!baseStats || totalEVs > 510}
          className="flex-1 h-11 rounded-sm font-bold uppercase tracking-widest text-xs"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {t('ev_iv.calculate')}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setActualStats({ ...DEFAULT_STATS });
            setEvs({ ...DEFAULT_EVS });
            setResults(null);
          }}
          className="h-11 px-4 rounded-sm border-border/60 font-bold uppercase tracking-widest text-xs"
        >
          {t('ev_iv.reset')}
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          {STAT_KEYS.map((key) => (
            <IVResult
              key={key}
              label={statLabelKey[key]}
              min={results[key].min}
              max={results[key].max}
              rangeLabel={t('ev_iv.iv_range')}
              perfectLabel={t('ev_iv.perfect_iv')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
