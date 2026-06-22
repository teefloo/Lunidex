/**
 * Soft Pixel design tokens resolved to plain sRGB hex for use inside
 * `next/og` (satori). Satori does not understand the OKLCH custom properties
 * declared in `src/app/globals.css`, so the OG surfaces mirror the same palette
 * with hard-coded equivalents: warm dark background, terracotta primary, blue
 * accent, sharp corners, thick borders and offset "pixel" shadows.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_THEME = {
  background: '#211A17',
  backgroundAccent: '#2A211C',
  surface: '#2E2521',
  surfaceMuted: '#241D19',
  border: '#5A4A40',
  borderStrong: '#7A6557',
  shadow: '#100B09',
  primary: '#E8916B',
  primarySoft: '#F2B79B',
  accent: '#A8C5E0',
  text: '#F3ECE4',
  textMuted: '#C3B3A6',
  textDim: '#8C7C70',
} as const;

/** Canonical Pokémon type colours (sRGB) — recognisable in social previews. */
export const OG_TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

/** Synergy score → status colour, matching the Team Builder thresholds. */
export function synergyColor(score: number): string {
  if (score > 70) return '#6FBF73';
  if (score > 40) return '#E8A04B';
  return '#D96B5E';
}
