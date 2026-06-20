import { graphqlClient } from './client';
import { getCachedData, setCachedData } from './cache';
import { PokemonBasicData, GraphQLPokemonSummary, GraphQLPokemonSearchIndex, GraphQLPokemonMoveData, LocalizedPokemonData, GraphQLMoveData, GraphQLMovePokemonData, GraphQLAbilityData, GraphQLAbilityPokemonData } from '../types/pokemon';

const BATCH_SIZE = 200;
const SEARCH_BATCH_SIZE = 250;
const MOVE_BATCH_SIZE = 250;

const getBatchCacheKey = (base: string, batchIndex: number) => `${base}-batch-${batchIndex}`;

function describeGraphQLResponse(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable GraphQL response]';
  }
}

const fetchBatch = async <T>(query: string, cacheKey: string, variables?: Record<string, unknown>): Promise<T[]> => {
  const cached = await getCachedData<T[]>(cacheKey, true);
  if (cached) return cached;

  const { data } = await graphqlClient.post<{ data?: { pokemon_v2_pokemon?: T[] } }>('/graphql/v1beta', { query, variables });
  
  if (!data?.data?.pokemon_v2_pokemon) {
    throw new Error(`Invalid GraphQL response in fetchBatch: ${describeGraphQLResponse(data)}`);
  }
  
  const results = data.data.pokemon_v2_pokemon;
  await setCachedData(cacheKey, results);
  return results;
};

const buildPokemonSummarySelection = () => `
  id
  name
  height
  weight
  pokemon_v2_pokemonspecy {
    generation_id
    pokemon_v2_pokemonspeciesnames(where: {pokemon_v2_language: {name: {_in: ["en", "fr", "es", "de", "it", "ja", "ko", "zh-Hans"]}}}) {
      name
      pokemon_v2_language {
        name
      }
    }
  }
  pokemon_v2_pokemontypes {
    pokemon_v2_type {
      name
    }
  }
`;

export const getPokemonSummarySlice = async (
  limit = 80,
  offset = 0,
): Promise<GraphQLPokemonSummary[]> => {
  const cacheKey = `pokemon-summary-slice-v1-${offset}-${limit}`;
  const cached = await getCachedData<GraphQLPokemonSummary[]>(cacheKey, true);
  if (cached) return cached;

  const { data } = await graphqlClient.post<{ data?: { pokemon_v2_pokemon?: GraphQLPokemonSummary[] } }>('/graphql/v1beta', {
    query: `
      query GetPokemonSummarySlice($limit: Int!, $offset: Int!) {
        pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) {
          ${buildPokemonSummarySelection()}
        }
      }
    `,
    variables: { limit, offset },
  });

  const results = data?.data?.pokemon_v2_pokemon ?? [];
  await setCachedData(cacheKey, results);
  return results;
};

const buildPokemonDetailedSelection = () => `
  id
  name
  height
  weight
  pokemon_v2_pokemonstats(order_by: {pokemon_v2_stat: {id: asc}}) {
    base_stat
    pokemon_v2_stat {
      name
    }
  }
  pokemon_v2_pokemonspecy {
    is_legendary
    is_mythical
    generation_id
    pokemon_v2_pokemoncolor {
      name
    }
    pokemon_v2_pokemonshape {
      name
    }
    pokemon_v2_pokemonegggroups {
      pokemon_v2_egggroup {
        name
      }
    }
    pokemon_v2_pokemonspeciesnames(where: {pokemon_v2_language: {name: {_in: ["en", "fr", "es", "de", "it", "ja", "ko", "zh-Hans"]}}}) {
      name
      pokemon_v2_language {
        name
      }
    }
  }
  pokemon_v2_pokemontypes {
    pokemon_v2_type {
      name
    }
  }
`;

const buildPokemonSearchSelection = () => `
  id
  name
  pokemon_v2_pokemonspecy {
    pokemon_v2_pokemonspeciesnames(where: {pokemon_v2_language: {name: {_in: ["en", "fr", "es", "de", "it", "ja", "ko", "zh-Hans"]}}}) {
      name
      pokemon_v2_language {
        name
      }
    }
  }
`;

