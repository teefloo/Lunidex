import {
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
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  fallback: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { path: '/team',     icon: Users,          labelKey: 'nav.team',     fallback: 'Team Builder' },
  { path: '/compare',  icon: ArrowLeftRight,  labelKey: 'nav.compare',  fallback: 'Compare'      },
  { path: '/tcg',      icon: LayoutGrid,      labelKey: 'nav.tcg',      fallback: 'TCG Catalog'  },
  { path: '/types',    icon: Shapes,          labelKey: 'nav.types',    fallback: 'Types'        },
  { path: '/moves',    icon: Swords,          labelKey: 'nav.moves',    fallback: 'Moves'        },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { path: '/items',    icon: Package,         labelKey: 'nav.items',    fallback: 'Items'        },
  { path: '/abilities', icon: Sparkles,       labelKey: 'nav.abilities', fallback: 'Abilities'   },
  { path: '/quiz',     icon: BrainCircuit,    labelKey: 'nav.quiz',     fallback: 'Quiz'         },
  { path: '/battle',   icon: Shield,          labelKey: 'nav.battle',   fallback: 'Battle'       },
  { path: '/breeding', icon: Egg,             labelKey: 'nav.breeding', fallback: 'Breeding'     },
];

export const NAV_ITEMS: NavItem[] = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];
