/**
 * Published third-party opening studies, kept distinct from raw Lunidex
 * samples. These rates are reported by their source and are not official
 * Pokémon odds or French-language pack estimates.
 */
export interface PublishedPullStudyV1 {
  id: string;
  setNames: readonly string[];
  language: 'English';
  /** The articles do not identify the packs' market/print region. */
  market: 'not-reported';
  sample: {
    packCount: number;
    packCountQualifier: 'more-than' | 'exact';
    scope: 'study' | 'each-set';
    productType: 'booster-pack';
    /** The cited reports publish sample sizes but no opening date range. */
    samplingPeriod: 'not-reported';
    confidence?: '95% normal approximation';
  };
  rates: readonly PublishedPullRateV1[];
  notes?: readonly ('pooled-set-assumption' | 'unmeasured-rarities' | 'god-packs-excluded')[];
  source: {
    publisher: 'TCGplayer' | 'PokéBeach' | 'Obsidia TCG';
    collector?: 'TCGplayer' | 'not-reported';
    url: `https://${string}`;
    verifiedAt: `${number}-${number}-${number}`;
  };
}

export type PublishedPullRateV1 =
  | {
    rarity: PublishedPullRarity;
    ratePercent: number;
    marginOfError95Percent: number;
    note?: 'multi-hit-packs';
    packsPerHit?: never;
  }
  | {
    rarity: PublishedPullRarity;
    packsPerHit: number;
    ratePercent?: never;
    marginOfError95Percent?: never;
    note?: never;
  };

export type PublishedPullRarity =
  | 'Double Rare'
  | 'Ultra Rare'
  | 'ACE SPEC Rare'
  | 'Illustration Rare'
  | 'Special Illustration Rare'
  | 'Hyper Rare'
  | 'Shiny Rare'
  | 'Shiny Ultra Rare'
  | 'Poké Ball Foil'
  | 'Master Ball Foil'
  | 'Foil Energy'
  | 'Mega Attack Rare'
  | 'Mega Hyper Rare'
  | 'Classic Collection'
  | 'Futuristic Rare';