const fetchPokemonBatches = async <T>(
  cacheBase: string,
  buildQuery: (offset: number, limit: number) => { query: string; variables: Record<string, unknown> },
  batchSize: number,
): Promise<T[][]> => {
  const batches: T[][] = [];
  let offset = 0;

  while (true) {
    const cacheKey = getBatchCacheKey(cacheBase, Math.floor(offset / batchSize));
    const { query, variables } = buildQuery(offset, batchSize);
    const batch = await fetchBatch<T>(query, cacheKey, variables);
    batches.push(batch);

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return batches;
};

const fetchMoveBatches = async <T>(
  cacheBase: string,
  buildQuery: (offset: number, limit: number) => { query: string; variables: Record<string, unknown> },
  batchSize: number,
): Promise<T[][]> => {
  const batches: T[][] = [];
  let offset = 0;

  while (true) {
    const cacheKey = getBatchCacheKey(cacheBase, Math.floor(offset / batchSize));
    const cached = await getCachedData<T[]>(cacheKey, true);
    if (cached) {
      batches.push(cached);
      if (cached.length < batchSize) {
        break;
      }
      offset += batchSize;
      continue;
    }

    const { query, variables } = buildQuery(offset, batchSize);
    const { data } = await graphqlClient.post<{ data?: { pokemon_v2_move?: T[] } }>('/graphql/v1beta', { query, variables });

    if (!data?.data?.pokemon_v2_move) {
      throw new Error(`Invalid GraphQL response in fetchMoveBatches: ${describeGraphQLResponse(data)}`);
    }

    const results = data.data.pokemon_v2_move;
    batches.push(results);
    await setCachedData(cacheKey, results);

    if (results.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return batches;
};

export const getAllPokemonSummary = async (): Promise<GraphQLPokemonSummary[]> => {
  const cacheKey = 'all-pokemon-summary-v1';
  
  const cached = await getCachedData<GraphQLPokemonSummary[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const batches = await fetchPokemonBatches<GraphQLPokemonSummary>(
      'all-pokemon-summary-paginated-v1',
      (offset, limit) => ({
        query: `
          query GetAllPokemonSummary($limit: Int!, $offset: Int!) {
            pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) {
              ${buildPokemonSummarySelection()}
            }
          }
        `,
        variables: { limit, offset },
      }),
      BATCH_SIZE,
    );
    const results = batches.flat();
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    const cachedFallback = await getCachedData<GraphQLPokemonSummary[]>(cacheKey, true);
    if (cachedFallback) return cachedFallback;
    throw error;
  }
};

export const getAllPokemonSummaryPaginated = async (): Promise<GraphQLPokemonSummary[][]> => {
  return fetchPokemonBatches<GraphQLPokemonSummary>(
    'all-pokemon-summary-paginated-v1',
    (offset, limit) => ({
      query: `
        query GetAllPokemonSummaryPaginated($limit: Int!, $offset: Int!) {
          pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) {
            ${buildPokemonSummarySelection()}
          }
        }
      `,
      variables: { limit, offset },
    }),
    BATCH_SIZE,
  );
};

export const getAllPokemonSearchIndex = async (): Promise<GraphQLPokemonSearchIndex[]> => {
  const cacheKey = 'all-pokemon-search-index-v1';

  const cached = await getCachedData<GraphQLPokemonSearchIndex[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const batches = await fetchPokemonBatches<GraphQLPokemonSearchIndex>(
      'all-pokemon-search-index-paginated-v1',
      (offset, limit) => ({
        query: `
          query GetAllPokemonSearchIndex($limit: Int!, $offset: Int!) {
            pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) {
              ${buildPokemonSearchSelection()}
            }
          }
        `,
        variables: { limit, offset },
      }),
      SEARCH_BATCH_SIZE,
    );
    const results = batches.flat();
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    const cachedFallback = await getCachedData<GraphQLPokemonSearchIndex[]>(cacheKey, true);
    if (cachedFallback) return cachedFallback;
    throw error;
  }
};

export const getPokemonDetailedByType = async (type: string): Promise<PokemonBasicData[]> => {
  const cacheKey = `pokemon-detailed-by-type-v1-${type}`;
  const cached = await getCachedData<PokemonBasicData[]>(cacheKey, true);
  if (cached) return cached;

  const { data } = await graphqlClient.post<{ data?: { pokemon_v2_pokemon?: PokemonBasicData[] } }>('/graphql/v1beta', {
    query: `
      query GetPokemonDetailedByType($type: String!) {
        pokemon_v2_pokemon(
          where: {pokemon_v2_pokemontypes: {pokemon_v2_type: {name: {_eq: $type}}}}
          order_by: {id: asc}
        ) {
          ${buildPokemonDetailedSelection()}
        }
      }
    `,
    variables: { type },
  });

  const results = data?.data?.pokemon_v2_pokemon ?? [];
  await setCachedData(cacheKey, results);
  return results;
};

export const getAllPokemonDetailed = async (): Promise<PokemonBasicData[]> => {
  const cacheKey = 'all-pokemon-detailed-v9';
  
  const cached = await getCachedData<PokemonBasicData[]>(cacheKey, true);
  if (cached && cached.length > 0 && cached[0]?.pokemon_v2_pokemonspecy) {
    return cached;
  }

  try {
    const paginatedResults = await getAllPokemonDetailedPaginated();
    const flattenedResults = paginatedResults.flat();
    if (flattenedResults.length > 0) {
      await setCachedData(cacheKey, flattenedResults);
      return flattenedResults;
    }
    throw new Error('PokéAPI GraphQL returned invalid data');
  } catch (error) {
    console.error('Failed to fetch detailed Pokémon data:', error);
    const cachedFallback = await getCachedData<PokemonBasicData[]>(cacheKey, true);
    if (cachedFallback && cachedFallback.length > 0) {
      return cachedFallback;
    }
    throw error;
  }
};

export const getAllPokemonDetailedPaginated = async (): Promise<PokemonBasicData[][]> => {
  return fetchPokemonBatches<PokemonBasicData>(
    'all-pokemon-detailed-paginated-v2',
    (offset, limit) => ({
      query: `
        query GetAllPokemonDetailedPaginated($limit: Int!, $offset: Int!) {
          pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) {
            ${buildPokemonDetailedSelection()}
          }
        }
      `,
      variables: { limit, offset },
    }),
    BATCH_SIZE,
  );
};

export const getLocalizedPokemonData = async (name: string, languageId: number): Promise<LocalizedPokemonData> => {
  const cacheKey = `localized-pokemon-${name}-${languageId}`;
  try {
    const query = `
      query GetLocalizedPokemon($name: String!, $languageId: Int!) {
        pokemon_v2_pokemonspecies(where: {name: {_eq: $name}}) {
          pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: $languageId}}) {
            name
            pokemon_v2_language {
              name
            }
          }
          pokemon_v2_pokemonspeciesflavortexts(where: {language_id: {_eq: $languageId}}, limit: 5) {
            flavor_text
            pokemon_v2_language {
              name
            }
          }
        }
      }
    `;

    const { data } = await graphqlClient.post<{ data?: { pokemon_v2_pokemonspecies?: LocalizedPokemonData[] } }>('/graphql/v1beta', { 
      query, 
      variables: { name, languageId } 
    });
    
    if (!data?.data?.pokemon_v2_pokemonspecies?.[0]) {
      throw new Error(`Invalid GraphQL response in getLocalizedPokemonData: ${describeGraphQLResponse(data)}`);
    }
    
    const results = data.data.pokemon_v2_pokemonspecies[0];
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    const cached = await getCachedData<LocalizedPokemonData>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getPokemonMovesLocalized = async (name: string, languageId: number): Promise<GraphQLPokemonMoveData[]> => {
  const cacheKey = `localized-moves-${name}-${languageId}`;
  try {
    const query = `
      query GetPokemonMoves($name: String!, $languageId: Int!) {
        pokemon_v2_pokemon(where: {name: {_eq: $name}}) {
          pokemon_v2_pokemonmoves(distinct_on: move_id, order_by: {move_id: asc}) {
            pokemon_v2_move {
              name
              power
              accuracy
              pokemon_v2_type {
                name
              }
              pokemon_v2_movedamageclass {
                name
              }
              pokemon_v2_movenames(where: {language_id: {_eq: $languageId}}) {
                name
              }
              pokemon_v2_moveflavortexts(where: {language_id: {_eq: $languageId}}, limit: 1) {
                flavor_text
              }
            }
          }
        }
      }
    `;

    const { data } = await graphqlClient.post<{ data: { pokemon_v2_pokemon: Array<{ pokemon_v2_pokemonmoves: GraphQLPokemonMoveData[] }> } }>('/graphql/v1beta', { 
      query, 
      variables: { name, languageId } 
    });
    
    let result: GraphQLPokemonMoveData[] = [];
    if (data?.data?.pokemon_v2_pokemon?.[0]) {
      result = data.data.pokemon_v2_pokemon[0].pokemon_v2_pokemonmoves;
    }
    await setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    const cached = await getCachedData<GraphQLPokemonMoveData[]>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getAllMoves = async (languageId: number): Promise<GraphQLMoveData[]> => {
  const cacheKey = `all-moves-v2-${languageId}`;
  const cached = await getCachedData<GraphQLMoveData[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const batches = await fetchMoveBatches<GraphQLMoveData>(
      'all-moves-paginated-v2',
      (offset, limit) => ({
        query: `
          query GetAllMoves($limit: Int!, $offset: Int!, $languageId: Int!) {
            pokemon_v2_move(limit: $limit, offset: $offset, order_by: {id: asc}) {
              id
              name
              power
              accuracy
              pp
              priority
              generation_id
              pokemon_v2_type {
                name
              }
              pokemon_v2_movedamageclass {
                name
              }
              pokemon_v2_movenames(where: {language_id: {_eq: $languageId}}) {
                name
              }
              pokemon_v2_moveflavortexts(where: {language_id: {_eq: $languageId}}, limit: 1) {
                flavor_text
              }
              pokemon_v2_moveeffect {
                pokemon_v2_moveeffecteffecttexts(where: {language_id: {_eq: $languageId}}) {
                  short_effect
                  effect
                }
              }
            }
          }
        `,
        variables: { limit, offset, languageId },
      }),
      MOVE_BATCH_SIZE,
    );

    const results = batches.flat();
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Failed to fetch all moves:', error);
    const cached = await getCachedData<GraphQLMoveData[]>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getMovePokemonLearners = async (moveName: string, languageId: number): Promise<GraphQLMovePokemonData[]> => {
  const cacheKey = `move-learners-v2-${moveName}-${languageId}`;
  const cached = await getCachedData<GraphQLMovePokemonData[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const query = `
      query GetMoveLearners($moveName: String!, $languageId: Int!) {
        pokemon_v2_pokemonmove(
          where: {pokemon_v2_move: {name: {_eq: $moveName}}}
          order_by: {pokemon_id: asc}
        ) {
          level
          pokemon_v2_movelearnmethod {
            name
          }
          pokemon_v2_pokemon {
            id
            name
            pokemon_v2_pokemontypes {
              pokemon_v2_type {
                name
              }
            }
            pokemon_v2_pokemonspecy {
              pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: $languageId}}) {
                name
              }
            }
          }
        }
      }
    `;

    const { data } = await graphqlClient.post<{ data?: { pokemon_v2_pokemonmove?: GraphQLMovePokemonData[] } }>('/graphql/v1beta', {
      query,
      variables: { moveName, languageId },
    });

    if (!data?.data?.pokemon_v2_pokemonmove) {
      throw new Error(`Invalid GraphQL response in getMovePokemonLearners: ${describeGraphQLResponse(data)}`);
    }

    const results = data.data.pokemon_v2_pokemonmove;
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    const cached = await getCachedData<GraphQLMovePokemonData[]>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getAllAbilities = async (languageId: number): Promise<GraphQLAbilityData[]> => {
  const cacheKey = `all-abilities-v2-${languageId}`;
  const cached = await getCachedData<GraphQLAbilityData[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const query = `
      query GetAllAbilities($languageId: Int!) {
        pokemon_v2_ability(limit: 1000, order_by: {id: asc}, where: {is_main_series: {_eq: true}}) {
          id
          name
          generation_id
          is_main_series
          pokemon_v2_abilitynames(where: {language_id: {_eq: $languageId}}) {
            name
          }
          pokemon_v2_abilityeffecttexts(where: {language_id: {_eq: $languageId}}) {
            short_effect
            effect
          }
          pokemon_v2_abilityflavortexts(
            where: {language_id: {_eq: $languageId}}
            order_by: {version_group_id: desc}
            limit: 1
          ) {
            flavor_text
            pokemon_v2_versiongroup {
              name
            }
          }
        }
      }
    `;

    const { data } = await graphqlClient.post<{ data?: { pokemon_v2_ability?: GraphQLAbilityData[] } }>('/graphql/v1beta', {
      query,
      variables: { languageId },
    });

    if (!data?.data?.pokemon_v2_ability) {
      throw new Error(`Invalid GraphQL response in getAllAbilities: ${describeGraphQLResponse(data)}`);
    }

    const results = data.data.pokemon_v2_ability;
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    const cached = await getCachedData<GraphQLAbilityData[]>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getAbilityPokemon = async (abilityName: string, languageId: number): Promise<GraphQLAbilityPokemonData[]> => {
  const cacheKey = `ability-pokemon-v1-${abilityName}-${languageId}`;
  const cached = await getCachedData<GraphQLAbilityPokemonData[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const query = `
      query GetAbilityPokemon($abilityName: String!, $languageId: Int!) {
        pokemon_v2_pokemonability(
          where: {pokemon_v2_ability: {name: {_eq: $abilityName}}}
          order_by: {pokemon_id: asc}
        ) {
          is_hidden
          slot
          pokemon_v2_pokemon {
            id
            name
            pokemon_v2_pokemontypes {
              pokemon_v2_type {
                name
              }
            }
            pokemon_v2_pokemonspecy {
              pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: $languageId}}) {
                name
              }
            }
          }
        }
      }
    `;

    const { data } = await graphqlClient.post<{ data?: { pokemon_v2_pokemonability?: GraphQLAbilityPokemonData[] } }>('/graphql/v1beta', {
      query,
      variables: { abilityName, languageId },
    });

    if (!data?.data?.pokemon_v2_pokemonability) {
      throw new Error(`Invalid GraphQL response in getAbilityPokemon: ${describeGraphQLResponse(data)}`);
    }

    const results = data.data.pokemon_v2_pokemonability;
    await setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    const cached = await getCachedData<GraphQLAbilityPokemonData[]>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};
