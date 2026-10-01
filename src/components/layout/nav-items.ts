import {
  NAVIGATION_DESTINATIONS,
  PRIMARY_NAVIGATION,
  type NavigationDestination,
} from '@/lib/navigation-registry';

export type NavItem = NavigationDestination & { path: string };

export const PRIMARY_NAV_ITEMS = PRIMARY_NAVIGATION.filter(
  (item): item is typeof item & { path: string } => item.path !== null,
);

/** Kept as a compatibility export for existing local feature menus. */
export const SECONDARY_NAV_ITEMS = NAVIGATION_DESTINATIONS.filter(
  (item): item is NavItem => item.path !== null && item.group === 'play' && !item.primary,
);

export const NAV_ITEMS = NAVIGATION_DESTINATIONS.filter(
  (item): item is NavItem => item.path !== null,
);
