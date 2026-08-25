import type { SupportedLanguage } from '@/lib/languages';

export const ANNIVERSARY_30_PATH = '/30e-anniversaire';
export const ANNIVERSARY_30_PUBLICATION_DATE = '2026-08-25';
export const ANNIVERSARY_30_LAST_MODIFIED_DATE = '2026-08-26';
export const ANNIVERSARY_30_STORAGE_KEY = 'primedex-anniversary-30-tracker-v1';
export const ANNIVERSARY_30_INDEXABLE_LANGUAGES = ['en', 'fr'] as const;

export type Anniversary30Language = (typeof ANNIVERSARY_30_INDEXABLE_LANGUAGES)[number];
export type Anniversary30LocalizedAsset = Record<Anniversary30Language, string>;

export type Anniversary30Source = {
  id: 'overview' | 'pikachu' | 'products' | 'gallery';
  nameKey: string;
  url: string;
};

export type Anniversary30Product = {
  id:
    | 'tech-sticker'
    | 'two-booster-blister'
    | 'knock-out-collection'
    | 'poster-collection'
    | 'pokemon-ex-boxes'
    | 'elite-trainer-box'
    | 'binder-collection'
    | 'booster-bundle'
    | 'mini-tins'
    | 'battle-decks'
    | 'ditto-premium-collection'
    | 'ultra-premium-collections'
    | 'figure-collection';
  nameKey: string;
  descriptionKey: string;
  availabilityKey:
    | 'anniversary_30.products.window_launch'
    | 'anniversary_30.products.window_q3'
    | 'anniversary_30.products.window_q4';
  availabilityGroup: 'launch' | 'q3' | 'q4';
  sourceUrl: string;
  imageUrl: Anniversary30LocalizedAsset;
  sourceStatus: 'confirmed' | 'to-verify';
};

export type Anniversary30PikachuSlotId = `pikachu-rare-${string}`;

export type Anniversary30PikachuSlot = {
  id: Anniversary30PikachuSlotId;
  status: 'placeholder' | 'verified';
};

export type Anniversary30Progress = {
  version: 1;
  checkedSlotIds: Anniversary30PikachuSlotId[];
};

export const ANNIVERSARY_30_SOURCES: readonly Anniversary30Source[] = [
  {
    id: 'overview',
    nameKey: 'anniversary_30.sources.overview',
    url: 'https://www.pokemon.com/fr/actus-pokemon/preparez-vous-pour-lextension-30-anniversaire-du-jcc-pokemon',
  },
  {
    id: 'pikachu',
    nameKey: 'anniversary_30.sources.pikachu',
    url: 'https://www.pokemon.com/fr/actualites/des-cartes-pikachu-electrisantes-dans-lextension-30-anniversaire-du-jcc-pokemon',
  },
  {
    id: 'products',
    nameKey: 'anniversary_30.sources.products',
    url: 'https://www.pokemon.com/fr/actualites/jcc-pokemon-produits-30-anniversaire',
  },
  {
    id: 'gallery',
    nameKey: 'anniversary_30.sources.gallery',
    url: 'https://www.pokemon.com/fr/jcc-pokemon/galerie-produits',
  },
];

export const ANNIVERSARY_30_HERO_IMAGE = {
  url: {
    en: 'https://mcdn.pokemon.com/image/upload/c_limit,w_1439/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/30th-product-showcase-169-en.png',
    fr: 'https://mcdn.pokemon.com/image/upload/c_limit,w_1439/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/30th-product-showcase-169-fr.png',
  } satisfies Anniversary30LocalizedAsset,
  sourceUrl: 'https://www.pokemon.com/fr/actualites/jcc-pokemon-produits-30-anniversaire',
} as const;

const PRODUCTS_SOURCE_URL = ANNIVERSARY_30_SOURCES.find((source) => source.id === 'products')?.url;

if (!PRODUCTS_SOURCE_URL) {
  throw new Error('Missing official products source for the 30th anniversary landing.');
}

