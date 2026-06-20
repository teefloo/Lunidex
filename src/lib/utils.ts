import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatId(id: number): string {
  return "#" + id.toString().padStart(3, '0');
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatName(str: string): string {
  if (!str) return str;
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function formatPokemonSlugName(str: string): string {
  if (!str) return str;
  return str
    .split('-')
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join('-');
}

export function formatLocationName(str: string): string {
  if (!str) return str;
  const replacements: Record<string, string> = {
    'paldea': 'Paldea',
    'kitakami': 'Kitakami',
    'blueberry': 'Blueberry',
    'area': 'Area',
    'province': 'Province',
    'route': 'Route',
    'city': 'City',
    'town': 'Town',
    'forest': 'Forest',
    'cave': 'Cave',
    'lake': 'Lake',
    'sea': 'Sea',
    'mountain': 'Mountain',
    'tower': 'Tower',
    'ruins': 'Ruins',
    'island': 'Island',
    'coast': 'Coast',
    'desert': 'Desert',
    'plains': 'Plains',
    'valley': 'Valley',
  };
  
  return str.split('-').map(word => {
    const lower = word.toLowerCase();
    if (replacements[lower]) return replacements[lower];
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}
