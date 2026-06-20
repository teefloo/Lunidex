import { TYPE_COLOR } from '@/theme/colors';

/** Extracts the numeric id from a PokeAPI resource url (".../pokemon/25/"). */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

/** Official artwork, served from the PokeAPI sprites CDN by national dex id. */
export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/** Pixel sprite fallback, lighter than the artwork. */
export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/** "bulbasaur" -> "Bulbasaur", "mr-mime" -> "Mr Mime". */
export function formatName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** National dex number, zero-padded: 25 -> "#0025". */
export function formatDexId(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function typeColor(type: string): string {
  return TYPE_COLOR[type] ?? '#777';
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SP.A',
  'special-defense': 'SP.D',
  speed: 'SPD',
};

export function statLabel(statName: string): string {
  return STAT_LABELS[statName] ?? statName.toUpperCase();
}

/** Highest single base stat across the dex, used to scale stat bars. */
export const MAX_BASE_STAT = 255;
