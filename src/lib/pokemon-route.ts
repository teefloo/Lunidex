import type { PokemonDetail } from '@/types/pokemon';

export const MAX_POKEMON_NAME_LENGTH = 64;

const POKEMON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePokemonName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.normalize('NFKC').trim().toLowerCase();
  return normalized.length > 0
    && normalized.length <= MAX_POKEMON_NAME_LENGTH
    && POKEMON_NAME_PATTERN.test(normalized)
    ? normalized
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Minimum shape required by the Pokémon detail route and OG renderer. */
export function isPokemonDetailResponse(value: unknown): value is PokemonDetail {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'number' || !Number.isInteger(value.id) || value.id < 1) return false;
  if (!normalizePokemonName(value.name)) return false;
  if (!isRecord(value.sprites)) return false;

  const types = value.types;
  if (!Array.isArray(types) || types.length === 0) return false;
  if (!types.every((entry) => isRecord(entry) && isRecord(entry.type) && typeof entry.type.name === 'string')) return false;

  const stats = value.stats;
  if (!Array.isArray(stats) || stats.length === 0) return false;
  return stats.every((entry) => isRecord(entry) && typeof entry.base_stat === 'number' && Number.isFinite(entry.base_stat));
}
