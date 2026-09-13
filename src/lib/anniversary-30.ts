import type { SupportedLanguage } from '@/lib/languages';

export const ANNIVERSARY_30_PATH = '/30e-anniversaire';
export const ANNIVERSARY_30_PUBLICATION_DATE = '2026-08-25';
export const ANNIVERSARY_30_RELEASE_DATE = '2026-09-16' as const;
export const ANNIVERSARY_30_LAST_VERIFIED_DATE = '2026-09-12' as const;
export const ANNIVERSARY_30_LAST_MODIFIED_DATE = ANNIVERSARY_30_LAST_VERIFIED_DATE;
export const ANNIVERSARY_30_FALLBACK_SET_ID = '30th' as const;
export const ANNIVERSARY_30_LEGACY_STORAGE_KEY = 'primedex-anniversary-30-tracker-v1' as const;
export const ANNIVERSARY_30_STORAGE_KEY = 'primedex-anniversary-30-tracker-v2' as const;
export const ANNIVERSARY_30_INDEXABLE_LANGUAGES = ['en', 'fr'] as const;

export type Anniversary30Language = (typeof ANNIVERSARY_30_INDEXABLE_LANGUAGES)[number];
export type Anniversary30LocalizedAsset = Record<Anniversary30Language, string>;

export type Anniversary30Source = {
  id: 'overview' | 'pikachu' | 'products' | 'gallery' | 'card-list' | 'classic';
  nameKey: string;
  url: string;
};

export type Anniversary30SourceStatus =
  | 'official'
  | 'verified-database'
  | 'reported'
  | 'unknown';

export type Anniversary30CardScope =
  | 'numbered-main'
  | 'secret-rare'
  | 'pikachu'
  | 'classic-collection'
  | 'basic-energy'
  | 'promo';

export type Anniversary30CardFilter =
  | 'all'
  | 'owned'
  | 'missing'
  | 'wishlist'
  | 'pikachu'
  | 'pokemon-ex'
  | 'illustration-rare'
  | 'special-illustration-rare'
  | 'futuristic-rare'
  | 'classic-collection';

export type Anniversary30CardImageStatus = 'available' | 'not-published' | 'unknown';

export interface Anniversary30Card {
  /** Stable Lunidex identity. It must not change when TCGdex adds the set. */
  id: string;
  localId: string;
  collectorNumber: string;
  name: string;
  scope: Anniversary30CardScope;
  rarity?: string;
  illustrator?: string;
  imageUrl?: Anniversary30LocalizedAsset;
  officialUrl?: string;
  /** Provider card id, when the card has a validated Lunidex detail route. */
  lunidexCardId?: string;
  pikachuNumber?: number;
  originalSet?: string;
  originalNumber?: string;
  sourceStatus: Anniversary30SourceStatus;
  sourceUrls: readonly string[];
  verifiedAt: string;
  imageStatus: Anniversary30CardImageStatus;
}

export interface Anniversary30CardDataset {
  cards: readonly Anniversary30Card[];
  numberedMain: readonly Anniversary30Card[];
  secretRares: readonly Anniversary30Card[];
  pikachu: readonly Anniversary30Card[];
  classicCollection: readonly Anniversary30Card[];
  basicEnergy: readonly Anniversary30Card[];
  promos: readonly Anniversary30Card[];
}

export type Anniversary30ProductMonth = '2026-09' | '2026-10' | '2026-11';

export type Anniversary30Product = {
  id:
    | 'tech-sticker'
    | 'two-booster-blister'
    | 'knock-out-collection'
    | 'binder-collection'
    | 'poster-collection'
    | 'pokemon-ex-boxes'
    | 'elite-trainer-box'
    | 'pokemon-center-elite-trainer-box'
    | 'booster-bundle'
    | 'mini-tins'
    | 'battle-decks'
    | 'ditto-premium-collection'
    | 'ultra-premium-collections'
    | 'figure-collection';
  nameKey: string;
  descriptionKey: string;
  month: Anniversary30ProductMonth;
  boosterCount: number | null;
  classicBoosterCount?: number;
  contentKey: string;
  variantKey?: string;
  sourceUrl: string;
  imageUrl: Anniversary30LocalizedAsset;
  sourceStatus: Extract<Anniversary30SourceStatus, 'official' | 'unknown'>;
};

