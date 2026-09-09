export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

/**
 * Treat padded IDs and IDs prefixed with `#` as exact lookups while keeping
 * unpadded numeric input useful for partial ID searches.
 */
export function getExactNumericPokemonId(searchTerm: string): number | null {
  const trimmed = searchTerm.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1).trim() : trimmed;
  const isPadded = /^0\d/.test(withoutHash);

  if (!/^\d+$/.test(withoutHash) || (!trimmed.startsWith('#') && !isPadded)) {
    return null;
  }

  const id = Number(withoutHash);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type Measurement = number | null | undefined;

/** Keep missing/non-positive PokéAPI measurements after known values. */
export function comparePokemonMeasurements(
  left: Measurement,
  right: Measurement,
  direction: 'asc' | 'desc',
): number {
  const leftValue = typeof left === 'number' && Number.isFinite(left) && left > 0 ? left : null;
  const rightValue = typeof right === 'number' && Number.isFinite(right) && right > 0 ? right : null;

  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
}
