'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Egg,
  Dna,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Shuffle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPokemonSpecies } from '@/lib/api/rest';
import { getAllPokemonSearchIndex } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import {
  type BreederPokemon,
  type IVSet,
  type IVStat,
  type HeldBreedItem,
  type Nature,
  IV_STATS,
  NATURES,
  NATURE_EFFECTS,
  calcBreedingResult,
  suggestBreedingChain,
} from '@/lib/breeding-engine';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Parents', 'Configuration', 'Results'];

const HELD_ITEMS: { value: HeldBreedItem; label: string; desc: string }[] = [
  { value: null, label: 'None', desc: 'No held item' },
  { value: 'destiny-knot', label: 'Destiny Knot', desc: '5 IVs inherited' },
  { value: 'everstone', label: 'Everstone', desc: 'Nature guaranteed' },
  { value: 'power-weight', label: 'Power Weight', desc: 'Passes HP IV' },
  { value: 'power-bracer', label: 'Power Bracer', desc: 'Passes Atk IV' },
  { value: 'power-belt', label: 'Power Belt', desc: 'Passes Def IV' },
  { value: 'power-lens', label: 'Power Lens', desc: 'Passes SpA IV' },
  { value: 'power-band', label: 'Power Band', desc: 'Passes SpD IV' },
  { value: 'power-anklet', label: 'Power Anklet', desc: 'Passes Spe IV' },
];

const STAT_LABELS: Record<IVStat, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
};