const OFFICIAL_OVERVIEW_URL = 'https://www.pokemon.com/us/news/get-ready-for-pokemon-tcg-30th-celebration';
const OFFICIAL_PIKACHU_URL = 'https://www.pokemon.com/uk/news/get-ready-for-a-pikachu-parade-in-pokemon-tcg-30th-celebration';
const OFFICIAL_PRODUCTS_URL = 'https://www.pokemon.com/uk/news/pokemon-tcg-30th-celebration-product-showcase';
const OFFICIAL_GALLERY_URL = 'https://tcg.pokemon.com/en-us/galleries/30th-celebration/';
const CARD_LIST_URL = 'https://tcgscreener.com/guide/30th-celebration-card-list';
const CLASSIC_LIST_URL = 'https://www.pokebeach.com/2026/06/all-30-classic-collection-cards-from-30th-celebration';

export const ANNIVERSARY_30_SOURCES: readonly Anniversary30Source[] = [
  { id: 'overview', nameKey: 'anniversary_30.sources.overview', url: OFFICIAL_OVERVIEW_URL },
  { id: 'pikachu', nameKey: 'anniversary_30.sources.pikachu', url: OFFICIAL_PIKACHU_URL },
  { id: 'products', nameKey: 'anniversary_30.sources.products', url: OFFICIAL_PRODUCTS_URL },
  { id: 'gallery', nameKey: 'anniversary_30.sources.gallery', url: OFFICIAL_GALLERY_URL },
  { id: 'card-list', nameKey: 'anniversary_30.sources.card_list', url: CARD_LIST_URL },
  { id: 'classic', nameKey: 'anniversary_30.sources.classic', url: CLASSIC_LIST_URL },
];

export const ANNIVERSARY_30_HERO_IMAGE = {
  url: {
    en: 'https://mcdn.pokemon.com/image/upload/c_limit,w_1439/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/30th-product-showcase-169-en.png',
    fr: 'https://mcdn.pokemon.com/image/upload/c_limit,w_1439/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/30th-product-showcase-169-fr.png',
  } satisfies Anniversary30LocalizedAsset,
  sourceUrl: OFFICIAL_PRODUCTS_URL,
} as const;

const PRODUCTS_SOURCE_URL = OFFICIAL_PRODUCTS_URL;

