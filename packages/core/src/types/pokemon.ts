export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

export interface PokemonListItem {
  name: string;
  url: string;
}

export interface PokemonDetail {
  id: number;
  name: string;
  order: number;
  is_default: boolean;
  sprites: {
    front_default: string;
    back_default: string;
    front_shiny: string;
    back_shiny: string;
    other: {
      'official-artwork': {
        front_default: string;
        front_shiny: string;
      };
      showdown: {
        front_default: string;
        back_default: string;
      };
    };
  };
  types: {
    slot: number;
    type: {
      name: string;
      url: string;
    };
  }[];
  stats: {
    base_stat: number;
    effort: number;
    stat: {
      name: string;
      url: string;
    };
  }[];
  weight: number;
  height: number;
  base_experience: number;
  species: {
    name: string;
    url: string;
  };
  abilities: {
    ability: {
      name: string;
      url: string;
    };
    is_hidden: boolean;
    slot: number;
  }[];
  moves: {
    move: {
      name: string;
      url: string;
    };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: {
        name: string;
        url: string;
      };
      version_group: {
        name: string;
        url: string;
      };
    }[];
  }[];
  game_indices: {
    game_index: number;
    version: {
      name: string;
      url: string;
    };
  }[];
  held_items: {
    item: {
      name: string;
      url: string;
    };
    version_details: {
      rarity: number;
      version: {
        name: string;
        url: string;
      };
    }[];
  }[];
  cries: {
    latest: string;
    legacy: string;
  };
  forms: {
    name: string;
    url: string;
  }[];
}

export interface LocalizedPokemonData {
  pokemon_v2_pokemonspeciesnames: Array<{
    name: string;
    pokemon_v2_language: {
      name: string;
    };
  }>;
  pokemon_v2_pokemonspeciesflavortexts: Array<{
    flavor_text: string;
    pokemon_v2_language: {
      name: string;
    };
  }>;
}

export interface PokemonSpecies {
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  genera: {
    genus: string;
    language: {
      name: string;
    };
  }[];
  names: {
    name: string;
    language: {
      name: string;
    };
  }[];
  color: {
    name: string;
  };
  habitat: {
    name: string;
  } | null;
  is_legendary: boolean;
  is_mythical: boolean;
  egg_groups: {
    name: string;
    url: string;
  }[];
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  growth_rate: {
    name: string;
    url: string;
  };
  evolution_chain: {
    url: string;
  };
  varieties: {
    is_default: boolean;
    pokemon: {
      name: string;
      url: string;
    };
  }[];
}

export interface PokemonEncounterDetail {
  chance: number;
  condition_values: Array<{ name: string; url: string }>;
  method: { name: string; url: string };
  min_level: number;
  max_level: number;
}

export interface PokemonEncounterVersionDetail {
  max_chance: number;
  encounter_details: PokemonEncounterDetail[];
  version: { name: string; url: string };
}

export interface PokemonEncounter {
  location_area: {
    name: string;
    url: string;
  };
  version_details: PokemonEncounterVersionDetail[];
}

export interface PokemonBasicData {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemonstats: {
    base_stat: number;
    pokemon_v2_stat?: {
      name: string;
    };
  }[];
  pokemon_v2_pokemonspecy: { 
    is_legendary: boolean; 
    is_mythical: boolean;
    generation_id: number;
    pokemon_v2_pokemoncolor: { name: string } | null;
    pokemon_v2_pokemonshape: { name: string } | null;
    pokemon_v2_pokemonegggroups: {
      pokemon_v2_egggroup: { name: string };
    }[];
    pokemon_v2_pokemonspeciesnames: {
      name: string;
      pokemon_v2_language: {
        name: string;
      };
    }[];
  } | null;
  pokemon_v2_pokemontypes: { pokemon_v2_type: { name: string } }[];
}

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

export interface GraphQLPokemonSummary {
  id: number;
  name: string;
  height?: number;
  weight?: number;
  pokemon_v2_pokemonspecy: {
    generation_id: number;
    pokemon_v2_pokemonspeciesnames: Array<{
      name: string;
      pokemon_v2_language: { name: string };
    }>;
  } | null;
  pokemon_v2_pokemontypes: Array<{
    pokemon_v2_type: { name: string };
  }>;
}

export interface GraphQLPokemonSearchIndex {
  id: number;
  name: string;
  pokemon_v2_pokemonspecy: {
    pokemon_v2_pokemonspeciesnames: Array<{
      name: string;
      pokemon_v2_language: { name: string };
    }>;
  } | null;
}

