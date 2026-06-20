import { describe, it, expect } from 'vitest';
import {
  rankAutoCompleteCandidates,
  isObtainable,
  isRestrictedFormName,
  classifyRoleByStats,
  getBaseStatTotal,
  DEFAULT_AUTO_COMPLETE_OPTIONS,
  AutoCompleteOptions,
} from './auto-complete';
import { PokemonBasicData, TYPE_COLORS } from '../types/pokemon';
import { TypeRelations } from '../api';
import { analyzeTeam } from './team-analysis';

function makeBasicPokemon(overrides: Partial<PokemonBasicData> & { id: number; name: string }): PokemonBasicData {
  const defaultStats = [
    { base_stat: 80, pokemon_v2_stat: { name: 'hp' } },
    { base_stat: 80, pokemon_v2_stat: { name: 'attack' } },
    { base_stat: 80, pokemon_v2_stat: { name: 'defense' } },
    { base_stat: 80, pokemon_v2_stat: { name: 'special-attack' } },
    { base_stat: 80, pokemon_v2_stat: { name: 'special-defense' } },
    { base_stat: 80, pokemon_v2_stat: { name: 'speed' } },
  ];
  return {
    id: overrides.id,
    name: overrides.name,
    height: 10,
    weight: 100,
    pokemon_v2_pokemonstats: overrides.pokemon_v2_pokemonstats ?? defaultStats,
    pokemon_v2_pokemonspecy: overrides.pokemon_v2_pokemonspecy ?? {
      is_legendary: false,
      is_mythical: false,
      generation_id: 1,
      pokemon_v2_pokemoncolor: { name: 'green' },
      pokemon_v2_pokemonshape: { name: 'ball' },
      pokemon_v2_pokemonegggroups: [],
      pokemon_v2_pokemonspeciesnames: [],
    },
    pokemon_v2_pokemontypes: overrides.pokemon_v2_pokemontypes ?? [
      { pokemon_v2_type: { name: 'normal' } },
    ],
  };
}

function makeTypeRelations(): Record<string, TypeRelations> {
  const relations: Record<string, TypeRelations> = {};
  for (const typeName of Object.keys(TYPE_COLORS)) {
    relations[typeName] = {
      damage_relations: {
        double_damage_from: [],
        double_damage_to: [],
        half_damage_from: [],
        half_damage_to: [],
        no_damage_from: [],
        no_damage_to: [],
      },
    };
  }
  return relations;
}

