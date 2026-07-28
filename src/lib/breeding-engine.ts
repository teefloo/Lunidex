/**
 * Breeding Engine — Gen 6+ rules (Destiny Knot, Everstone, Power Items)
 * Also covers Gen 9 Picnic Breeding mechanics (same calculation).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IVStat = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export const IV_STATS: IVStat[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export type IVSet = Record<IVStat, number>;

export type HeldBreedItem =
  | 'destiny-knot'
  | 'everstone'
  | 'power-weight'   // HP
  | 'power-bracer'   // Atk
  | 'power-belt'     // Def
  | 'power-lens'     // SpA
  | 'power-band'     // SpD
  | 'power-anklet'   // Spe
  | null;

/** Maps power items to the IV stat they guarantee */
export const POWER_ITEM_IV: Record<string, IVStat> = {
  'power-weight': 'hp',
  'power-bracer': 'atk',
  'power-belt': 'def',
  'power-lens': 'spa',
  'power-band': 'spd',
  'power-anklet': 'spe',
};

export interface BreederPokemon {
  name: string;
  ivs: IVSet;
  nature: string;
  heldItem?: HeldBreedItem;
  gender: 'male' | 'female' | 'genderless';
  eggGroups: string[];
  isGenderless?: boolean;
  isDitto?: boolean;
  isLegendary?: boolean;
  isMythical?: boolean;
}

export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
  sharedGroups: string[];
  eggSpecies: string;
}

export interface IVSlotResult {
  stat: IVStat;
  source: 'parent1' | 'parent2' | 'random';
  value: number;
  guaranteed: boolean;
}

export interface BreedingResult {
  targetIvProbability: number;
  expectedEggs: number;
  natureGuaranteed: boolean;
  ivSlotsInherited: number;
  compatibility: CompatibilityResult;
  ivBreakdown: IVSlotResult[];
}

export interface EggMove {
  name: string;
  sourceSpecies: string[];
}

