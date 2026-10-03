'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Swords, Zap, CloudRain, Sun, CloudSnow, Wind, ChevronDown, RotateCcw, Play, Shield, Flame, Droplets } from 'lucide-react';
import { getReadableTextColor } from '@/lib/color-contrast';
import { PokemonDetail, TYPE_COLORS } from '@/types/pokemon';
import {
  calcDamage,
  simulateBattle,
  BattleMove,
  BattleOptions,
  DamageResult,
  BattleLogEntry,
} from '@/lib/battle-engine';
import { getAllPokemonNames, getMoveDetail, getPokemonDetail } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getPokemonDisplayName } from '@/lib/form-names';
import { useTranslation } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PokemonWithMoves {
  pokemon: PokemonDetail;
  moves: BattleMove[];
}

// ---------------------------------------------------------------------------
// Pokemon search / selector
// ---------------------------------------------------------------------------

function PokemonSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PokemonWithMoves | null;
  onChange: (p: PokemonWithMoves | null) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; id: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const pokemon = await getAllPokemonNames();
      const matches = pokemon
        .filter(p => p.name.includes(q.toLowerCase()))
        .slice(0, 8)
        .map(p => {
          const parts = p.url.split('/');
          return { name: p.name, id: parseInt(parts[parts.length - 2]) };
        });
      setSuggestions(matches);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const selectPokemon = useCallback(async (name: string) => {
    setLoading(true);
    setOpen(false);
    try {
      const pokemon = await getPokemonDetail(name);

      // Fetch move details for up to 8 offensive moves
      const offensiveMoveSlots = pokemon.moves
        .filter(m => m.version_group_details.some(vg => vg.version_group.name === 'scarlet-violet'))
        .slice(0, 20);

      const movesRaw = await Promise.all(
        offensiveMoveSlots.slice(0, 8).map(async m => {
          try {
            const md = await getMoveDetail(m.move.name);
            const move: BattleMove = {
              name: md.name,
              type: md.type.name,
              power: md.power ?? 0,
              damage_class: md.damage_class.name as 'physical' | 'special' | 'status',
              accuracy: md.accuracy,
            };
            return move;
          } catch {
            return null;
          }
        })
      );

      const moves = movesRaw.filter((m): m is BattleMove => m !== null && m.power > 0);
      onChange({ pokemon, moves });
      setQuery(name);
      setSuggestions([]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const sprite = value
    ? value.pokemon.sprites.other?.['official-artwork']?.front_default ||
      value.pokemon.sprites.front_default
    : null;

  const types = value?.pokemon.types ?? [];
  const valueDisplayName = value
    ? getPokemonDisplayName({
      name: value.pokemon.name,
      baseLocalizedName: value.pokemon.species.name,
      baseSpeciesName: value.pokemon.species.name,
      lang: 'en',
    })
    : '';

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>

      {/* Search input */}
      <div className="relative" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          aria-label={label}
          placeholder={t('battle.search_pokemon')}
          className="h-10 w-full rounded-sm border border-border/70 bg-background/50 px-3 font-mono text-[11px] placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />

        {open && suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-sm border border-border bg-card shadow-lg">
            {suggestions.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => selectPokemon(s.name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium capitalize hover:bg-muted/60"
              >
<Image
                   src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.id}.png`}
                   alt={s.name}
                   width={24}
                   height={24}
                   className="object-contain"
                   unoptimized
                 />
                <span>{s.name}</span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  #{s.id.toString().padStart(3, '0')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pokemon card */}
      {value && (
        <div className="overflow-hidden rounded-sm border border-border/60 bg-card">
          <div
            className="flex items-center gap-3 p-3"
            style={{
              background: types[0]
                ? `linear-gradient(135deg, ${TYPE_COLORS[types[0].type.name]}22 0%, transparent 60%)`
                : undefined,
            }}
          >
{sprite && (
               <div className="relative h-16 w-16 shrink-0">
                 <Image src={sprite} alt={valueDisplayName} fill className="object-contain drop-shadow-md" unoptimized />
               </div>
             )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold capitalize italic">
                {valueDisplayName}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {types.map(typeItem => (
                  <span
                    key={typeItem.type.name}
                    className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white"
                    style={{ background: TYPE_COLORS[typeItem.type.name], color: getReadableTextColor(TYPE_COLORS[typeItem.type.name]) }}
                  >
                    {t(`types.${typeItem.type.name}`)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-px border-t border-border/40 bg-border/40">
            {value.pokemon.stats.slice(0, 6).map(s => (
              <div key={s.stat.name} className="flex flex-col items-center bg-card px-2 py-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {s.stat.name.replace('special-', 'sp.').replace('attack', 'atk').replace('defense', 'def')}
                </span>
                <span className="font-mono text-xs font-bold">{s.base_stat}</span>
              </div>
            ))}
          </div>

          {/* Move count */}
          {value.moves.length > 0 && (
            <div className="border-t border-border/40 px-3 py-2">
              <p className="font-mono text-[11px] text-muted-foreground">
                {t('battle.offensive_moves_loaded', { count: value.moves.length })}
              </p>
            </div>
          )}
        </div>
      )}

      {loading && (
        <p className="font-mono text-[11px] text-muted-foreground animate-pulse">{t('battle.loading')}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Move selector
// ---------------------------------------------------------------------------

function MoveSelector({
  moves,
  selected,
  onSelect,
}: {
  moves: BattleMove[];
  selected: BattleMove | null;
  onSelect: (m: BattleMove) => void;
}) {
  const { t } = useTranslation();
  if (moves.length === 0) {
    return <p className="font-mono text-[11px] text-muted-foreground">{t('battle.select_attacker_first')}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {moves.map(m => (
        <button
          key={m.name}
          type="button"
          onClick={() => onSelect(m)}
          className={cn(
            'rounded-sm border px-2.5 py-1 font-mono text-[11px] font-semibold capitalize transition-all',
            selected?.name === m.name
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/60 bg-muted/30 text-foreground/70 hover:border-border hover:bg-muted/60'
          )}
        >
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: TYPE_COLORS[m.type] ?? '#888' }}
          />
          {m.name} ({m.power})
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Damage bar
// ---------------------------------------------------------------------------

function DamageBar({ result }: { result: DamageResult }) {
  const { t } = useTranslation();
  const verdict =
    result.ohkoChance >= 0.9375 ? 'OHKO'
    : result.ohkoChance > 0 ? `OHKO ${Math.round(result.ohkoChance * 100)}%`
    : result.twoHkoChance >= 1 ? '2HKO'
    : result.twoHkoChance > 0 ? `2HKO ${Math.round(result.twoHkoChance * 100)}%`
    : result.maxPercent >= 50 ? '3HKO est.'
    : t('battle.no_ko');

  const verdictColor =
    result.ohkoChance > 0 ? 'text-red-500'
    : result.twoHkoChance > 0 ? 'text-orange-500'
    : result.maxPercent >= 50 ? 'text-yellow-500'
    : 'text-muted-foreground';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">
          {t('battle.hp_percent_range', { min: result.minPercent, max: result.maxPercent })}
        </span>
        <span className={cn('font-mono text-xs font-bold', verdictColor)}>{verdict}</span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-sm bg-muted/40">
        {/* Average */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/40 transition-[width] duration-700"
          style={{ width: `${Math.min(result.maxPercent, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700"
          style={{ width: `${Math.min(result.minPercent, 100)}%` }}
        />
        {/* 100% marker */}
        <div className="absolute inset-y-0 left-[calc(100%-1px)] w-px bg-red-500/60" />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{t('battle.minimum')}: {result.min}</span>
        <span>{t('battle.average')}: {result.average}</span>
        <span>{t('battle.maximum')}: {result.max}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Battle log
// ---------------------------------------------------------------------------

function BattleLog({ log }: { log: BattleLogEntry[] }) {
  const { t } = useTranslation();
  const effectivenessLabel = (e: BattleLogEntry['effectiveness']) => {
    if (e === 'super') return t('battle.effectiveness_super');
    if (e === 'resist') return t('battle.effectiveness_resist');
    if (e === 'immune') return t('battle.effectiveness_immune');
    return '';
  };

  return (
    <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
      {log.map((entry, i) => (
        <div
          key={i}
          className="rounded-sm border border-border/30 bg-muted/20 px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('battle.turn', { turn: entry.turn })}
            </span>
            <span className={cn(
              'font-mono text-[11px] font-semibold uppercase tracking-wide',
              entry.effectiveness === 'super' ? 'text-red-400'
              : entry.effectiveness === 'immune' ? 'text-muted-foreground'
              : entry.effectiveness === 'resist' ? 'text-blue-400'
              : 'text-muted-foreground'
            )}>
              {effectivenessLabel(entry.effectiveness)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-foreground/85">
            {t('battle.turn_summary', {
              attacker: entry.attacker,
              move: entry.moveName,
              percent: entry.damagePercent,
              defender: entry.defender,
            })}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${Math.max(0, entry.defenderRemainingPercent)}%` }}
            />
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {t('battle.remaining_hp', {
              name: entry.defender,
              hp: entry.defenderRemainingHp,
              percent: entry.defenderRemainingPercent,
            })}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BattleSimulator component
// ---------------------------------------------------------------------------

export default function BattleSimulator() {
  const { t } = useTranslation();
  const [attacker, setAttacker] = useState<PokemonWithMoves | null>(null);
  const [defender, setDefender] = useState<PokemonWithMoves | null>(null);
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [options, setOptions] = useState<BattleOptions>({
    weather: 'none',
    terrain: 'none',
    isCritical: false,
    isAdaptability: false,
    attackerStatus: 'none',
  });
  const [battleLog, setBattleLog] = useState<BattleLogEntry[] | null>(null);
  const [battleWinner, setBattleWinner] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Calculate damage whenever inputs change
  const damageResult = useMemo(() => {
    if (!attacker || !defender || !selectedMove) return null;
    return calcDamage(attacker.pokemon, defender.pokemon, selectedMove, options);
  }, [attacker, defender, selectedMove, options]);

  const handleSimulate = useCallback(() => {
    if (!attacker || !defender) return;
    setSimulating(true);
    setBattleLog(null);
    setBattleWinner(null);

    // Small delay for UX
    setTimeout(() => {
      const result = simulateBattle(attacker, defender, options);
      setBattleLog(result.log);
      setBattleWinner(result.winner);
      setSimulating(false);
    }, 200);
  }, [attacker, defender, options]);

  const weatherIcons: Record<string, React.ReactNode> = {
    none: <Wind className="h-3 w-3" />,
    sun: <Sun className="h-3 w-3" />,
    rain: <CloudRain className="h-3 w-3" />,
    sandstorm: <Wind className="h-3 w-3" />,
    snow: <CloudSnow className="h-3 w-3" />,
  };

  const weatherOptions = ['none', 'sun', 'rain', 'sandstorm', 'snow'] as const;
  const terrainOptions = ['none', 'electric', 'grassy', 'psychic', 'misty'] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Top: Pokémon selectors + move/options */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Attacker */}
        <PokemonSelector label={t('battle.attacker')} value={attacker} onChange={p => { setAttacker(p); setSelectedMove(null); }} />

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-muted/40">
            <Swords className="h-4 w-4 text-primary" />
          </div>
        </div>

        {/* Defender */}
        <PokemonSelector label={t('battle.defender')} value={defender} onChange={setDefender} />
      </div>

      {/* Move selector */}
      <div className="rounded-sm border border-border/60 bg-card p-4">
        <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t('battle.move_selection')}
        </p>
        <MoveSelector
          moves={attacker?.moves ?? []}
          selected={selectedMove}
          onSelect={setSelectedMove}
        />
      </div>

      {/* Options */}
      <div className="rounded-sm border border-border/60 bg-card p-4">
        <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t('battle.conditions')}
        </p>
        <div className="flex flex-wrap gap-4">
          {/* Weather */}
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{t('battle.weather')}</p>
            <div className="flex gap-1">
              {weatherOptions.map(w => (
                <button
                  key={w}
                  type="button"
                  aria-label={t(`battle.weather_${w}`)}
                  aria-pressed={options.weather === w}
                  onClick={() => setOptions(o => ({ ...o, weather: w }))}
                  className={cn(
                    'touch-target flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-sm border px-2 py-1 font-mono text-[11px] capitalize transition-all',
                    options.weather === w
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border'
                  )}
                >
                  {weatherIcons[w]}
                  <span className={w === 'none' ? '' : 'hidden sm:inline'}>{t(`battle.weather_${w}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Terrain */}
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{t('battle.terrain')}</p>
            <div className="flex flex-wrap gap-1">
              {terrainOptions.map(terrain => (
                <button
                  key={terrain}
                  type="button"
                  aria-pressed={options.terrain === terrain}
                  onClick={() => setOptions(o => ({ ...o, terrain }))}
                  className={cn(
                    'touch-target min-h-11 rounded-sm border px-2 py-1 font-mono text-[11px] capitalize transition-all',
                    options.terrain === terrain
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border'
                  )}
                >
                  {t(`battle.terrain_${terrain}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{t('battle.modifiers')}</p>
            <div className="flex flex-wrap gap-1">
              {[
                { key: 'isCritical', label: t('battle.critical'), icon: <Zap className="h-3 w-3" /> },
                { key: 'isAdaptability', label: t('battle.adaptability'), icon: <Shield className="h-3 w-3" /> },
                { key: 'attackerStatus', label: t('battle.burned'), icon: <Flame className="h-3 w-3" />, isStatus: true },
              ].map(opt => {
                const isActive = opt.isStatus
                  ? options.attackerStatus === 'burned'
                  : options[opt.key as keyof BattleOptions] === true;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setOptions(o => ({
                        ...o,
                        [opt.key]: opt.isStatus
                          ? (o.attackerStatus === 'burned' ? 'none' : 'burned')
                          : !o[opt.key as keyof BattleOptions],
                      }))
                    }
                    className={cn(
                      'touch-target flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-sm border px-2 py-1 font-mono text-[11px] transition-all',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border'
                    )}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Damage result */}
      {damageResult && selectedMove && (
        <div className="rounded-sm border border-primary/30 bg-card p-4">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            {t('battle.damage_result', { move: selectedMove.name })}
          </p>
          <DamageBar result={damageResult} />
        </div>
      )}

      {/* AI simulation */}
      <div className="rounded-sm border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t('battle.ai_duel_mode')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('battle.duel_description')}
            </p>
          </div>
          <div className="flex gap-2">
            {battleLog && (
              <button
                type="button"
                onClick={() => { setBattleLog(null); setBattleWinner(null); }}
                className="flex items-center gap-1.5 rounded-sm border border-border/60 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:border-border hover:bg-muted/40"
              >
                <RotateCcw className="h-3 w-3" /> {t('battle.reset')}
              </button>
            )}
            <button
              type="button"
              onClick={handleSimulate}
              disabled={!attacker || !defender || simulating}
              className="flex items-center gap-1.5 rounded-sm border border-primary bg-primary/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {simulating ? (
                <Droplets className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {simulating ? t('battle.simulating') : t('battle.simulate')}
            </button>
          </div>
        </div>

        {battleWinner && (
          <div className="mt-4 rounded-sm bg-primary/10 px-4 py-3">
            <p className="font-mono text-sm font-bold capitalize text-primary">
              {t('battle.winner', { name: battleWinner })}
            </p>
          </div>
        )}

        {battleLog && battleLog.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {t('battle.battle_log')}
            </p>
            <BattleLog log={battleLog} />
          </div>
        )}
      </div>
    </div>
  );
}