/** Source-reported aggregates; raw card-by-card observations are not public. */
export const PUBLISHED_PULL_STUDIES_V1: readonly PublishedPullStudyV1[] = [
  {
    id: 'temporal-forces',
    setNames: ['Temporal Forces'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 16.83, marginOfError95Percent: 0.79 },
      { rarity: 'Ultra Rare', ratePercent: 6.67, marginOfError95Percent: 0.53 },
      { rarity: 'ACE SPEC Rare', ratePercent: 5.00, marginOfError95Percent: 0.46 },
      { rarity: 'Illustration Rare', ratePercent: 7.72, marginOfError95Percent: 0.56 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.17, marginOfError95Percent: 0.23 },
      { rarity: 'Hyper Rare', ratePercent: 0.72, marginOfError95Percent: 0.18 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/robot/28c0ad22-00a4-428f-b22d-e7fee9ec50bc/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'paldean-fates',
    setNames: ['Paldean Fates'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 1500, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 15.89, marginOfError95Percent: 1.69 },
      { rarity: 'Ultra Rare', ratePercent: 6.61, marginOfError95Percent: 1.15 },
      { rarity: 'Shiny Rare', ratePercent: 25.44, marginOfError95Percent: 2.01 },
      { rarity: 'Shiny Ultra Rare', ratePercent: 7.72, marginOfError95Percent: 1.23 },
      { rarity: 'Illustration Rare', ratePercent: 7.22, marginOfError95Percent: 1.20 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.72, marginOfError95Percent: 0.60 },
      { rarity: 'Hyper Rare', ratePercent: 1.61, marginOfError95Percent: 0.58 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldean-Fates-Pull-Rates/23de3e93-0d0f-4ae0-abc4-13664f3001a3/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'prismatic-evolutions',
    setNames: ['Prismatic Evolutions'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 1200, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Poké Ball Foil', ratePercent: 33.10, marginOfError95Percent: 2.60 },
      { rarity: 'Double Rare', ratePercent: 16.51, marginOfError95Percent: 2.05 },
      { rarity: 'Ultra Rare', ratePercent: 7.46, marginOfError95Percent: 1.45 },
      { rarity: 'ACE SPEC Rare', ratePercent: 4.68, marginOfError95Percent: 1.17 },
      { rarity: 'Master Ball Foil', ratePercent: 4.92, marginOfError95Percent: 1.19 },
      { rarity: 'Special Illustration Rare', ratePercent: 2.22, marginOfError95Percent: 0.81, note: 'multi-hit-packs' },
      { rarity: 'Hyper Rare', ratePercent: 0.56, marginOfError95Percent: 0.41 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Prismatic-Evolutions-Pull-Rates/d94889ea-f76a-4a13-b74d-5b0b071220a7/?source=syndication',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'scarlet-violet-151',
    setNames: ['Scarlet & Violet—151'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 1500, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Foil Energy', ratePercent: 24.83, marginOfError95Percent: 2.00 },
      { rarity: 'Double Rare', ratePercent: 13.28, marginOfError95Percent: 1.57 },
      { rarity: 'Ultra Rare', ratePercent: 6.44, marginOfError95Percent: 1.13 },
      { rarity: 'Illustration Rare', ratePercent: 8.50, marginOfError95Percent: 1.29 },
      { rarity: 'Special Illustration Rare', ratePercent: 3.11, marginOfError95Percent: 0.80 },
      { rarity: 'Hyper Rare', ratePercent: 1.94, marginOfError95Percent: 0.64 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Scarlet-Violet-151-Pull-Rates/b237df74-fbb0-40d0-9e13-d69ee6e804d9/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'stellar-crown',
    setNames: ['Stellar Crown'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 16.90, marginOfError95Percent: 0.79 },
      { rarity: 'Ultra Rare', ratePercent: 6.75, marginOfError95Percent: 0.53 },
      { rarity: 'ACE SPEC Rare', ratePercent: 4.94, marginOfError95Percent: 0.46 },
      { rarity: 'Illustration Rare', ratePercent: 7.79, marginOfError95Percent: 0.57 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.11, marginOfError95Percent: 0.22 },
      { rarity: 'Hyper Rare', ratePercent: 0.73, marginOfError95Percent: 0.18 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Stellar-Crown-Pull-Rates/2c0743dd-dbd0-4504-9ff8-be5a72dd04d1/?source=syndication',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'black-bolt-white-flare',
    setNames: ['Black Bolt', 'White Flare'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 350, packCountQualifier: 'more-than', scope: 'each-set', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    notes: ['pooled-set-assumption'],
    rates: [
      { rarity: 'Poké Ball Foil', ratePercent: 30.56, marginOfError95Percent: 3.36 },
      { rarity: 'Double Rare', ratePercent: 21.11, marginOfError95Percent: 2.98 },
      { rarity: 'Ultra Rare', ratePercent: 5.83, marginOfError95Percent: 1.71 },
      { rarity: 'Illustration Rare', ratePercent: 16.39, marginOfError95Percent: 2.70 },
      { rarity: 'Master Ball Foil', ratePercent: 5.14, marginOfError95Percent: 1.61 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.25, marginOfError95Percent: 0.81 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Black-Bolt-and-White-Flare-Pull-Rates/bac92199-a2a7-4668-b4a4-2647a111776f?pubDate=20250723',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'twilight-masquerade',
    setNames: ['Twilight Masquerade'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', packsPerHit: 6 },
      { rarity: 'Ultra Rare', packsPerHit: 15 },
      { rarity: 'ACE SPEC Rare', packsPerHit: 20 },
      { rarity: 'Illustration Rare', packsPerHit: 13 },
      { rarity: 'Special Illustration Rare', packsPerHit: 86 },
      { rarity: 'Hyper Rare', packsPerHit: 146 },
    ],
    source: {
      publisher: 'PokéBeach',
      collector: 'TCGplayer',
      url: 'https://www.pokebeach.com/2024/05/twilight-masquerade-pull-rates-revealed-gold-cards-just-slightly-rarer',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'surging-sparks',
    setNames: ['Surging Sparks'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 16.94, marginOfError95Percent: 0.79 },
      { rarity: 'Ultra Rare', ratePercent: 6.74, marginOfError95Percent: 0.53 },
      { rarity: 'ACE SPEC Rare', ratePercent: 5.03, marginOfError95Percent: 0.46 },
      { rarity: 'Illustration Rare', ratePercent: 7.67, marginOfError95Percent: 0.56 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.15, marginOfError95Percent: 0.22 },
      { rarity: 'Hyper Rare', ratePercent: 0.53, marginOfError95Percent: 0.15 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Surging-Sparks-Pull-Rates/6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'journey-together',
    setNames: ['Journey Together'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', packsPerHit: 5 },
      { rarity: 'Illustration Rare', packsPerHit: 12 },
      { rarity: 'Ultra Rare', packsPerHit: 15 },
      { rarity: 'Special Illustration Rare', packsPerHit: 86 },
      { rarity: 'Hyper Rare', packsPerHit: 137 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Journey-Together-Pull-Rates/1b9f379f-97cb-45cc-b6f6-a1a070a422cd/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'destined-rivals',
    setNames: ['Destined Rivals'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', packsPerHit: 5 },
      { rarity: 'Illustration Rare', packsPerHit: 12 },
      { rarity: 'Ultra Rare', packsPerHit: 16 },
      { rarity: 'Special Illustration Rare', packsPerHit: 94 },
      { rarity: 'Hyper Rare', packsPerHit: 149 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Destined-Rivals-Pull-Rates/43ba832e-44c9-45a4-ae2e-594df2defdda/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'mega-evolution',
    setNames: ['Mega Evolution'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 5000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', packsPerHit: 5 },
      { rarity: 'Illustration Rare', packsPerHit: 9 },
      { rarity: 'Ultra Rare', packsPerHit: 12 },
      { rarity: 'Special Illustration Rare', packsPerHit: 101 },
      { rarity: 'Mega Hyper Rare', packsPerHit: 1260 },
    ],
    source: {
      publisher: 'PokéBeach',
      collector: 'TCGplayer',
      url: 'https://www.pokebeach.com/2025/09/mega-evolution-pull-rates-revealed-gold-cards-nearly-impossible-to-pull-at-highest-pull-rates-ever-seen',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'phantasmal-flames',
    setNames: ['Phantasmal Flames'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 5000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', packsPerHit: 5 },
      { rarity: 'Illustration Rare', packsPerHit: 9 },
      { rarity: 'Ultra Rare', packsPerHit: 12 },
      { rarity: 'Special Illustration Rare', packsPerHit: 80 },
      { rarity: 'Mega Hyper Rare', packsPerHit: 1260 },
    ],
    source: {
      publisher: 'PokéBeach',
      collector: 'TCGplayer',
      url: 'https://www.pokebeach.com/2025/11/phantasmal-flames-pull-rates-revealed-chances-of-pulling-mega-charizard-ex',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'ascended-heroes',
    setNames: ['Ascended Heroes'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 2000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', packsPerHit: 5 },
      { rarity: 'Illustration Rare', packsPerHit: 9 },
      { rarity: 'Ultra Rare', packsPerHit: 21 },
      { rarity: 'Mega Attack Rare', packsPerHit: 29 },
      { rarity: 'Special Illustration Rare', packsPerHit: 70 },
      { rarity: 'Mega Hyper Rare', packsPerHit: 540 },
    ],
    notes: ['god-packs-excluded'],
    source: {
      publisher: 'PokéBeach',
      collector: 'TCGplayer',
      url: 'https://www.pokebeach.com/2026/02/ascended-heroes-pull-rates-finally-determined-better-than-usual',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'perfect-order',
    setNames: ['Perfect Order'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 3500, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 20.97, marginOfError95Percent: 1.34 },
      { rarity: 'Illustration Rare', ratePercent: 11.20, marginOfError95Percent: 1.03 },
      { rarity: 'Ultra Rare', ratePercent: 8.54, marginOfError95Percent: 0.92 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.23, marginOfError95Percent: 0.36 },
      { rarity: 'Mega Hyper Rare', ratePercent: 0.06, marginOfError95Percent: 0.08 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Perfect-Order-Pull-Rates/73148119-ebcb-40b7-84b6-52b3a6d0c631/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'chaos-rising',
    setNames: ['Chaos Rising'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 8500, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported', confidence: '95% normal approximation' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 20.30, marginOfError95Percent: 0.85 },
      { rarity: 'Ultra Rare', ratePercent: 8.29, marginOfError95Percent: 0.58 },
      { rarity: 'Illustration Rare', ratePercent: 10.66, marginOfError95Percent: 0.65 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.21, marginOfError95Percent: 0.23 },
      { rarity: 'Mega Hyper Rare', ratePercent: 0.10, marginOfError95Percent: 0.07 },
    ],
    source: {
      publisher: 'TCGplayer',
      url: 'https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Chaos-Rising-Pull-Rates/304e8bfc-175a-4d31-93fe-5bb1be11e5d2/',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: 'pitch-black',
    setNames: ['Pitch Black'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 4000, packCountQualifier: 'more-than', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Double Rare', ratePercent: 21.02, marginOfError95Percent: 1.21 },
      { rarity: 'Ultra Rare', ratePercent: 8.30, marginOfError95Percent: 0.82 },
      { rarity: 'Illustration Rare', ratePercent: 11.01, marginOfError95Percent: 0.93 },
      { rarity: 'Special Illustration Rare', ratePercent: 1.25, marginOfError95Percent: 0.33 },
      { rarity: 'Mega Hyper Rare', ratePercent: 0.09, marginOfError95Percent: 0.09 },
    ],
    source: {
      publisher: 'Obsidia TCG',
      collector: 'not-reported',
      url: 'https://obsidia-tcg.store/blogs/news/pokemon-tcg-pitch-black-pull-rates-mega-darkrai-ex-odds',
      verifiedAt: '2026-09-30',
    },
  },
  {
    id: '30th-celebration',
    setNames: ['30th Celebration'],
    language: 'English',
    market: 'not-reported',
    sample: { packCount: 3000, packCountQualifier: 'exact', scope: 'study', productType: 'booster-pack', samplingPeriod: 'not-reported' },
    rates: [
      { rarity: 'Illustration Rare', packsPerHit: 5 },
      { rarity: 'Classic Collection', packsPerHit: 10 },
      { rarity: 'Special Illustration Rare', packsPerHit: 21 },
      { rarity: 'Futuristic Rare', packsPerHit: 120 },
    ],
    notes: ['unmeasured-rarities'],
    source: {
      publisher: 'PokéBeach',
      collector: 'TCGplayer',
      url: 'https://www.pokebeach.com/2026/09/30th-celebration-pull-rates-and-most-valuable-cards-worldwide-friendliest-pull-rates-of-the-modern-era',
      verifiedAt: '2026-09-30',
    },
  },
];