export interface BreedingChainStep {
  step: number;
  parent1: string;
  parent2: string;
  targetMoves: string[];
  note?: string;
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

const UNDISCOVERED_GROUP = 'no-eggs';
const DITTO_GROUP = 'ditto';

/**
 * Determines if two Pokémon can breed and returns metadata.
 */
export function checkCompatibility(p1: BreederPokemon, p2: BreederPokemon): CompatibilityResult {
  const isDitto1 = p1.isDitto || p1.eggGroups.includes(DITTO_GROUP);
  const isDitto2 = p2.isDitto || p2.eggGroups.includes(DITTO_GROUP);

  // Legendary / mythical cannot breed (even with Ditto)
  if (p1.isLegendary || p1.isMythical) {
    return { compatible: false, reason: 'Legendary/Mythical Pokémon cannot breed.', sharedGroups: [], eggSpecies: '' };
  }
  if (p2.isLegendary || p2.isMythical) {
    return { compatible: false, reason: 'Legendary/Mythical Pokémon cannot breed.', sharedGroups: [], eggSpecies: '' };
  }

  // Undiscovered egg group cannot breed
  if (p1.eggGroups.includes(UNDISCOVERED_GROUP)) {
    return { compatible: false, reason: `${p1.name} is in the Undiscovered egg group and cannot breed.`, sharedGroups: [], eggSpecies: '' };
  }
  if (p2.eggGroups.includes(UNDISCOVERED_GROUP)) {
    return { compatible: false, reason: `${p2.name} is in the Undiscovered egg group and cannot breed.`, sharedGroups: [], eggSpecies: '' };
  }

  // Two Dittos cannot breed with each other
  if (isDitto1 && isDitto2) {
    return { compatible: false, reason: 'Two Dittos cannot breed together.', sharedGroups: [], eggSpecies: '' };
  }

  // Ditto can breed with almost anything
  if (isDitto1 || isDitto2) {
    const nonDitto = isDitto1 ? p2 : p1;
    return {
      compatible: true,
      sharedGroups: [DITTO_GROUP],
      eggSpecies: nonDitto.name,
    };
  }

  // Genderless Pokémon can only breed with Ditto
  if ((p1.isGenderless || p1.gender === 'genderless') && (p2.isGenderless || p2.gender === 'genderless')) {
    return { compatible: false, reason: 'Genderless Pokémon can only breed with Ditto.', sharedGroups: [], eggSpecies: '' };
  }
  if (p1.isGenderless || p1.gender === 'genderless') {
    return { compatible: false, reason: `${p1.name} is genderless and can only breed with Ditto.`, sharedGroups: [], eggSpecies: '' };
  }
  if (p2.isGenderless || p2.gender === 'genderless') {
    return { compatible: false, reason: `${p2.name} is genderless and can only breed with Ditto.`, sharedGroups: [], eggSpecies: '' };
  }

  // Same gender cannot breed
  if (p1.gender === p2.gender) {
    return { compatible: false, reason: 'Two Pokémon of the same gender cannot breed.', sharedGroups: [], eggSpecies: '' };
  }

  // Check shared egg groups
  const sharedGroups = p1.eggGroups.filter(g => p2.eggGroups.includes(g));
  if (sharedGroups.length === 0) {
    return {
      compatible: false,
      reason: `${p1.name} and ${p2.name} share no egg groups.`,
      sharedGroups: [],
      eggSpecies: '',
    };
  }

  // Egg species is always the female parent's species
  const female = p1.gender === 'female' ? p1 : p2;
  return { compatible: true, sharedGroups, eggSpecies: female.name };
}

// ---------------------------------------------------------------------------
// IV Probability
// ---------------------------------------------------------------------------

/**
 * Returns the probability that, for a single egg, every IV in `targetIVs` (where value = 31)
 * comes out as 31, given the parents' IV pools and Destiny Knot usage.
 *
 * Algorithm (Gen 6+):
 *  - With Destiny Knot: 5 distinct IV stats are selected; each is inherited
 *    from one of the parents with equal probability.
 *  - Without Destiny Knot: 3 distinct IV stats are inherited by the same rule.
 *  - Power Items guarantee one specific IV from the holding parent.
 *  - Remaining non-inherited slots are random 0–31 (probability 1/32 to hit 31).
 *
 * We enumerate the possible inherited-stat subsets and parent sources exactly.
 * The inherited slots are selected without replacement, so multiplying the
 * marginal probability for each IV would incorrectly treat those slots as
 * independent.
 */
export function calcIvProbability(
  parent1IVs: IVSet,
  parent2IVs: IVSet,
  targetIVs: Partial<Record<IVStat, boolean>>,
  hasDestinyKnot: boolean,
  p1HeldItem?: HeldBreedItem,
  p2HeldItem?: HeldBreedItem,
): number {
  const targetStats = IV_STATS.filter(s => targetIVs[s]);
  if (targetStats.length === 0) return 1;

  const inheritedSlots = hasDestinyKnot ? 5 : 3;
  const powerItemChoices = getPowerItemChoices(p1HeldItem, p2HeldItem);

  return powerItemChoices.reduce(
    (probability, choice) => probability + choice.probability * calcProbabilityForPowerItem(
      parent1IVs,
      parent2IVs,
      targetStats,
      inheritedSlots,
      choice,
    ),
    0,
  );
}

interface PowerItemChoice {
  stat: IVStat | null;
  source: 'parent1' | 'parent2' | null;
  probability: number;
}

function getPowerItemChoices(
  p1HeldItem?: HeldBreedItem,
  p2HeldItem?: HeldBreedItem,
): PowerItemChoice[] {
  const p1Stat = p1HeldItem ? POWER_ITEM_IV[p1HeldItem] : undefined;
  const p2Stat = p2HeldItem ? POWER_ITEM_IV[p2HeldItem] : undefined;

  if (p1Stat && p2Stat) {
    // When both parents hold Power items, one item's forced inheritance is
    // selected at random; the other does not apply to that egg.
    return [
      { stat: p1Stat, source: 'parent1', probability: 0.5 },
      { stat: p2Stat, source: 'parent2', probability: 0.5 },
    ];
  }
  if (p1Stat) return [{ stat: p1Stat, source: 'parent1', probability: 1 }];
  if (p2Stat) return [{ stat: p2Stat, source: 'parent2', probability: 1 }];
  return [{ stat: null, source: null, probability: 1 }];
}

function calcProbabilityForPowerItem(
  parent1IVs: IVSet,
  parent2IVs: IVSet,
  targetStats: IVStat[],
  inheritedSlots: number,
  powerItem: PowerItemChoice,
): number {
  const availableStats = powerItem.stat
    ? IV_STATS.filter((stat) => stat !== powerItem.stat)
    : IV_STATS;
  const inheritedStatSets = combinations(availableStats, inheritedSlots - (powerItem.stat ? 1 : 0));
  const randomTargetProbability = 1 / 32;

  return inheritedStatSets.reduce((total, inheritedSet) => {
    const inheritedSources = powerItem.stat
      ? new Map<IVStat, 'parent1' | 'parent2'>([[powerItem.stat, powerItem.source!]])
      : new Map<IVStat, 'parent1' | 'parent2'>();

    return total + probabilityForSources(
      inheritedSet,
      0,
      inheritedSources,
      parent1IVs,
      parent2IVs,
      targetStats,
      randomTargetProbability,
    ) / inheritedStatSets.length;
  }, 0);
}

function probabilityForSources(
  inheritedStats: IVStat[],
  index: number,
  inheritedSources: Map<IVStat, 'parent1' | 'parent2'>,
  parent1IVs: IVSet,
  parent2IVs: IVSet,
  targetStats: IVStat[],
  randomTargetProbability: number,
): number {
  if (index === inheritedStats.length) {
    return targetStats.reduce((probability, stat) => {
      const source = inheritedSources.get(stat);
      if (!source) return probability * randomTargetProbability;
      const inheritedValue = source === 'parent1' ? parent1IVs[stat] : parent2IVs[stat];
      return inheritedValue === 31 ? probability : 0;
    }, 1);
  }

  const stat = inheritedStats[index];
  inheritedSources.set(stat, 'parent1');
  const fromParent1 = probabilityForSources(
    inheritedStats, index + 1, inheritedSources, parent1IVs, parent2IVs, targetStats, randomTargetProbability,
  );
  inheritedSources.set(stat, 'parent2');
  const fromParent2 = probabilityForSources(
    inheritedStats, index + 1, inheritedSources, parent1IVs, parent2IVs, targetStats, randomTargetProbability,
  );
  inheritedSources.delete(stat);

  return (fromParent1 + fromParent2) / 2;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (size > items.length) return [];

  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index++) {
    for (const remainder of combinations(items.slice(index + 1), size - 1)) {
      result.push([items[index], ...remainder]);
    }
  }
  return result;
}

