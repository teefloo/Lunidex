/** Validate shared selections before deduplication and the UI's slot limit. */
export function parseSharedPokemonIds(raw: string | null, limit: number): number[] {
  if (!raw) return [];
  const values = raw.includes(',') ? raw.split(',') : /^\d+(?:-\d+)*$/.test(raw) ? raw.split('-') : [];
  return [...new Set(values
    .filter((value) => /^\d+$/.test(value))
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, limit);
}

/** An absent ids parameter means a normal empty comparison; a supplied value must be valid. */
export function hasInvalidSharedPokemonIds(raw: string | null): boolean {
  if (raw === null) return false;
  const values = raw.includes(',')
    ? raw.split(',')
    : /^\d+(?:-\d+)*$/.test(raw) ? raw.split('-') : [];
  if (values.length === 0) return true;
  const ids: number[] = [];
  for (const value of values) {
    if (!/^\d+$/.test(value)) return true;
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) return true;
    ids.push(id);
  }
  return new Set(ids).size > 3;
}

/** Use URL-backed selections until a comparison can be persisted to the account. */
export function shouldUseSharedPokemonCompare(
  hasPersistentAccess: boolean,
  hasSharedIds: boolean,
): boolean {
  return hasSharedIds || !hasPersistentAccess;
}
