export const MAX_OG_POKEMON_NAME_LENGTH = 64;
export const MAX_OG_TCG_CARD_ID_LENGTH = 128;
export const MAX_OG_TRAINER_NAME_LENGTH = 24;

const POKEMON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TCG_CARD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

function normalizeSlug(
  value: string | null,
  maxLength: number,
  pattern: RegExp,
): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (
    normalized.length === 0
    || normalized.length > maxLength
    || !pattern.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function normalizeOgPokemonName(value: string | null): string | null {
  return normalizeSlug(value, MAX_OG_POKEMON_NAME_LENGTH, POKEMON_NAME_PATTERN);
}

export function normalizeOgTcgCardId(value: string | null): string | null {
  return normalizeSlug(value, MAX_OG_TCG_CARD_ID_LENGTH, TCG_CARD_ID_PATTERN);
}

export function sanitizeOgText(
  value: string | null,
  fallback: string,
  maxLength: number,
): string {
  const sanitized = (value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .trim();

  return sanitized ? Array.from(sanitized).slice(0, maxLength).join('') : fallback;
}

export function parseOgInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value?.trim()) return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function normalizeOgEnum<const T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = value?.trim().toLowerCase();
  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}