export interface GraphQLPokemonMoveData {
  pokemon_v2_move: {
    name: string;
    power: number | null;
    accuracy: number | null;
    pokemon_v2_type: { name: string };
    pokemon_v2_movedamageclass: { name: string };
    pokemon_v2_movenames: Array<{ name: string }>;
    pokemon_v2_moveflavortexts: Array<{ flavor_text: string }>;
  };
}

export interface LocalizedNameEntry {
  name: string;
  language: string;
}

export interface PokemonCardType {
  type: { name: string; url?: string };
  slot?: number;
}

export interface PokemonFilters {
  types?: string[];
  generation?: number | null;
  sortBy?: string;
  searchTerm?: string;
  selectedEggGroups?: string[];
  selectedColors?: string[];
  selectedShapes?: string[];
  isLegendary?: boolean | null;
  isMythical?: boolean | null;
  minBaseStats?: number;
  minAttack?: number;
  minDefense?: number;
  minSpeed?: number;
  minHp?: number;
  heightRange?: [number, number];
  weightRange?: [number, number];
  selectedRegion?: string | null;
  showFavoritesOnly?: boolean;
  showCaughtOnly?: 'all' | 'caught' | 'uncaught';
  caughtPokemon?: number[];
  favorites?: number[];
}

export interface PokemonSummaryItem {
  id: number;
  name: string;
  types: string[];
  height?: number;
  weight?: number;
  stats?: number[];
  generation?: number;
  localizedNames?: LocalizedNameEntry[];
  isLegendary?: boolean;
  isMythical?: boolean;
  color?: string;
  shape?: string;
  eggGroups?: string[];
}

export interface MoveListItem {
  id: number;
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  type: string;
  damage_class: string;
  localizedName: string;
  description: string;
  generation_id: number | null;
}

export type MoveLearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'technical-record' | 'light-ball-roulette' | 'stadium-surfing-pikachu' | 'form-change' | 'zygarde-cube' | 'repel' | 'trade' | 'special' | 'event' | 'pikachu-pop-star' | 'pikachu-rock-star' | 'cosplay-pikachu' | null;

export interface MovePokemonLearner {
  id: number;
  name: string;
  types: string[];
  localizedName: string;
  learnMethods: MoveLearnMethod[];
  level?: number;
}

export interface GroupedLearners {
  levelUp: MovePokemonLearner[];
  machine: MovePokemonLearner[];
  technicalRecord: MovePokemonLearner[];
  egg: MovePokemonLearner[];
  tutor: MovePokemonLearner[];
  other: MovePokemonLearner[];
}

export interface GraphQLMoveData {
  id: number;
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  generation_id: number | null;
  pokemon_v2_type: { name: string };
  pokemon_v2_movedamageclass: { name: string };
  pokemon_v2_movenames: Array<{ name: string }>;
  pokemon_v2_moveflavortexts: Array<{ flavor_text: string }>;
  pokemon_v2_moveeffect: {
    pokemon_v2_moveeffecteffecttexts: Array<{ short_effect: string; effect: string }>;
  } | null;
}

export interface GraphQLMovePokemonData {
  level: number | null;
  pokemon_v2_movelearnmethod: { name: string } | null;
  pokemon_v2_pokemon: {
    id: number;
    name: string;
    pokemon_v2_pokemontypes: Array<{ pokemon_v2_type: { name: string } }>;
    pokemon_v2_pokemonspecy: {
      pokemon_v2_pokemonspeciesnames: Array<{ name: string }>;
    } | null;
  } | null;
}

export interface GraphQLAbilityData {
  id: number;
  name: string;
  generation_id: number | null;
  is_main_series: boolean;
  pokemon_v2_abilitynames: Array<{ name: string }>;
  pokemon_v2_abilityeffecttexts: Array<{ effect: string; short_effect: string }>;
  pokemon_v2_abilityflavortexts: Array<{ flavor_text: string; pokemon_v2_versiongroup: { name: string } | null }>;
}

export interface GraphQLAbilityPokemonData {
  pokemon_v2_pokemon: {
    id: number;
    name: string;
    pokemon_v2_pokemontypes: Array<{ pokemon_v2_type: { name: string } }>;
    pokemon_v2_pokemonspecy: {
      pokemon_v2_pokemonspeciesnames: Array<{ name: string }>;
    } | null;
  } | null;
  is_hidden: boolean;
  slot: number;
}

export interface AbilityListItem {
  id: number;
  name: string;
  localizedName: string;
  shortEffect: string;
  generationId: number | null;
  isMainSeries: boolean;
}

export interface AbilityPokemonLearner {
  id: number;
  name: string;
  localizedName: string;
  types: string[];
  isHidden: boolean;
  slot: number;
}