export const ANNIVERSARY_30_PRODUCTS: readonly Anniversary30Product[] = [
  {
    id: 'tech-sticker',
    nameKey: 'anniversary_30.products.tech_sticker_name',
    descriptionKey: 'anniversary_30.products.tech_sticker_description',
    availabilityKey: 'anniversary_30.products.window_launch',
    availabilityGroup: 'launch',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_1023,h_575/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/tech-sticker-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_1023,h_575/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/tech-sticker-collection-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'two-booster-blister',
    nameKey: 'anniversary_30.products.two_booster_blister_name',
    descriptionKey: 'anniversary_30.products.two_booster_blister_description',
    availabilityKey: 'anniversary_30.products.window_launch',
    availabilityGroup: 'launch',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/2-pack-blister-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/2-pack-blister-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'knock-out-collection',
    nameKey: 'anniversary_30.products.knock_out_collection_name',
    descriptionKey: 'anniversary_30.products.knock_out_collection_description',
    availabilityKey: 'anniversary_30.products.window_launch',
    availabilityGroup: 'launch',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/knock-out-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/knock-out-collection-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'poster-collection',
    nameKey: 'anniversary_30.products.poster_collection_name',
    descriptionKey: 'anniversary_30.products.poster_collection_description',
    availabilityKey: 'anniversary_30.products.window_launch',
    availabilityGroup: 'launch',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/poster-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/poster-collection-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'pokemon-ex-boxes',
    nameKey: 'anniversary_30.products.pokemon_ex_boxes_name',
    descriptionKey: 'anniversary_30.products.pokemon_ex_boxes_description',
    availabilityKey: 'anniversary_30.products.window_launch',
    availabilityGroup: 'launch',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/pokemon-ex-box-sylveon-ex-greninja-ex-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/pokemon-ex-box-sylveon-ex-greninja-ex-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'elite-trainer-box',
    nameKey: 'anniversary_30.products.elite_trainer_box_name',
    descriptionKey: 'anniversary_30.products.elite_trainer_box_description',
    availabilityKey: 'anniversary_30.products.window_launch',
    availabilityGroup: 'launch',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/elite-trainer-box-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/elite-trainer-box-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'binder-collection',
    nameKey: 'anniversary_30.products.binder_collection_name',
    descriptionKey: 'anniversary_30.products.binder_collection_description',
    availabilityKey: 'anniversary_30.products.window_q3',
    availabilityGroup: 'q3',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/binder-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/binder-collection-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'booster-bundle',
    nameKey: 'anniversary_30.products.booster_bundle_name',
    descriptionKey: 'anniversary_30.products.booster_bundle_description',
    availabilityKey: 'anniversary_30.products.window_q3',
    availabilityGroup: 'q3',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/booster-bundle-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/booster-bundle-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'mini-tins',
    nameKey: 'anniversary_30.products.mini_tins_name',
    descriptionKey: 'anniversary_30.products.mini_tins_description',
    availabilityKey: 'anniversary_30.products.window_q3',
    availabilityGroup: 'q3',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/mini-tin.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/mini-tin.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'battle-decks',
    nameKey: 'anniversary_30.products.battle_decks_name',
    descriptionKey: 'anniversary_30.products.battle_decks_description',
    availabilityKey: 'anniversary_30.products.window_q3',
    availabilityGroup: 'q3',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/battle-deck-espeon-ex-umbreon-ex-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/battle-deck-espeon-ex-umbreon-ex-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'ditto-premium-collection',
    nameKey: 'anniversary_30.products.ditto_premium_collection_name',
    descriptionKey: 'anniversary_30.products.ditto_premium_collection_description',
    availabilityKey: 'anniversary_30.products.window_q4',
    availabilityGroup: 'q4',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/ditto-premium-collection-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/ditto-premium-collection-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'ultra-premium-collections',
    nameKey: 'anniversary_30.products.ultra_premium_collections_name',
    descriptionKey: 'anniversary_30.products.ultra_premium_collections_description',
    availabilityKey: 'anniversary_30.products.window_q4',
    availabilityGroup: 'q4',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/ultra-premium-collection-day-night-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/ultra-premium-collection-day-night-fr.png',
    },
    sourceStatus: 'confirmed',
  },
  {
    id: 'figure-collection',
    nameKey: 'anniversary_30.products.figure_collection_name',
    descriptionKey: 'anniversary_30.products.figure_collection_description',
    availabilityKey: 'anniversary_30.products.window_q4',
    availabilityGroup: 'q4',
    sourceUrl: PRODUCTS_SOURCE_URL,
    imageUrl: {
      en: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/us/img/trading-card-game/tiles/30th/product-showcase/inline/figure-collection-mew-mewtwo-en.png',
      fr: 'https://mcdn.pokemon.com/image/upload/c_fit,w_2000,h_1125/f_auto/q_auto:best/v1/live/pcom-cms/static-assets/cms3/fr/img/trading-card-game/tiles/30th/product-showcase/inline/figure-collection-mew-mewtwo-fr.png',
    },
    sourceStatus: 'confirmed',
  },
];

export const ANNIVERSARY_30_PIKACHU_SLOTS: readonly Anniversary30PikachuSlot[] = Array.from(
  { length: 30 },
  (_, index) => ({
    id: `pikachu-rare-${String(index + 1).padStart(2, '0')}` as Anniversary30PikachuSlotId,
    status: 'placeholder' as const,
  }),
);

const ANNIVERSARY_30_PIKACHU_SLOT_IDS = new Set<Anniversary30PikachuSlotId>(
  ANNIVERSARY_30_PIKACHU_SLOTS.map((slot) => slot.id),
);

export function isAnniversary30Language(language: SupportedLanguage): language is Anniversary30Language {
  return (ANNIVERSARY_30_INDEXABLE_LANGUAGES as readonly string[]).includes(language);
}

export function getAnniversary30Language(language: SupportedLanguage): Anniversary30Language {
  return isAnniversary30Language(language) ? language : 'en';
}

export function createEmptyAnniversary30Progress(): Anniversary30Progress {
  return { version: 1, checkedSlotIds: [] };
}

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
  if (checked.has(slotId)) {
    checked.delete(slotId);
  } else {
    checked.add(slotId);
  }

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
