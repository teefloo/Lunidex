import type { TCGSet } from '@/types/tcg';

/**
 * Build unambiguous labels for set selectors. Some localized TCGdex catalogs
 * contain several sets with the same translated name but different ids.
 */
export function buildTCGSetDisplayNames(
  sets: readonly Pick<TCGSet, 'id' | 'name'>[],
): Map<string, string> {
  const nameCounts = new Map<string, number>();

  for (const set of sets) {
    const name = set.name.trim().toLocaleLowerCase();
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  return new Map(
    sets.map((set) => {
      const name = set.name.trim() || set.id;
      const normalizedName = name.toLocaleLowerCase();
      const label = (nameCounts.get(normalizedName) ?? 0) > 1
        ? `${name} (${set.id})`
        : name;
      return [set.id, label];
    }),
  );
}