export const ANNIVERSARY_30_PRODUCTS: readonly Anniversary30Product[] = [
  {
    id: 'tech-sticker',
    nameKey: 'anniversary_30.products.tech_sticker_name',
    descriptionKey: 'anniversary_30.products.tech_sticker_description',
    month: '2026-11',
    boosterCount: 3,
    contentKey: 'anniversary_30.products.content_promo_sticker',
    variantKey: 'anniversary_30.products.variant_alolan_exeggutor_lucario',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_1023,h_575/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/tech-sticker-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_1023,h_575/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/tech-sticker-collection-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'two-booster-blister',
    nameKey: 'anniversary_30.products.two_booster_blister_name',
    descriptionKey: 'anniversary_30.products.two_booster_blister_description',
    month: '2026-09',
    boosterCount: 2,
    contentKey: 'anniversary_30.products.content_eevee_coin',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/2-pack-blister-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/2-pack-blister-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'knock-out-collection',
    nameKey: 'anniversary_30.products.knock_out_collection_name',
    descriptionKey: 'anniversary_30.products.knock_out_collection_description',
    month: '2026-09',
    boosterCount: 2,
    contentKey: 'anniversary_30.products.content_eevee_coin',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/knock-out-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/knock-out-collection-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'binder-collection',
    nameKey: 'anniversary_30.products.binder_collection_name',
    descriptionKey: 'anniversary_30.products.binder_collection_description',
    month: '2026-09',
    boosterCount: 5,
    contentKey: 'anniversary_30.products.content_binder',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/binder-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/binder-collection-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'poster-collection',
    nameKey: 'anniversary_30.products.poster_collection_name',
    descriptionKey: 'anniversary_30.products.poster_collection_description',
    month: '2026-09',
    boosterCount: 3,
    contentKey: 'anniversary_30.products.content_poster_birds',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/poster-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/poster-collection-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'pokemon-ex-boxes',
    nameKey: 'anniversary_30.products.pokemon_ex_boxes_name',
    descriptionKey: 'anniversary_30.products.pokemon_ex_boxes_description',
    month: '2026-09',
    boosterCount: 4,
    contentKey: 'anniversary_30.products.content_promo_oversize',
    variantKey: 'anniversary_30.products.variant_sylveon_greninja',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/pokemon-ex-box-sylveon-ex-greninja-ex-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/pokemon-ex-box-sylveon-ex-greninja-ex-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'elite-trainer-box',
    nameKey: 'anniversary_30.products.elite_trainer_box_name',
    descriptionKey: 'anniversary_30.products.elite_trainer_box_description',
    month: '2026-09',
    boosterCount: 9,
    contentKey: 'anniversary_30.products.content_etb',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/elite-trainer-box-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/elite-trainer-box-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'pokemon-center-elite-trainer-box',
    nameKey: 'anniversary_30.products.pokemon_center_etb_name',
    descriptionKey: 'anniversary_30.products.pokemon_center_etb_description',
    month: '2026-09',
    boosterCount: 11,
    contentKey: 'anniversary_30.products.content_pc_etb',
    variantKey: 'anniversary_30.products.variant_pokemon_center_stamp',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/pokemon-center-elite-trainer-box-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/pokemon-center-elite-trainer-box-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'booster-bundle',
    nameKey: 'anniversary_30.products.booster_bundle_name',
    descriptionKey: 'anniversary_30.products.booster_bundle_description',
    month: '2026-10',
    boosterCount: 6,
    contentKey: 'anniversary_30.products.content_boosters_only',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/booster-bundle-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/booster-bundle-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'mini-tins',
    nameKey: 'anniversary_30.products.mini_tins_name',
    descriptionKey: 'anniversary_30.products.mini_tins_description',
    month: '2026-10',
    boosterCount: 2,
    contentKey: 'anniversary_30.products.content_tin_sticker_art',
    variantKey: 'anniversary_30.products.variant_ten_artworks',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/mini-tin.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/mini-tin.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'battle-decks',
    nameKey: 'anniversary_30.products.battle_decks_name',
    descriptionKey: 'anniversary_30.products.battle_decks_description',
    month: '2026-10',
    boosterCount: null,
    contentKey: 'anniversary_30.products.content_60_card_deck',
    variantKey: 'anniversary_30.products.variant_espeon_umbreon',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/battle-deck-espeon-ex-umbreon-ex-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/battle-deck-espeon-ex-umbreon-ex-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'ditto-premium-collection',
    nameKey: 'anniversary_30.products.ditto_premium_collection_name',
    descriptionKey: 'anniversary_30.products.ditto_premium_collection_description',
    month: '2026-11',
    boosterCount: 8,
    contentKey: 'anniversary_30.products.content_ditto_display',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/ditto-premium-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/ditto-premium-collection-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'ultra-premium-collections',
    nameKey: 'anniversary_30.products.ultra_premium_collections_name',
    descriptionKey: 'anniversary_30.products.ultra_premium_collections_description',
    month: '2026-11',
    boosterCount: 29,
    classicBoosterCount: 1,
    contentKey: 'anniversary_30.products.content_upc',
    variantKey: 'anniversary_30.products.variant_day_night',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/ultra-premium-collection-day-night-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/ultra-premium-collection-day-night-fr.png',
    },
    sourceStatus: 'official',
  },
  {
    id: 'figure-collection',
    nameKey: 'anniversary_30.products.figure_collection_name',
    descriptionKey: 'anniversary_30.products.figure_collection_description',
    month: '2026-11',
    boosterCount: 5,
    contentKey: 'anniversary_30.products.content_figure_oversize',
    variantKey: 'anniversary_30.products.variant_mew_mewtwo',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/figure-collection-mew-mewtwo-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/figure-collection-mew-mewtwo-fr.png',
    },
    sourceStatus: 'official',
  },
];

/**
 * The old slot ids are intentionally kept as a read-only compatibility
 * surface. They are migration input only and are not renderable card data.
 */
export type Anniversary30PikachuSlotId = `pikachu-rare-${string}`;
export type Anniversary30PikachuSlot = {
  id: Anniversary30PikachuSlotId;
  status: 'placeholder' | 'verified';
};

