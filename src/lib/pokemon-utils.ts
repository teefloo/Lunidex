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
import { TYPE_COLORS } from '@/types/pokemon';

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
