/** Validate shared selections before deduplication and the UI's slot limit. */
export function parseSharedPokemonIds(raw: string | null, limit: number): number[] {
  if (!raw) return [];
  const values = raw.includes(',') ? raw.split(',') : /^\d+(?:-\d+)*$/.test(raw) ? raw.split('-') : [];
  return [...new Set(values
    .filter((value) => /^\d+$/.test(value))
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, limit);
}
