export type GenTheme =
  | 'default'
  | 'gen1'
  | 'gen2'
  | 'gen3'
  | 'gen4'
  | 'gen5'
  | 'gen6'
  | 'gen7'
  | 'gen8'
  | 'gen9';

export interface GenerationTheme {
  id: GenTheme;
  name: string;
  game: string;
  generation: number;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
}

export const GENERATION_THEMES: Record<GenTheme, GenerationTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    game: 'PrimeDex',
    generation: 0,
    primaryColor: '#C87941',
    accentColor: '#7AABCC',
    bgColor: '#FFF8E7',
    textColor: '#5C4033',
  },
  gen1: {
    id: 'gen1',
    name: 'Kanto',
    game: 'Rouge / Bleu',
    generation: 1,
    primaryColor: '#E3350D',
    accentColor: '#003A8C',
    bgColor: '#FFF8E7',
    textColor: '#1A1A1A',
  },
  gen2: {
    id: 'gen2',
    name: 'Johto',
    game: 'Or / Argent',
    generation: 2,
    primaryColor: '#FFD700',
    accentColor: '#C0C0C0',
    bgColor: '#1A3A1A',
    textColor: '#F5F0D0',
  },
  gen3: {
    id: 'gen3',
    name: 'Hoenn',
    game: 'Rubis / Saphir',
    generation: 3,
    primaryColor: '#9B2335',
    accentColor: '#0047AB',
    bgColor: '#006994',
    textColor: '#FFFFFF',
  },
  gen4: {
    id: 'gen4',
    name: 'Sinnoh',
    game: 'Diamant / Perle',
    generation: 4,
    primaryColor: '#B0D4F1',
    accentColor: '#9966CC',
    bgColor: '#1A1A2E',
    textColor: '#E8E0F0',
  },
  gen5: {
    id: 'gen5',
    name: 'Unys',
    game: 'Noir / Blanc',
    generation: 5,
    primaryColor: '#CC2222',
    accentColor: '#F5F5F5',
    bgColor: '#1C1C1C',
    textColor: '#F5F5F5',
  },
  gen6: {
    id: 'gen6',
    name: 'Kalos',
    game: 'X / Y',
    generation: 6,
    primaryColor: '#4169E1',
    accentColor: '#FF2400',
    bgColor: '#F0F4FF',
    textColor: '#1A1A3A',
  },
  gen7: {
    id: 'gen7',
    name: 'Alola',
    game: 'Soleil / Lune',
    generation: 7,
    primaryColor: '#FFB700',
    accentColor: '#6A0DAD',
    bgColor: '#E8F8F8',
    textColor: '#1A2A3A',
  },
  gen8: {
    id: 'gen8',
    name: 'Galar',
    game: 'Épée / Bouclier',
    generation: 8,
    primaryColor: '#CE1620',
    accentColor: '#0A4FA6',
    bgColor: '#F5F0F8',
    textColor: '#1A0A2A',
  },
  gen9: {
    id: 'gen9',
    name: 'Paldea',
    game: 'Écarlate / Violet',
    generation: 9,
    primaryColor: '#FF2400',
    accentColor: '#8B00FF',
    bgColor: '#FFF0F0',
    textColor: '#2A0A1A',
  },
};

/**
 * Returns the GenTheme matching a given PokeAPI generation number (1–9).
 * Falls back to 'default' for unknown generations.
 */
export function getThemeForGeneration(generation: number): GenTheme {
  const entry = Object.values(GENERATION_THEMES).find(
    (t) => t.generation === generation,
  );
  return entry?.id ?? 'default';
}

export const GEN_THEME_ORDER: GenTheme[] = [
  'default',
  'gen1',
  'gen2',
  'gen3',
  'gen4',
  'gen5',
  'gen6',
  'gen7',
  'gen8',
  'gen9',
];
