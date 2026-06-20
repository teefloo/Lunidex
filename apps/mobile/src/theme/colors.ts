/**
 * PrimeDex mobile palette. Kept intentionally close to the web app's identity
 * (deep indigo night surface, vivid accent) while respecting native contrast.
 */
export interface ThemePalette {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  accent: string;
  danger: string;
  success: string;
  overlay: string;
  shadow: string;
}

export const lightPalette: ThemePalette = {
  mode: 'light',
  background: '#f5f6fb',
  surface: '#ffffff',
  surfaceAlt: '#eef0f7',
  card: '#ffffff',
  border: '#e3e6f0',
  text: '#11131c',
  textMuted: '#5b6071',
  textFaint: '#9aa0b4',
  primary: '#4f46e5',
  primaryText: '#ffffff',
  accent: '#ec4899',
  danger: '#e11d48',
  success: '#16a34a',
  overlay: 'rgba(17,19,28,0.45)',
  shadow: '#000000',
};

export const darkPalette: ThemePalette = {
  mode: 'dark',
  background: '#0b1020',
  surface: '#141a2e',
  surfaceAlt: '#1b2238',
  card: '#161d33',
  border: '#28304a',
  text: '#f3f5fc',
  textMuted: '#a3abc4',
  textFaint: '#6f7796',
  primary: '#7c83ff',
  primaryText: '#0b1020',
  accent: '#f472b6',
  danger: '#fb7185',
  success: '#4ade80',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

/** Canonical Pokémon type colors (shared identity with the web app). */
export const TYPE_COLOR: Record<string, string> = {
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