/**
 * Expected number of eggs to get one with the desired IVs.
 */
export function calcExpectedEggs(probability: number): number {
  if (probability <= 0) return Infinity;
  if (probability >= 1) return 1;
  return Math.round(1 / probability);
}

// ---------------------------------------------------------------------------
// IV Breakdown
// ---------------------------------------------------------------------------

/**
 * Produces a human-readable breakdown of which IV slots are inherited
 * and from which parent.
 */
export function getIvBreakdown(
  parent1IVs: IVSet,
  parent2IVs: IVSet,
  hasDestinyKnot: boolean,
  p1HeldItem?: HeldBreedItem,
  p2HeldItem?: HeldBreedItem,
): IVSlotResult[] {
  const results: IVSlotResult[] = [];

  for (const stat of IV_STATS) {
    const guaranteedFromP1 = p1HeldItem && POWER_ITEM_IV[p1HeldItem] === stat;
    const guaranteedFromP2 = p2HeldItem && POWER_ITEM_IV[p2HeldItem] === stat;

    if (guaranteedFromP1) {
      results.push({ stat, source: 'parent1', value: parent1IVs[stat], guaranteed: true });
    } else if (guaranteedFromP2) {
      results.push({ stat, source: 'parent2', value: parent2IVs[stat], guaranteed: true });
    } else {
      // Show best possible source
      const best = parent1IVs[stat] >= parent2IVs[stat] ? 'parent1' : 'parent2';
      const bestVal = best === 'parent1' ? parent1IVs[stat] : parent2IVs[stat];
      results.push({ stat, source: best, value: bestVal, guaranteed: false });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Full Breeding Result
// ---------------------------------------------------------------------------

export function calcBreedingResult(
  parent1: BreederPokemon,
  parent2: BreederPokemon,
  targetIVs: Partial<Record<IVStat, boolean>>,
): BreedingResult {
  const compatibility = checkCompatibility(parent1, parent2);

  const hasDestinyKnot =
    parent1.heldItem === 'destiny-knot' || parent2.heldItem === 'destiny-knot';
  const everstoneHolder =
    parent1.heldItem === 'everstone' ? parent1 :
    parent2.heldItem === 'everstone' ? parent2 : null;
  const natureGuaranteed = everstoneHolder !== null;
  const ivSlotsInherited = hasDestinyKnot ? 5 : 3;

  const targetIvProbability = compatibility.compatible
    ? calcIvProbability(parent1.ivs, parent2.ivs, targetIVs, hasDestinyKnot, parent1.heldItem, parent2.heldItem)
    : 0;
  const expectedEggs = calcExpectedEggs(targetIvProbability);
  const ivBreakdown = getIvBreakdown(parent1.ivs, parent2.ivs, hasDestinyKnot, parent1.heldItem, parent2.heldItem);

  return {
    targetIvProbability,
    expectedEggs,
    natureGuaranteed,
    ivSlotsInherited,
    compatibility,
    ivBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Egg Moves
// ---------------------------------------------------------------------------

/**
 * Given the species' egg moves (from PokéAPI move list filtered by learn method = "egg"),
 * returns which species in the same egg group can pass each move.
 *
 * NOTE: In practice, the list of source species requires an API call per move.
 * This function accepts pre-fetched data.
 */
export function getEggMoves(
  speciesEggMoves: string[],
  eggMoveSources: Record<string, string[]>, // moveName → list of species
): EggMove[] {
  return speciesEggMoves.map(moveName => ({
    name: moveName,
    sourceSpecies: eggMoveSources[moveName] ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Breeding Chain Suggestion
// ---------------------------------------------------------------------------

/**
 * Suggests the optimal breeding chain order when multiple egg moves from
 * different source species need to be combined.
 *
 * Strategy:
 *  1. Start with the species that has the most desired egg moves natively.
 *  2. Breed intermediates one move at a time.
 *  3. Each step produces a Pokémon that carries the accumulated moves.
 */
export function suggestBreedingChain(
  targetPokemon: string,
  targetMoves: string[],
  moveSources: Record<string, string[]>, // moveName → compatible source species
): BreedingChainStep[] {
  if (targetMoves.length === 0) return [];
  if (targetMoves.length === 1) {
    return [{
      step: 1,
      parent1: moveSources[targetMoves[0]]?.[0] ?? 'Unknown',
      parent2: targetPokemon,
      targetMoves: [targetMoves[0]],
      note: `Breed ${targetPokemon} with a ${moveSources[targetMoves[0]]?.[0] ?? 'compatible Pokémon'} that knows ${targetMoves[0]}.`,
    }];
  }

  const steps: BreedingChainStep[] = [];
  // Group moves by their primary source species
  const sourceGroups: Map<string, string[]> = new Map();
  for (const move of targetMoves) {
    const sources = moveSources[move] ?? [];
    const primary = sources[0] ?? 'Unknown';
    if (!sourceGroups.has(primary)) sourceGroups.set(primary, []);
    sourceGroups.get(primary)!.push(move);
  }

  let stepNum = 1;
  let currentCarrier = targetPokemon;
  const accumulated: string[] = [];

  for (const [source, moves] of sourceGroups) {
    accumulated.push(...moves);
    steps.push({
      step: stepNum++,
      parent1: source,
      parent2: currentCarrier,
      targetMoves: [...accumulated],
      note: `Breed ${currentCarrier} with ${source} to pass: ${moves.join(', ')}.`,
    });
    // After first step the carrier is the target species (female line)
    currentCarrier = targetPokemon;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Nature helpers
// ---------------------------------------------------------------------------

export const NATURES = [
  'hardy','lonely','brave','adamant','naughty',
  'bold','docile','relaxed','impish','lax',
  'timid','hasty','serious','jolly','naive',
  'modest','mild','quiet','bashful','rash',
  'calm','gentle','sassy','careful','quirky',
] as const;

export type Nature = typeof NATURES[number];

export const NATURE_EFFECTS: Record<Nature, { up: IVStat | null; down: IVStat | null }> = {
  hardy:   { up: null,  down: null  },
  lonely:  { up: 'atk', down: 'def' },
  brave:   { up: 'atk', down: 'spe' },
  adamant: { up: 'atk', down: 'spa' },
  naughty: { up: 'atk', down: 'spd' },
  bold:    { up: 'def', down: 'atk' },
  docile:  { up: null,  down: null  },
  relaxed: { up: 'def', down: 'spe' },
  impish:  { up: 'def', down: 'spa' },
  lax:     { up: 'def', down: 'spd' },
  timid:   { up: 'spe', down: 'atk' },
  hasty:   { up: 'spe', down: 'def' },
  serious: { up: null,  down: null  },
  jolly:   { up: 'spe', down: 'spa' },
  naive:   { up: 'spe', down: 'spd' },
  modest:  { up: 'spa', down: 'atk' },
  mild:    { up: 'spa', down: 'def' },
  quiet:   { up: 'spa', down: 'spe' },
  bashful: { up: null,  down: null  },
  rash:    { up: 'spa', down: 'spd' },
  calm:    { up: 'spd', down: 'atk' },
  gentle:  { up: 'spd', down: 'def' },
  sassy:   { up: 'spd', down: 'spe' },
  careful: { up: 'spd', down: 'spa' },
  quirky:  { up: null,  down: null  },
};
