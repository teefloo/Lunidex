import {
  BookOpen,
  Users,
  BrainCircuit,
  Shapes,
  Swords,
  LayoutGrid,
  ArrowLeftRight,
  Egg,
  Shield,
  Package,
  Sparkles,
  Calculator,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  fallback: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { path: '/',                 icon: BookOpen,    labelKey: 'nav.pokedex',            fallback: 'Pokédex' },
  { path: '/team',             icon: Users,       labelKey: 'nav.team',               fallback: 'Team' },
  { path: '/tcg',              icon: LayoutGrid,  labelKey: 'nav.tcg',                fallback: 'TCG' },
  { path: '/tcg/collection',   icon: Package,     labelKey: 'tcg.nav_collection',    fallback: 'Collection' },
  { path: '/quiz',             icon: BrainCircuit,labelKey: 'nav.quiz',               fallback: 'Quiz' },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { path: '/compare',   icon: ArrowLeftRight, labelKey: 'nav.compare',   fallback: 'Compare' },
  { path: '/types',     icon: Shapes,         labelKey: 'nav.types',     fallback: 'Types' },
  { path: '/moves',     icon: Swords,         labelKey: 'nav.moves',     fallback: 'Moves' },
  { path: '/items',     icon: Package,        labelKey: 'nav.items',     fallback: 'Items' },
  { path: '/abilities', icon: Sparkles,       labelKey: 'nav.abilities', fallback: 'Abilities' },
  { path: '/battle',    icon: Shield,         labelKey: 'nav.battle',    fallback: 'Battle tools' },
  { path: '/breeding',  icon: Egg,            labelKey: 'nav.breeding',  fallback: 'Breeding' },
  { path: '/ev-iv',     icon: Calculator,     labelKey: 'nav.ev_iv',     fallback: 'EV/IV' },
];

export const NAV_ITEMS: NavItem[] = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];
