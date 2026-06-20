import apiClient from './client';
import { getCachedData, setCachedData } from './cache';
import { PokemonDetail, PokemonListResponse, PokemonSpecies, PokemonEncounter } from '@/types/pokemon';

export const getPokemonList = async ({ pageParam = 0 }) => {
  const cacheKey = `pokemon-list-${pageParam}`;
  const cached = await getCachedData<PokemonListResponse & { nextParam?: number }>(cacheKey);
  if (cached) return cached;

  const { data } = await apiClient.get<PokemonListResponse>(`/pokemon?offset=${pageParam}&limit=20`);
  
  // Extract offset from next URL if it exists
  let nextParam: number | undefined;
  if (data.next) {
    const url = new URL(data.next);
    nextParam = parseInt(url.searchParams.get('offset') || '0');
  }

  const result = { ...data, nextParam };
  await setCachedData(cacheKey, result);
  return result;
};

export const getPokemonDetail = async (name: string): Promise<PokemonDetail> => {
  const cacheKey = `pokemon-detail-${name}`;
  try {
    const { data } = await apiClient.get<PokemonDetail>(`/pokemon/${name}`);
    await setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getCachedData<PokemonDetail>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getPokemonSpecies = async (name: string): Promise<PokemonSpecies> => {
  const cacheKey = `pokemon-species-${name}`;
  try {
    const { data } = await apiClient.get<PokemonSpecies>(`/pokemon-species/${name}`);
    await setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getCachedData<PokemonSpecies>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getPokemonEncounters = async (id: number): Promise<PokemonEncounter[]> => {
  const cacheKey = `pokemon-encounters-${id}`;
  try {
    const { data } = await apiClient.get<PokemonEncounter[]>(`/pokemon/${id}/encounters`);
    await setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getCachedData<PokemonEncounter[]>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};

export const getAllPokemonNames = async (): Promise<{ name: string; url: string }[]> => {
  const cacheKey = 'all-pokemon-names';
  const cached = await getCachedData<{ name: string; url: string }[]>(cacheKey);
  if (cached) return cached;

  const { data } = await apiClient.get<PokemonListResponse>('/pokemon?limit=2000');
  await setCachedData(cacheKey, data.results);
  return data.results;
};

export const getPokemonByGeneration = async (id: string): Promise<{ name: string; url: string }[]> => {
  const cacheKey = `gen-pokemon-${id}`;
  const cached = await getCachedData<{ name: string; url: string }[]>(cacheKey);
  if (cached) return cached;

  const { data } = await apiClient.get<{ pokemon_species: { name: string; url: string }[] }>(`/generation/${id}`);
  const results = data.pokemon_species;
  await setCachedData(cacheKey, results);
  return results;
};

export const getPokemonByType = async (type: string): Promise<{ name: string; url: string }[]> => {
  const cacheKey = `type-pokemon-${type}`;
  const cached = await getCachedData<{ name: string; url: string }[]>(cacheKey);
  if (cached) return cached;

  const { data } = await apiClient.get<{ pokemon: { pokemon: { name: string; url: string } }[] }>(`/type/${type}`);
  const results = data.pokemon.map((p) => p.pokemon);
  await setCachedData(cacheKey, results);
  return results;
};

export interface TypeRelations {
  damage_relations: {
    double_damage_from: { name: string; url: string }[];
    double_damage_to: { name: string; url: string }[];
    half_damage_from: { name: string; url: string }[];
    half_damage_to: { name: string; url: string }[];
    no_damage_from: { name: string; url: string }[];
    no_damage_to: { name: string; url: string }[];
  };
}

export const getTypeRelations = async (type: string): Promise<TypeRelations> => {
  const cacheKey = `type-relations-${type}`;
  const cached = await getCachedData<TypeRelations>(cacheKey);
  if (cached) return cached;

  const { data } = await apiClient.get<TypeRelations>(`/type/${type}`);
  await setCachedData(cacheKey, data);
  return data;
};

export interface MoveDetail {
  id: number;
  name: string;
  accuracy: number;
  pp: number;
  priority: number;
  power: number;
  type: { name: string; url: string };
  damage_class: { name: string; url: string };
  effect_entries: { effect: string; short_effect: string; language: { name: string } }[];
  names: { name: string; language: { name: string } }[];
}

export const getMoveDetail = async (name: string): Promise<MoveDetail> => {
  const cacheKey = `move-detail-${name}`;
  const cached = await getCachedData<MoveDetail>(cacheKey);
  if (cached) return cached;

  const { data } = await apiClient.get<MoveDetail>(`/move/${name}`);
  await setCachedData(cacheKey, data);
  return data;
};

export interface AbilityDetail {
  id: number;
  name: string;
  is_main_series: boolean;
  names: { name: string; language: { name: string } }[];
  effect_entries: { effect: string; short_effect: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string }; version_group: { name: string } }[];
}

export const getAbilityDetail = async (name: string): Promise<AbilityDetail> => {
  const cacheKey = `ability-detail-${name}`;
  try {
    const { data } = await apiClient.get<AbilityDetail>(`/ability/${name}`);
    await setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getCachedData<AbilityDetail>(cacheKey, true);
    if (cached) return cached;
    throw error;
  }
};