describe('auto-complete isObtainable', () => {
  const pikachuLike = makeBasicPokemon({
    id: 25,
    name: 'pikachu',
    pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'electric' } }],
    pokemon_v2_pokemonspecy: {
      is_legendary: false,
      is_mythical: false,
      generation_id: 1,
      pokemon_v2_pokemoncolor: { name: 'yellow' },
      pokemon_v2_pokemonshape: { name: 'ball' },
      pokemon_v2_pokemonegggroups: [],
      pokemon_v2_pokemonspeciesnames: [],
    },
  });

  it('rejects legendary pokemon when includeLegendaries=false', () => {
    const mewtwo = makeBasicPokemon({
      id: 150,
      name: 'mewtwo',
      pokemon_v2_pokemonspecy: {
        is_legendary: true,
        is_mythical: false,
        generation_id: 1,
        pokemon_v2_pokemoncolor: { name: 'purple' },
        pokemon_v2_pokemonshape: { name: 'humanoid' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    expect(isObtainable(mewtwo, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(false);
  });

  it('rejects mythical pokemon when includeMythicals=false', () => {
    const mew = makeBasicPokemon({
      id: 151,
      name: 'mew',
      pokemon_v2_pokemonspecy: {
        is_legendary: false,
        is_mythical: true,
        generation_id: 1,
        pokemon_v2_pokemoncolor: { name: 'pink' },
        pokemon_v2_pokemonshape: { name: 'ball' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    expect(isObtainable(mew, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(false);
  });

  it('allows non-legendary non-mythical pokemon by default', () => {
    expect(isObtainable(pikachuLike, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(true);
  });

  it('filters by target generation when specified', () => {
    const options: AutoCompleteOptions = { ...DEFAULT_AUTO_COMPLETE_OPTIONS, targetGeneration: 1 };
    expect(isObtainable(pikachuLike, options)).toBe(true);

    const charizard = makeBasicPokemon({
      id: 6,
      name: 'charizard',
      pokemon_v2_pokemonspecy: {
        is_legendary: false,
        is_mythical: false,
        generation_id: 1,
        pokemon_v2_pokemoncolor: { name: 'red' },
        pokemon_v2_pokemonshape: { name: 'upright' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    expect(isObtainable(charizard, options)).toBe(true);

    const gen2Pokemon = makeBasicPokemon({
      id: 152,
      name: 'chikorita',
      pokemon_v2_pokemonspecy: {
        is_legendary: false,
        is_mythical: false,
        generation_id: 2,
        pokemon_v2_pokemoncolor: { name: 'green' },
        pokemon_v2_pokemonshape: { name: 'ball' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    expect(isObtainable(gen2Pokemon, options)).toBe(false);
  });

  it('rejects mega forms by default', () => {
    const megaCharizardX = makeBasicPokemon({
      id: 10034,
      name: 'charizard-mega-x',
      pokemon_v2_pokemontypes: [
        { pokemon_v2_type: { name: 'fire' } },
        { pokemon_v2_type: { name: 'dragon' } },
      ],
    });
    const megaGengar = makeBasicPokemon({
      id: 10038,
      name: 'gengar-mega',
      pokemon_v2_pokemontypes: [
        { pokemon_v2_type: { name: 'ghost' } },
        { pokemon_v2_type: { name: 'poison' } },
      ],
    });
    expect(isObtainable(megaCharizardX, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(false);
    expect(isObtainable(megaGengar, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(false);
  });

  it('rejects gigantamax forms by default', () => {
    const gmaxCharizard = makeBasicPokemon({
      id: 10196,
      name: 'charizard-gmax',
      pokemon_v2_pokemontypes: [
        { pokemon_v2_type: { name: 'fire' } },
        { pokemon_v2_type: { name: 'flying' } },
      ],
    });
    expect(isObtainable(gmaxCharizard, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(false);
  });

  it('allows base forms with regional variants', () => {
    const alolanRaichu = makeBasicPokemon({
      id: 10100,
      name: 'raichu-alola',
      pokemon_v2_pokemontypes: [
        { pokemon_v2_type: { name: 'electric' } },
        { pokemon_v2_type: { name: 'psychic' } },
      ],
    });
    const galarianZapdos = makeBasicPokemon({
      id: 10145,
      name: 'zapdos-galar',
      pokemon_v2_pokemontypes: [
        { pokemon_v2_type: { name: 'fighting' } },
        { pokemon_v2_type: { name: 'flying' } },
      ],
      pokemon_v2_pokemonspecy: {
        is_legendary: true,
        is_mythical: false,
        generation_id: 8,
        pokemon_v2_pokemoncolor: { name: 'yellow' },
        pokemon_v2_pokemonshape: { name: 'wings' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    expect(isObtainable(alolanRaichu, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(true);
    expect(isObtainable(galarianZapdos, DEFAULT_AUTO_COMPLETE_OPTIONS)).toBe(false);
  });

  it('allows mega forms when excludeSpecialForms=false', () => {
    const megaGengar = makeBasicPokemon({
      id: 10038,
      name: 'gengar-mega',
    });
    const options: AutoCompleteOptions = {
      ...DEFAULT_AUTO_COMPLETE_OPTIONS,
      excludeSpecialForms: false,
    };
    expect(isObtainable(megaGengar, options)).toBe(true);
  });
});

describe('auto-complete isRestrictedFormName', () => {
  it('detects mega forms', () => {
    expect(isRestrictedFormName('venusaur-mega')).toBe(true);
    expect(isRestrictedFormName('charizard-mega-x')).toBe(true);
    expect(isRestrictedFormName('mewtwo-mega-y')).toBe(true);
  });

  it('detects gigantamax forms', () => {
    expect(isRestrictedFormName('pikachu-gmax')).toBe(true);
    expect(isRestrictedFormName('charizard-gmax')).toBe(true);
  });

  it('detects primal forms', () => {
    expect(isRestrictedFormName('kyogre-primal')).toBe(true);
    expect(isRestrictedFormName('groudon-primal')).toBe(true);
  });

  it('does not flag regular forms', () => {
    expect(isRestrictedFormName('pikachu')).toBe(false);
    expect(isRestrictedFormName('raichu')).toBe(false);
    expect(isRestrictedFormName('charizard')).toBe(false);
  });

  it('does not flag regional variants', () => {
    expect(isRestrictedFormName('raichu-alola')).toBe(false);
    expect(isRestrictedFormName('zapdos-galar')).toBe(false);
    expect(isRestrictedFormName('growlithe-hisui')).toBe(false);
    expect(isRestrictedFormName('wooper-paldea')).toBe(false);
  });
});

describe('auto-complete getBaseStatTotal', () => {
  it('sums base stats correctly', () => {
    const p = makeBasicPokemon({ id: 1, name: 'bulbasaur' });
    expect(getBaseStatTotal(p)).toBe(480);
  });
});

describe('auto-complete classifyRoleByStats', () => {
  it('detects speedster', () => {
    const p = makeBasicPokemon({
      id: 1,
      name: 'fast',
      pokemon_v2_pokemonstats: [
        { base_stat: 70, pokemon_v2_stat: { name: 'hp' } },
        { base_stat: 120, pokemon_v2_stat: { name: 'attack' } },
        { base_stat: 70, pokemon_v2_stat: { name: 'defense' } },
        { base_stat: 70, pokemon_v2_stat: { name: 'special-attack' } },
        { base_stat: 70, pokemon_v2_stat: { name: 'special-defense' } },
        { base_stat: 130, pokemon_v2_stat: { name: 'speed' } },
      ],
    });
    expect(classifyRoleByStats(p.pokemon_v2_pokemonstats)).toBe('speedster');
  });

  it('detects wall', () => {
    const p = makeBasicPokemon({
      id: 1,
      name: 'tank',
      pokemon_v2_pokemonstats: [
        { base_stat: 110, pokemon_v2_stat: { name: 'hp' } },
        { base_stat: 60, pokemon_v2_stat: { name: 'attack' } },
        { base_stat: 120, pokemon_v2_stat: { name: 'defense' } },
        { base_stat: 60, pokemon_v2_stat: { name: 'special-attack' } },
        { base_stat: 120, pokemon_v2_stat: { name: 'special-defense' } },
        { base_stat: 40, pokemon_v2_stat: { name: 'speed' } },
      ],
    });
    expect(classifyRoleByStats(p.pokemon_v2_pokemonstats)).toBe('wall');
  });

  it('detects physical-tank', () => {
    const p = makeBasicPokemon({
      id: 1,
      name: 'ptank',
      pokemon_v2_pokemonstats: [
        { base_stat: 95, pokemon_v2_stat: { name: 'hp' } },
        { base_stat: 110, pokemon_v2_stat: { name: 'attack' } },
        { base_stat: 120, pokemon_v2_stat: { name: 'defense' } },
        { base_stat: 60, pokemon_v2_stat: { name: 'special-attack' } },
        { base_stat: 70, pokemon_v2_stat: { name: 'special-defense' } },
        { base_stat: 50, pokemon_v2_stat: { name: 'speed' } },
      ],
    });
    expect(classifyRoleByStats(p.pokemon_v2_pokemonstats)).toBe('physical-tank');
  });

  it('detects all-rounder for balanced stats', () => {
    const p = makeBasicPokemon({
      id: 1,
      name: 'balanced',
      pokemon_v2_pokemonstats: [
        { base_stat: 90, pokemon_v2_stat: { name: 'hp' } },
        { base_stat: 90, pokemon_v2_stat: { name: 'attack' } },
        { base_stat: 90, pokemon_v2_stat: { name: 'defense' } },
        { base_stat: 90, pokemon_v2_stat: { name: 'special-attack' } },
        { base_stat: 90, pokemon_v2_stat: { name: 'special-defense' } },
        { base_stat: 90, pokemon_v2_stat: { name: 'speed' } },
      ],
    });
    expect(classifyRoleByStats(p.pokemon_v2_pokemonstats)).toBe('all-rounder');
  });
});

describe('auto-complete rankAutoCompleteCandidates', () => {
  it('does not include team members in suggestions', () => {
    const currentMember = makeBasicPokemon({
      id: 25,
      name: 'pikachu',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'electric' } }],
    });
    const detail = buildPokemonDetail(currentMember);
    const candidates = [
      currentMember,
      makeBasicPokemon({ id: 1, name: 'bulbasaur', pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }] }),
    ];
    const relations = makeTypeRelations();
    const analysis = analyzeTeam([detail], relations);
    const result = rankAutoCompleteCandidates([detail], analysis, candidates, relations);
    expect(result.added.find(p => p.id === 25)).toBeUndefined();
  });

  it('excludes legendary and mythical pokemon from suggestions', () => {
    const detail = buildPokemonDetail(
      makeBasicPokemon({
        id: 1,
        name: 'bulbasaur',
        pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      })
    );
    const mewtwo = makeBasicPokemon({
      id: 150,
      name: 'mewtwo',
      pokemon_v2_pokemonspecy: {
        is_legendary: true,
        is_mythical: false,
        generation_id: 1,
        pokemon_v2_pokemoncolor: { name: 'purple' },
        pokemon_v2_pokemonshape: { name: 'humanoid' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'psychic' } }],
    });
    const mew = makeBasicPokemon({
      id: 151,
      name: 'mew',
      pokemon_v2_pokemonspecy: {
        is_legendary: false,
        is_mythical: true,
        generation_id: 1,
        pokemon_v2_pokemoncolor: { name: 'pink' },
        pokemon_v2_pokemonshape: { name: 'ball' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'psychic' } }],
    });
    const regular = makeBasicPokemon({
      id: 65,
      name: 'alakazam',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'psychic' } }],
    });
    const relations = makeTypeRelations();
    const analysis = analyzeTeam([detail], relations);
    const result = rankAutoCompleteCandidates(
      [detail],
      analysis,
      [mewtwo, mew, regular],
      relations
    );
    const addedIds = result.added.map(p => p.id);
    expect(addedIds).not.toContain(150);
    expect(addedIds).not.toContain(151);
  });

  it('respects target generation filter', () => {
    const detail = buildPokemonDetail(
      makeBasicPokemon({
        id: 1,
        name: 'bulbasaur',
        pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      })
    );
    const gen1 = makeBasicPokemon({
      id: 3,
      name: 'venusaur',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      pokemon_v2_pokemonspecy: {
        is_legendary: false,
        is_mythical: false,
        generation_id: 1,
        pokemon_v2_pokemoncolor: { name: 'green' },
        pokemon_v2_pokemonshape: { name: 'quadruped' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    const gen2 = makeBasicPokemon({
      id: 154,
      name: 'meganium',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      pokemon_v2_pokemonspecy: {
        is_legendary: false,
        is_mythical: false,
        generation_id: 2,
        pokemon_v2_pokemoncolor: { name: 'green' },
        pokemon_v2_pokemonshape: { name: 'quadruped' },
        pokemon_v2_pokemonegggroups: [],
        pokemon_v2_pokemonspeciesnames: [],
      },
    });
    const relations = makeTypeRelations();
    const analysis = analyzeTeam([detail], relations);
    const result = rankAutoCompleteCandidates(
      [detail],
      analysis,
      [gen1, gen2],
      relations,
      { ...DEFAULT_AUTO_COMPLETE_OPTIONS, targetGeneration: 1 }
    );
    const addedIds = result.added.map(p => p.id);
    expect(addedIds).toContain(3);
    expect(addedIds).not.toContain(154);
  });

  it('returns empty result when no eligible candidates', () => {
    const detail = buildPokemonDetail(
      makeBasicPokemon({
        id: 1,
        name: 'bulbasaur',
        pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      })
    );
    const relations = makeTypeRelations();
    const analysis = analyzeTeam([detail], relations);
    const result = rankAutoCompleteCandidates(
      [detail],
      analysis,
      [
        makeBasicPokemon({
          id: 150,
          name: 'mewtwo',
          pokemon_v2_pokemonspecy: {
            is_legendary: true,
            is_mythical: false,
            generation_id: 1,
            pokemon_v2_pokemoncolor: { name: 'purple' },
            pokemon_v2_pokemonshape: { name: 'humanoid' },
            pokemon_v2_pokemonegggroups: [],
            pokemon_v2_pokemonspeciesnames: [],
          },
          pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'psychic' } }],
        }),
      ],
      relations
    );
    expect(result.added).toEqual([]);
  });

  it('returns empty when team is full', () => {
    const fullTeam = Array.from({ length: 6 }, (_, i) =>
      buildPokemonDetail(
        makeBasicPokemon({
          id: i + 1,
          name: `p${i}`,
          pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'normal' } }],
        })
      )
    );
    const relations = makeTypeRelations();
    const analysis = analyzeTeam(fullTeam, relations);
    const result = rankAutoCompleteCandidates(
      fullTeam,
      analysis,
      [makeBasicPokemon({ id: 25, name: 'pikachu' })],
      relations
    );
    expect(result.added).toEqual([]);
  });

  it('returns synergy score in result', () => {
    const detail = buildPokemonDetail(
      makeBasicPokemon({
        id: 1,
        name: 'bulbasaur',
        pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      })
    );
    const candidate = makeBasicPokemon({
      id: 6,
      name: 'charizard',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'fire' } }],
    });
    const relations = makeTypeRelations();
    const analysis = analyzeTeam([detail], relations);
    const result = rankAutoCompleteCandidates(
      [detail],
      analysis,
      [candidate],
      relations
    );
    expect(result.added.length).toBeGreaterThan(0);
    expect(typeof result.finalSynergy).toBe('number');
    expect(result.finalSynergy).toBeGreaterThanOrEqual(0);
    expect(result.finalSynergy).toBeLessThanOrEqual(100);
  });

  it('excludes mega and gmax forms from suggestions by default', () => {
    const detail = buildPokemonDetail(
      makeBasicPokemon({
        id: 1,
        name: 'bulbasaur',
        pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'grass' } }],
      })
    );
    const megaGengar = makeBasicPokemon({
      id: 10038,
      name: 'gengar-mega',
      pokemon_v2_pokemontypes: [
        { pokemon_v2_type: { name: 'ghost' } },
        { pokemon_v2_type: { name: 'poison' } },
      ],
    });
    const gmaxPikachu = makeBasicPokemon({
      id: 10100,
      name: 'pikachu-gmax',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'electric' } }],
    });
    const regular = makeBasicPokemon({
      id: 25,
      name: 'pikachu',
      pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'electric' } }],
    });
    const relations = makeTypeRelations();
    const analysis = analyzeTeam([detail], relations);
    const result = rankAutoCompleteCandidates(
      [detail],
      analysis,
      [megaGengar, gmaxPikachu, regular],
      relations
    );
    const addedIds = result.added.map(p => p.id);
    expect(addedIds).not.toContain(10038);
    expect(addedIds).not.toContain(10100);
  });
});

function buildPokemonDetail(p: PokemonBasicData) {
  return {
    id: p.id,
    name: p.name,
    order: p.id,
    is_default: true,
    sprites: {
      front_default: '',
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      other: {
        'official-artwork': { front_default: '', front_shiny: '' },
        showdown: { front_default: '', back_default: '' },
      },
    },
    types: p.pokemon_v2_pokemontypes.map((t, idx) => ({
      slot: idx + 1,
      type: { name: t.pokemon_v2_type.name, url: '' },
    })),
    stats: p.pokemon_v2_pokemonstats.map(s => ({
      base_stat: s.base_stat,
      effort: 0,
      stat: { name: s.pokemon_v2_stat?.name ?? '', url: '' },
    })),
    weight: p.weight ?? 0,
    height: p.height ?? 0,
    base_experience: 0,
    species: { name: p.name, url: '' },
    abilities: [],
    moves: [],
    game_indices: [],
    held_items: [],
    cries: { latest: '', legacy: '' },
    forms: [],
  };
}
