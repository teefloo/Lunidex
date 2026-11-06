import type { TCGSet } from '@/types/tcg';
import { TCG_SET_PRINTED_CODES } from './tcg-set-printed-codes';

export interface TCGSetIdentifiers {
  /** A readable form of the stable TCGdex set ID (for example, `me05` -> `ME5`). */
  extensionId: string;
  /** A verified printed card code from Scarlet & Violet-era sets onward. */
  printedCode?: string;
}

/**
 * Resolve the identifiers shown alongside a set name. The extension ID comes
 * directly from TCGdex's set ID. The optional printed code comes from the
 * TCGdex `abbreviation.official` snapshot for physical releases from Scarlet
 * & Violet onward; older catalog abbreviations and digital-only sets are
 * intentionally omitted.
 */
export function getTCGSetIdentifiers(setId: string): TCGSetIdentifiers {
  const extensionId = setId
    .toUpperCase()
    .replace(/^([A-Z]+)0+(?=\d)/, '$1');
  const printedCode = TCG_SET_PRINTED_CODES[setId];

  return {
    extensionId,
    ...(printedCode ? { printedCode } : {}),
  };
}

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