export const ANNIVERSARY_30_PIKACHU_SLOTS: readonly Anniversary30PikachuSlot[] = Array.from(
  { length: 30 },
  (_, index) => ({
    id: `pikachu-rare-${String(index + 1).padStart(2, '0')}` as Anniversary30PikachuSlotId,
    status: 'verified' as const,
  }),
);

const ANNIVERSARY_30_PIKACHU_SLOT_IDS = new Set<Anniversary30PikachuSlotId>(
  ANNIVERSARY_30_PIKACHU_SLOTS.map((slot) => slot.id),
);

export type Anniversary30Progress = {
  version: 1;
  checkedSlotIds: Anniversary30PikachuSlotId[];
};

export function isAnniversary30Language(language: SupportedLanguage): language is Anniversary30Language {
  return (ANNIVERSARY_30_INDEXABLE_LANGUAGES as readonly string[]).includes(language);
}

export function getAnniversary30Language(language: SupportedLanguage): Anniversary30Language {
  return isAnniversary30Language(language) ? language : 'en';
}

export type Anniversary30ReleaseState =
  | { status: 'upcoming'; totalSeconds: number }
  | { status: 'available'; totalSeconds: 0 };

/**
 * Calculate the release state from a UTC date-only boundary. A date-only
 * boundary keeps the countdown deterministic across locales and avoids
 * showing a negative timer after the release moment.
 */
export function getAnniversary30ReleaseState(
  now: Date,
  releaseDate: string = ANNIVERSARY_30_RELEASE_DATE,
): Anniversary30ReleaseState {
  const releaseTimestamp = Date.parse(`${releaseDate}T00:00:00.000Z`);
  const nowTimestamp = now.getTime();
  if (!Number.isFinite(releaseTimestamp) || !Number.isFinite(nowTimestamp) || nowTimestamp >= releaseTimestamp) {
    return { status: 'available', totalSeconds: 0 };
  }

  return {
    status: 'upcoming',
    totalSeconds: Math.max(0, Math.ceil((releaseTimestamp - nowTimestamp) / 1000)),
  };
}

export function createEmptyAnniversary30Progress(): Anniversary30Progress {
  return { version: 1, checkedSlotIds: [] };
}

/** Parse the retired v1 payload without ever writing back to its key. */
export function parseAnniversary30Progress(value: string | null): Anniversary30Progress {
  if (!value) return createEmptyAnniversary30Progress();

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return createEmptyAnniversary30Progress();

    const candidate = parsed as { version?: unknown; checkedSlotIds?: unknown };
    if (candidate.version !== 1 || !Array.isArray(candidate.checkedSlotIds)) {
      return createEmptyAnniversary30Progress();
    }

    const checkedSlotIds = [...new Set(
      candidate.checkedSlotIds.filter(
        (slotId): slotId is Anniversary30PikachuSlotId => (
          typeof slotId === 'string' && ANNIVERSARY_30_PIKACHU_SLOT_IDS.has(slotId as Anniversary30PikachuSlotId)
        ),
      ),
    )];

    return { version: 1, checkedSlotIds };
  } catch {
    return createEmptyAnniversary30Progress();
  }
}

export function serializeAnniversary30Progress(progress: Anniversary30Progress): string {
  return JSON.stringify(progress);
}

export function toggleAnniversary30Slot(
  progress: Anniversary30Progress,
  slotId: Anniversary30PikachuSlotId,
): Anniversary30Progress {
  const checked = new Set(progress.checkedSlotIds);
  if (checked.has(slotId)) checked.delete(slotId);
  else checked.add(slotId);

  return {
    version: 1,
    checkedSlotIds: ANNIVERSARY_30_PIKACHU_SLOTS
      .map((slot) => slot.id)
      .filter((id) => checked.has(id)),
  };
}

export function countAnniversary30Progress(progress: Anniversary30Progress): number {
  return progress.checkedSlotIds.length;
}

export { OFFICIAL_GALLERY_URL as ANNIVERSARY_30_OFFICIAL_GALLERY_URL };
export { CARD_LIST_URL as ANNIVERSARY_30_CARD_LIST_SOURCE_URL };
export { CLASSIC_LIST_URL as ANNIVERSARY_30_CLASSIC_SOURCE_URL };
