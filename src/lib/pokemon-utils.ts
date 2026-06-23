import { 
  Circle, 
  Flame, 
  Droplet, 
  Zap, 
  Leaf, 
  Snowflake, 
  Target, 
  Skull, 
  Mountain, 
  Wind, 
  Brain, 
  Bug, 
  Gem, 
  Ghost, 
  Drill, 
  Moon, 
  Shield, 
  Sparkles,
  LucideIcon
} from 'lucide-react';
import { TYPE_COLORS, type PokemonDetail, type SpriteEntry } from '@/types/pokemon';

const GENERATION_LABELS: Record<string, string> = {
  'generation-i': 'Gen I',
  'generation-ii': 'Gen II',
  'generation-iii': 'Gen III',
  'generation-iv': 'Gen IV',
  'generation-v': 'Gen V',
  'generation-vi': 'Gen VI',
  'generation-vii': 'Gen VII',
  'generation-viii': 'Gen VIII',
  'generation-ix': 'Gen IX',
};

const VERSION_LABELS: Record<string, string> = {
  'red-blue': 'Red/Blue',
  yellow: 'Yellow',
  gold: 'Gold',
  silver: 'Silver',
  crystal: 'Crystal',
  'ruby-sapphire': 'Ruby/Sapphire',
  emerald: 'Emerald',
  'firered-leafgreen': 'FireRed/LeafGreen',
  'diamond-pearl': 'Diamond/Pearl',
  platinum: 'Platinum',
  'heartgold-soulsilver': 'HeartGold/SoulSilver',
  'black-white': 'Black/White',
  'black-2-white-2': 'Black 2/White 2',
  'x-y': 'X/Y',
  'omega-ruby-alpha-sapphire': 'Omega Ruby/Alpha Sapphire',
  'sun-moon': 'Sun/Moon',
  'ultra-sun-ultra-moon': 'Ultra Sun/Ultra Moon',
  'lets-go-pikachu-lets-go-eevee': "Let's Go Pikachu/Eevee",
  sword: 'Sword',
  shield: 'Shield',
  'brilliant-diamond': 'Brilliant Diamond',
  'shining-pearl': 'Shining Pearl',
  'legends-arceus': 'Legends: Arceus',
  scarlet: 'Scarlet',
  violet: 'Violet',
};

export function extractSprites(pokemon: PokemonDetail): SpriteEntry[] {
  const entries: SpriteEntry[] = [];

  // Generation sprites from versions
  if (pokemon.sprites.versions) {
    for (const [genKey, genVersions] of Object.entries(pokemon.sprites.versions)) {
      const genLabel = GENERATION_LABELS[genKey] || genKey;
      for (const [versionKey, sprites] of Object.entries(genVersions)) {
        const gameLabel = VERSION_LABELS[versionKey] || versionKey;
        const group = `${genLabel} — ${gameLabel}`;
        if (sprites.front_default) {
          entries.push({ group, label: 'Front', url: sprites.front_default, isShiny: false, isAnimated: false });
        }
        if (sprites.back_default) {
          entries.push({ group, label: 'Back', url: sprites.back_default, isShiny: false, isAnimated: false });
        }
        if (sprites.front_shiny) {
          entries.push({ group, label: 'Front Shiny', url: sprites.front_shiny, isShiny: true, isAnimated: false });
        }
        if (sprites.back_shiny) {
          entries.push({ group, label: 'Back Shiny', url: sprites.back_shiny, isShiny: true, isAnimated: false });
        }
      }
    }
  }

  // Official Artwork
  const official = pokemon.sprites.other?.['official-artwork'];
  if (official?.front_default) {
    entries.push({ group: 'Official Artwork', label: 'Front', url: official.front_default, isShiny: false, isAnimated: false });
  }
  if (official?.front_shiny) {
    entries.push({ group: 'Official Artwork', label: 'Shiny', url: official.front_shiny, isShiny: true, isAnimated: false });
  }

  // Home
  const home = pokemon.sprites.other?.home;
  if (home?.front_default) {
    entries.push({ group: 'Home', label: 'Front', url: home.front_default, isShiny: false, isAnimated: false });
  }
  if (home?.front_shiny) {
    entries.push({ group: 'Home', label: 'Shiny', url: home.front_shiny, isShiny: true, isAnimated: false });
  }

  // Dream World
  const dreamWorld = pokemon.sprites.other?.dream_world;
  if (dreamWorld?.front_default) {
    entries.push({ group: 'Dream World', label: 'Front', url: dreamWorld.front_default, isShiny: false, isAnimated: false });
  }

  // Showdown (animated)
  const showdown = pokemon.sprites.other?.showdown;
  if (showdown?.front_default) {
    entries.push({ group: 'Showdown', label: 'Front', url: showdown.front_default, isShiny: false, isAnimated: true });
  }
  if (showdown?.back_default) {
    entries.push({ group: 'Showdown', label: 'Back', url: showdown.back_default, isShiny: false, isAnimated: true });
  }

  return entries;
}

export const TYPE_ICONS: Record<string, LucideIcon> = {
  normal: Circle,
  fire: Flame,
  water: Droplet,
  electric: Zap,
  grass: Leaf,
  ice: Snowflake,
  fighting: Target,
  poison: Skull,
  ground: Mountain,
  flying: Wind,
  psychic: Brain,
  bug: Bug,
  rock: Gem,
  ghost: Ghost,
  dragon: Drill,
  dark: Moon,
  steel: Shield,
  fairy: Sparkles,
};

export const getThemeColor = (type: string) => {
  return TYPE_COLORS[type] || '#A8A77A';
};

export const getTypeGradientStyle = (types: string[]): React.CSSProperties => {
  if (types.length === 0) return { background: 'linear-gradient(to bottom right, #94a3b8, #475569)' };
  if (types.length === 1) {
    const color = getThemeColor(types[0]);
    return { background: `linear-gradient(to bottom right, ${color}, ${color})` };
  }
  return { background: `linear-gradient(to bottom right, ${getThemeColor(types[0])}, ${getThemeColor(types[1])})` };
};

/**
 * Determines a simulated TCG rarity based on Pokemon properties.
 * Useful for applying TCG-like effects to official artwork.
 */
export const getSimulatedRarity = (pokemon: { 
  id: number; 
  stats?: number[]; 
  is_legendary?: boolean; 
  is_mythical?: boolean;
}) => {
  if (pokemon.is_mythical) return 'rare secret';
  if (pokemon.is_legendary) return 'rare ultra';
  
  const totalStats = pokemon.stats?.reduce((a, b) => a + b, 0) || 0;
  if (totalStats >= 540) return 'rare holo';
  if (totalStats >= 480) return 'rare';
  if (totalStats >= 380) return 'uncommon';
  
  return 'common';
};
