export type SmogonTier =
  | 'Uber'
  | 'OU'
  | 'OUBL'
  | 'UU'
  | 'UUBL'
  | 'RU'
  | 'RUBL'
  | 'NU'
  | 'NUBL'
  | 'PU'
  | 'PUBL'
  | 'LC'
  | 'NFE'
  | 'AG'
  | 'Untiered';

export interface SmogonData {
  tier: SmogonTier;
  doublesTier?: string;
}

/** Normalise a PokéAPI slug for the Pokémon Showdown formats-data map. */
export function normalizeNameForPS(pokemonName: string): string {
  return pokemonName.replace(/-/g, '').toLowerCase();
}

/** Raw entry shape from https://play.pokemonshowdown.com/data/formats-data.json */
interface PSFormatsEntry {
  tier?: string;
  doublesTier?: string;
  [key: string]: unknown;
}

/** Fetch the Smogon tier for a Pokémon via our server-side proxy route. */
export async function fetchSmogonTier(
  pokemonName: string,
  baseUrl = ''
): Promise<SmogonData | null> {
  const normalized = normalizeNameForPS(pokemonName);
  const url = `${baseUrl}/api/smogon/${encodeURIComponent(normalized)}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // 24 h ISR cache
    });

    if (!res.ok) return null;

    const json = (await res.json()) as PSFormatsEntry | null;
    if (!json || !json.tier) return null;

    return {
      tier: json.tier as SmogonTier,
      doublesTier: json.doublesTier,
    };
  } catch {
    return null;
  }
}
