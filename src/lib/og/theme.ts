/**
 * Soft Pixel design tokens resolved to plain sRGB hex for use inside
 * `next/og` (satori). Satori does not understand the OKLCH custom properties
 * declared in `src/app/globals.css`, so the OG surfaces mirror the same palette
 * with hard-coded equivalents: cobalt ink, lavender primary, blue accent,
 * sharp corners, thick borders and offset "pixel" shadows.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_THEME = {
  background: '#07144F',
  backgroundAccent: '#0B1D5B',
  surface: '#123B86',
  surfaceMuted: '#0D2D75',
  border: '#526EB8',
  borderStrong: '#8DB4FF',
  shadow: '#020726',
  primary: '#C9B8FF',
  primarySoft: '#DED4FF',
  accent: '#8DB4FF',
  text: '#FFF8FC',
  textMuted: '#A9B9E8',
  textDim: '#7F96D1',
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
