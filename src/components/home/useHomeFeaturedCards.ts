'use client';

import { HOME_FEATURED_CARDS } from './homeFeaturedCards';

export { HOME_FEATURED_CARDS } from './homeFeaturedCards';

/**
 * The homepage uses three fixed collector icons instead of a rotating catalog
 * sample. These exact vintage printings are not all represented in TCGdex,
 * so their verified public image assets are kept here and still rendered by
 * the shared TCGCardImage component.
 */
export function useHomeFeaturedCards(enabled: boolean) {
  return {
    cards: enabled ? HOME_FEATURED_CARDS : [],
    isError: false,
    isLoading: !enabled,
  };
}