const STAT_COLORS: Record<IVStat, string> = {
  hp: 'text-red-400',
  atk: 'text-orange-400',
  def: 'text-yellow-400',
  spa: 'text-blue-400',
  spd: 'text-green-400',
  spe: 'text-pink-400',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PokemonPickerProps {
  label: string;
  selected: BreederPokemon | null;
  onSelect: (p: BreederPokemon) => void;
}

function PokemonPicker({ label, selected, onSelect }: PokemonPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const { data: allPokemon } = useQuery({
    queryKey: pokemonKeys.allSearchIndex(),
    queryFn: getAllPokemonSearchIndex,
    staleTime: 24 * 60 * 60 * 1000,
    enabled: open || query.length > 0,
  });

  const results = useMemo(() => {
    if (!query.trim() || !allPokemon) return [];
    const q = query.toLowerCase();
    return allPokemon
      .filter(p => p.name.includes(q) || String(p.id).includes(q))
      .slice(0, 8);
  }, [query, allPokemon]);

  const handleSelect = useCallback(async (name: string, id: number) => {
    try {
      const species = await getPokemonSpecies(name);
      const genderRate = species.gender_rate;
      const gender: BreederPokemon['gender'] = genderRate === -1 ? 'genderless' : 'female';

      const breeder: BreederPokemon = {
        name,
        ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
        nature: 'jolly',
        gender,
        eggGroups: species.egg_groups.map(g => g.name),
        isGenderless: genderRate === -1,
        isDitto: name === 'ditto',
        isLegendary: species.is_legendary,
        isMythical: species.is_mythical,
      };
      onSelect(breeder);
      setQuery('');
      setOpen(false);
    } catch {
      // Fallback with minimal data
      const breeder: BreederPokemon = {
        name,
        ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
        nature: 'jolly',
        gender: 'female',
        eggGroups: [],
        isDitto: name === 'ditto',
      };
      onSelect(breeder);
      setQuery('');
      setOpen(false);
    }
  }, [onSelect]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">{label}</p>

      {selected ? (
        <div className="flex items-center gap-3 p-3 rounded-sm bg-secondary/30 border border-border/40 group">
          <div className="relative h-14 w-14 flex-shrink-0 bg-background/50 rounded-sm border border-border/40 flex items-center justify-center overflow-hidden">
            <Image
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                // We need id but we only stored name — use the allPokemon index
                ''
              }${selected.name}.png`}
              alt={selected.name}
              width={56}
              height={56}
              className="object-contain drop-shadow"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm capitalize text-foreground/90">{selected.name}</p>
            <p className="text-[10px] text-foreground/50 font-semibold uppercase tracking-wider mt-0.5">
              {selected.eggGroups.join(' · ') || 'Unknown groups'}
            </p>
            <p className="text-[10px] text-foreground/40 font-semibold uppercase mt-0.5">
              {selected.isLegendary ? 'Legendary' : selected.isMythical ? 'Mythical' : selected.isDitto ? 'Ditto' : selected.gender}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[10px] font-black uppercase tracking-wider text-primary/60 hover:text-primary transition-colors px-2 py-1 rounded-sm border border-transparent hover:border-primary/20"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              placeholder="Search Pokémon…"
              className="w-full pl-9 pr-3 h-11 rounded-sm border border-border/60 bg-background/50 text-sm font-semibold placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full rounded-sm border border-border/60 bg-card shadow-lg overflow-hidden">
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => handleSelect(p.name, p.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <Image
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                    alt={p.name}
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                  <span className="font-semibold text-sm capitalize text-foreground/85">{p.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-foreground/40">#{String(p.id).padStart(3, '0')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IV Editor
// ---------------------------------------------------------------------------

interface IvEditorProps {
  label: string;
  ivs: IVSet;
  onChange: (ivs: IVSet) => void;
}

function IvEditor({ label, ivs, onChange }: IvEditorProps) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">{label} IVs</p>
      {IV_STATS.map(stat => (
        <div key={stat} className="flex items-center gap-3">
          <span className={cn('w-8 text-[10px] font-black uppercase tracking-wider', STAT_COLORS[stat])}>
            {STAT_LABELS[stat]}
          </span>
          <div className="flex-1">
            <Slider
              min={0}
              max={31}
              step={1}
              value={[ivs[stat]]}
              onValueChange={(val) => onChange({ ...ivs, [stat]: Array.isArray(val) ? val[0] : (val as number) })}
              className="w-full"
            />
          </div>
          <span className="w-7 text-right font-mono text-[11px] font-black text-foreground/80 tabular-nums">
            {ivs[stat]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface BreedingCalculatorProps {
  initialPokemon?: string;
}

export function BreedingCalculator({ initialPokemon }: BreedingCalculatorProps) {
  const [step, setStep] = useState(0);

  // Parents
  const [parent1, setParent1] = useState<BreederPokemon | null>(null);
  const [parent2, setParent2] = useState<BreederPokemon | null>(null);

  // Held items (separate from parent state so they're configurable in step 2)
  const [p1Item, setP1Item] = useState<HeldBreedItem>(null);
  const [p2Item, setP2Item] = useState<HeldBreedItem>(null);

  // IVs (may differ from initial selection)
  const [p1IVs, setP1IVs] = useState<IVSet>({ hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 });
  const [p2IVs, setP2IVs] = useState<IVSet>({ hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 });

  // Target IVs
  const [targetIVs, setTargetIVs] = useState<Partial<Record<IVStat, boolean>>>({
    hp: true, atk: true, def: true, spa: true, spd: true, spe: true,
  });

  // Natures
  const [p1Nature, setP1Nature] = useState<Nature>('jolly');
  const [p2Nature, setP2Nature] = useState<Nature>('jolly');
  const [targetNature, setTargetNature] = useState<Nature>('jolly');

  // Gender
  const [p1Gender, setP1Gender] = useState<'male' | 'female' | 'genderless'>('female');
  const [p2Gender, setP2Gender] = useState<'male' | 'female' | 'genderless'>('male');

  // Build effective parents
  const effectiveP1: BreederPokemon | null = parent1 ? {
    ...parent1,
    ivs: p1IVs,
    heldItem: p1Item,
    nature: p1Nature,
    gender: parent1.isGenderless ? 'genderless' : p1Gender,
  } : null;

  const effectiveP2: BreederPokemon | null = parent2 ? {
    ...parent2,
    ivs: p2IVs,
    heldItem: p2Item,
    nature: p2Nature,
    gender: parent2.isGenderless ? 'genderless' : p2Gender,
  } : null;

  // Real-time compatibility
  const compatibility = useMemo(() => {
    if (!effectiveP1 || !effectiveP2) return null;
    return calcBreedingResult(effectiveP1, effectiveP2, targetIVs);
  }, [effectiveP1, effectiveP2, targetIVs]);

  // Breeding chain (simplified — egg moves not loaded here)
  const breedingChain = useMemo(() => {
    if (!parent1) return [];
    return suggestBreedingChain(parent1.name, [], {});
  }, [parent1]);

  const canProceed = step === 0 ? (!!parent1 && !!parent2) : true;

  const handleParent1Select = (p: BreederPokemon) => {
    setParent1(p);
    setP1IVs(p.ivs);
    setP1Nature(p.nature as Nature);
    setP1Gender(p.gender === 'genderless' ? 'genderless' : 'female');
  };

  const handleParent2Select = (p: BreederPokemon) => {
    setParent2(p);
    setP2IVs(p.ivs);
    setP2Nature(p.nature as Nature);
    setP2Gender(p.gender === 'genderless' ? 'genderless' : 'male');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] transition-all',
                i === step && 'bg-primary text-primary-foreground',
                i < step && 'text-primary/70 hover:text-primary cursor-pointer',
                i > step && 'text-foreground/30 cursor-default',
              )}
            >
              <span className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black',
                i === step ? 'bg-primary-foreground/20' : i < step ? 'bg-primary/15' : 'bg-foreground/10',
              )}>{i + 1}</span>
              {label}
            </button>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-foreground/20 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Parent Selection */}
      {step === 0 && (
        <div className="glass-panel p-6 md:p-8 rounded-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/60">
            <div className="p-2 bg-primary/10 rounded-sm">
              <Egg className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-lg text-foreground/90">Select Parents</h2>
              <p className="text-xs text-foreground/50 font-medium mt-0.5">Choose the two Pokémon you want to breed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <PokemonPicker label="Parent 1 (Nursery)" selected={parent1} onSelect={handleParent1Select} />
              {parent1 && !parent1.isGenderless && !parent1.isDitto && (
                <div className="flex gap-2">
                  {(['female', 'male'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setP1Gender(g)}
                      className={cn(
                        'flex-1 py-2 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all',
                        p1Gender === g
                          ? 'bg-primary/15 border-primary/30 text-primary'
                          : 'border-border/40 text-foreground/50 hover:border-border/70',
                      )}
                    >
                      {g === 'female' ? '♀ Female' : '♂ Male'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <PokemonPicker label="Parent 2 (Nursery)" selected={parent2} onSelect={handleParent2Select} />
              {parent2 && !parent2.isGenderless && !parent2.isDitto && (
                <div className="flex gap-2">
                  {(['female', 'male'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setP2Gender(g)}
                      className={cn(
                        'flex-1 py-2 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all',
                        p2Gender === g
                          ? 'bg-primary/15 border-primary/30 text-primary'
                          : 'border-border/40 text-foreground/50 hover:border-border/70',
                      )}
                    >
                      {g === 'female' ? '♀ Female' : '♂ Male'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Real-time compatibility badge */}
          {compatibility && (
            <div className={cn(
              'flex items-start gap-3 p-4 rounded-sm border',
              compatibility.compatibility.compatible
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20',
            )}>
              {compatibility.compatibility.compatible ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn(
                  'text-xs font-black uppercase tracking-wider',
                  compatibility.compatibility.compatible ? 'text-green-400' : 'text-red-400',
                )}>
                  {compatibility.compatibility.compatible ? 'Compatible' : 'Incompatible'}
                </p>
                {compatibility.compatibility.reason && (
                  <p className="text-xs text-foreground/60 mt-1">{compatibility.compatibility.reason}</p>
                )}
                {compatibility.compatibility.compatible && (
                  <p className="text-xs text-foreground/60 mt-1">
                    Egg species: <span className="font-black capitalize">{compatibility.compatibility.eggSpecies}</span>
                    {compatibility.compatibility.sharedGroups.length > 0 && (
                      <> · Shared groups: <span className="font-black">{compatibility.compatibility.sharedGroups.join(', ')}</span></>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setStep(1)}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-sm text-[11px] font-black uppercase tracking-[0.15em] transition-all',
                canProceed
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-foreground/30 cursor-not-allowed',
              )}
            >
              Configure <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 1 && (
        <div className="glass-panel p-6 md:p-8 rounded-sm space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border/60">
            <div className="p-2 bg-blue-500/10 rounded-sm">
              <Dna className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-black text-lg text-foreground/90">Configuration</h2>
              <p className="text-xs text-foreground/50 font-medium mt-0.5">Set IVs, held items, and target nature</p>
            </div>
          </div>

          {/* Held Items */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">Held Items</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-foreground/60 mb-2 capitalize">{parent1?.name ?? 'Parent 1'}</p>
                <div className="flex flex-wrap gap-2">
                  {HELD_ITEMS.map(item => (
                    <button
                      key={String(item.value)}
                      type="button"
                      onClick={() => setP1Item(item.value)}
                      title={item.desc}
                      className={cn(
                        'px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all',
                        p1Item === item.value
                          ? 'bg-primary/15 border-primary/30 text-primary'
                          : 'border-border/40 text-foreground/50 hover:border-border/70 hover:text-foreground/80',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground/60 mb-2 capitalize">{parent2?.name ?? 'Parent 2'}</p>
                <div className="flex flex-wrap gap-2">
                  {HELD_ITEMS.map(item => (
                    <button
                      key={String(item.value)}
                      type="button"
                      onClick={() => setP2Item(item.value)}
                      title={item.desc}
                      className={cn(
                        'px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all',
                        p2Item === item.value
                          ? 'bg-primary/15 border-primary/30 text-primary'
                          : 'border-border/40 text-foreground/50 hover:border-border/70 hover:text-foreground/80',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* IVs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <IvEditor label={parent1?.name ?? 'Parent 1'} ivs={p1IVs} onChange={setP1IVs} />
            <IvEditor label={parent2?.name ?? 'Parent 2'} ivs={p2IVs} onChange={setP2IVs} />
          </div>

          {/* Target IVs */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">Target IVs (31 wanted)</p>
            <div className="flex flex-wrap gap-2">
              {IV_STATS.map(stat => (
                <button
                  key={stat}
                  type="button"
                  onClick={() => setTargetIVs(prev => ({ ...prev, [stat]: !prev[stat] }))}
                  className={cn(
                    'px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-wider border transition-all',
                    targetIVs[stat]
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : 'border-border/40 text-foreground/50 hover:border-border/70',
                  )}
                >
                  {STAT_LABELS[stat]}
                </button>
              ))}
            </div>
          </div>

          {/* Target Nature */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">Target Nature</p>
              {(p1Item === 'everstone' || p2Item === 'everstone') && (
                <Badge variant="outline" className="text-[9px] font-black border-green-500/30 text-green-400 bg-green-500/10">
                  Guaranteed via Everstone
                </Badge>
              )}
            </div>
            <select
              value={targetNature}
              onChange={e => setTargetNature(e.target.value as Nature)}
              className="w-full max-w-xs px-3 py-2 rounded-sm border border-border/60 bg-background/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary capitalize"
            >
              {NATURES.map(n => {
                const effect = NATURE_EFFECTS[n];
                const suffix = effect.up ? ` (+${STAT_LABELS[effect.up]}/-${STAT_LABELS[effect.down!]})` : ' (neutral)';
                return <option key={n} value={n}>{n}{suffix}</option>;
              })}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-[11px] font-black uppercase tracking-[0.15em] border border-border/60 text-foreground/60 hover:border-border/80 hover:text-foreground/80 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-[11px] font-black uppercase tracking-[0.15em] bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              See Results <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 2 && compatibility && (
        <div className="glass-panel p-6 md:p-8 rounded-sm space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border/60">
            <div className="p-2 bg-emerald-500/10 rounded-sm">
              <FlaskConical className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-black text-lg text-foreground/90">Breeding Results</h2>
              <p className="text-xs text-foreground/50 font-medium mt-0.5">Probability analysis for your target offspring</p>
            </div>
          </div>

          {!compatibility.compatibility.compatible ? (
            <div className="flex items-start gap-3 p-5 rounded-sm bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm text-red-400 uppercase tracking-wider">Incompatible Parents</p>
                <p className="text-xs text-foreground/60 mt-1">{compatibility.compatibility.reason}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/30 border border-border/40 rounded-sm p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 mb-2">Probability</p>
                  <p className="text-2xl font-black text-primary tabular-nums">
                    {(compatibility.targetIvProbability * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-secondary/30 border border-border/40 rounded-sm p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 mb-2">Expected Eggs</p>
                  <p className="text-2xl font-black text-foreground/90 tabular-nums">
                    {compatibility.expectedEggs === Infinity ? '∞' : `~${compatibility.expectedEggs}`}
                  </p>
                </div>
                <div className="bg-secondary/30 border border-border/40 rounded-sm p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 mb-2">IV Slots</p>
                  <p className="text-2xl font-black text-blue-400 tabular-nums">{compatibility.ivSlotsInherited}</p>
                </div>
                <div className={cn(
                  'border rounded-sm p-4 text-center',
                  compatibility.natureGuaranteed
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-secondary/30 border-border/40',
                )}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 mb-2">Nature</p>
                  <p className={cn(
                    'text-sm font-black capitalize',
                    compatibility.natureGuaranteed ? 'text-green-400' : 'text-foreground/60',
                  )}>
                    {compatibility.natureGuaranteed ? `${targetNature} ✓` : 'Random'}
                  </p>
                </div>
              </div>

              {/* IV Breakdown table */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">IV Inheritance Breakdown</p>
                <div className="rounded-sm border border-border/40 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/30 border-b border-border/40">
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40">Stat</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40">Best Source</th>
                        <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40">P1 IV</th>
                        <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40">P2 IV</th>
                        <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40">Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {IV_STATS.map(stat => {
                        const slot = compatibility.ivBreakdown.find(s => s.stat === stat);
                        const isTarget = !!targetIVs[stat];
                        return (
                          <tr key={stat} className={cn('transition-colors', isTarget && 'bg-primary/5')}>
                            <td className={cn('px-4 py-2.5 font-black', STAT_COLORS[stat])}>
                              {STAT_LABELS[stat]}
                            </td>
                            <td className="px-4 py-2.5 text-foreground/70 font-semibold capitalize">
                              {slot ? (slot.guaranteed ? `${slot.source} (guaranteed)` : slot.source) : '-'}
                            </td>
                            <td className={cn('px-4 py-2.5 text-center font-black tabular-nums', p1IVs[stat] === 31 ? 'text-green-400' : 'text-foreground/70')}>
                              {p1IVs[stat]}
                            </td>
                            <td className={cn('px-4 py-2.5 text-center font-black tabular-nums', p2IVs[stat] === 31 ? 'text-green-400' : 'text-foreground/70')}>
                              {p2IVs[stat]}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {isTarget ? (
                                <span className="text-primary font-black text-[11px]">31 ✓</span>
                              ) : (
                                <span className="text-foreground/30 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tips */}
              <div className="flex items-start gap-3 p-4 rounded-sm bg-blue-500/10 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-foreground/60">
                  {!compatibility.ivSlotsInherited || compatibility.ivSlotsInherited < 5 ? (
                    <p>Tip: Give one parent a <span className="font-black text-foreground/80">Destiny Knot</span> to inherit 5 IVs instead of 3.</p>
                  ) : null}
                  {!compatibility.natureGuaranteed && (
                    <p>Tip: Give a parent an <span className="font-black text-foreground/80">Everstone</span> to guarantee the nature.</p>
                  )}
                  <p>Gen 9 Picnic Breeding works with the same mechanics — no Nursery required.</p>
                </div>
              </div>

              {/* Link to Egg Move Explorer */}
              {parent1 && (
                <div className="flex items-center justify-between p-4 rounded-sm bg-secondary/20 border border-border/40">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-foreground/60">Egg Move Explorer</p>
                    <p className="text-[11px] text-foreground/40 mt-0.5">View all egg moves for {parent1.name}</p>
                  </div>
                  <Link
                    href={`/breeding?pokemon=${parent1.name}&tab=egg-moves`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                  >
                    Explore <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-[11px] font-black uppercase tracking-[0.15em] border border-border/60 text-foreground/60 hover:border-border/80 hover:text-foreground/80 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => { setStep(0); setParent1(null); setParent2(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-[11px] font-black uppercase tracking-[0.15em] border border-border/60 text-foreground/60 hover:border-border/80 hover:text-foreground/80 transition-all"
            >
              <Shuffle className="h-3.5 w-3.5" /> New Pair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
