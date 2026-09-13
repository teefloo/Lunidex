import type { TCGCard } from '@/types/tcg';

import {
  ANNIVERSARY_30_CARD_LIST_SOURCE_URL,
  ANNIVERSARY_30_CLASSIC_SOURCE_URL,
  ANNIVERSARY_30_FALLBACK_SET_ID,
  ANNIVERSARY_30_OFFICIAL_GALLERY_URL,
  ANNIVERSARY_30_LAST_VERIFIED_DATE,
  type Anniversary30Card,
  type Anniversary30CardDataset,
  type Anniversary30CardFilter,
  type Anniversary30CardScope,
} from '@/lib/anniversary-30';

const VERIFIED_AT = ANNIVERSARY_30_LAST_VERIFIED_DATE;
const OFFICIAL_GALLERY_URL = ANNIVERSARY_30_OFFICIAL_GALLERY_URL;
const CARD_LIST_URL = ANNIVERSARY_30_CARD_LIST_SOURCE_URL;
const CLASSIC_LIST_URL = ANNIVERSARY_30_CLASSIC_SOURCE_URL;

/**
 * The official gallery currently exposes these stable file identifiers from
 * its card viewer. Keeping the path in one helper makes a future CDN change a
 * one-line maintenance task. We only attach an image to a card when its URL
 * has been validated by the provider response; an unverified path is never
 * rendered as a card image.
 */
const OFFICIAL_GALLERY_ASSET_PATH = `${OFFICIAL_GALLERY_URL}assets`;

function getGalleryAssetUrl(fileName: string): string {
  return `${OFFICIAL_GALLERY_ASSET_PATH}/${fileName}`;
}

export function getAnniversary30OfficialCardImage(input: {
  scope: 'numbered-main' | 'secret-rare' | 'pikachu';
  localId: string;
} | {
  scope: 'classic-collection';
  imageIndex: number;
}): string {
  if (input.scope === 'classic-collection') {
    return getGalleryAssetUrl(`2M6P_Classic_EN_${input.imageIndex}.png`);
  }

  const normalizedLocalId = input.localId.replace(/^0+/, '') || '0';
  return getGalleryAssetUrl(`2M6P_EN_${Number(normalizedLocalId)}.png`);
}

type MainCardRow = readonly [name: string, rarity: string, illustrator?: string];

const MAIN_CARD_ROWS: readonly MainCardRow[] = [
  ['Exeggcute', 'Common', 'Nelnal'],
  ['Alolan Exeggutor', 'Common', 'Oswaldo KATO'],
  ['Volbeat', 'Common', 'Yoriyuki Ikegami'],
  ['Illumise', 'Common', 'Shibuzoh'],
  ['Tropius', 'Common', 'Minahamu'],
  ['Cherubi', 'Common', 'Kurata So'],
  ['Cherrim', 'Common', 'takashi shiraishi'],
  ['Vivillon', 'Common', 'Jerky'],
  ['Vulpix', 'Common', 'miki kudo'],
  ['Ninetales', 'Common', 'kodama'],
  ['Moltres', 'Common', 'HYOGONOSUKE'],
  ['Ho-Oh', 'Rare', 'Anesaki Dynamic'],
  ['Victini', 'Common', 'Jiro Sasumo'],
  ['Reshiram', 'Rare', 'Uta'],
  ['Fuecoco ex', 'Double Rare', '5ban Graphics'],
  ['Slowpoke', 'Common', 'Uninori'],
  ['Lapras', 'Common', 'Masa'],
  ['Articuno', 'Common', 'HYOGONOSUKE'],
  ['Kyogre', 'Rare', 'Tonji Matsuno'],
  ['Palkia', 'Rare', 'kawayoo'],
  ['Greninja ex', 'Double Rare', '5ban Graphics'],
  ['Wishiwashi', 'Common', 'Narano'],
  ['Pikachu', 'Pikachu Rare', 'Ken Sugimori'],
  ['Pikachu', 'Pikachu Rare', 'danciao'],
  ['Pikachu', 'Pikachu Rare', 'satoma'],
  ['Pikachu', 'Pikachu Rare', 'Takeshi Nakamura'],
  ['Pikachu', 'Pikachu Rare', 'Asako Ito'],
  ['Pikachu', 'Pikachu Rare', 'sowsow'],
  ['Pikachu', 'Pikachu Rare', 'James Turner'],
  ['Pikachu', 'Pikachu Rare', 'DOM'],
  ['Pikachu', 'Pikachu Rare', 'Atsushi Furusawa'],
  ['Pikachu', 'Pikachu Rare', 'Tomokazu Komiya'],
  ['Pikachu', 'Pikachu Rare', 'Narumi Sato'],
  ['Pikachu', 'Pikachu Rare', 'USGMEN'],
  ['Pikachu', 'Pikachu Rare', 'Susumu Maeya'],
  ['Pikachu', 'Pikachu Rare', 'OKACHEKE'],
  ['Pikachu', 'Pikachu Rare', 'Yuu Nishida'],
  ['Pikachu', 'Pikachu Rare', 'Tetsu Kayama'],
  ['Pikachu', 'Pikachu Rare', 'Teeziro'],
  ['Pikachu', 'Pikachu Rare', 'Shinji Kanda'],
  ['Pikachu', 'Pikachu Rare', 'Rianti Hidayat'],
  ['Pikachu', 'Pikachu Rare', 'Akira Komayama'],
  ['Pikachu', 'Pikachu Rare', 'OOYAMA'],
  ['Pikachu', 'Pikachu Rare', 'akagi'],
  ['Pikachu', 'Pikachu Rare', 'Naoya Kimura'],
  ['Pikachu', 'Pikachu Rare', 'svlt'],
  ['Pikachu', 'Pikachu Rare', 'Atsuko Nishida'],
  ['Pikachu', 'Pikachu Rare', 'KIYOTAKA OSHIYAMA'],
  ['Pikachu', 'Pikachu Rare', 'Nurikabe'],
  ['Pikachu', 'Pikachu Rare', 'Shimaris Yukichi'],
  ['Pikachu', 'Pikachu Rare', 'nagimiso'],
  ['Pikachu', 'Pikachu Rare', 'Kazuki Minami'],
  ['Pikachu ex', 'Double Rare', '5ban Graphics'],
  ['Pikachu ex', 'Double Rare', 'takuyoa'],
  ['Zapdos', 'Common', 'HYOGONOSUKE'],
  ['Zekrom', 'Rare', 'akagi'],
  ['Zeraora', 'Common', 'Bun Toujo'],
  ['Toxel', 'Common', 'Shimaris Yukichi'],
  ['Toxtricity', 'Common', 'Haru Akasaka'],
  ['Toxtricity', 'Common', 'Yuriko Akase'],
  ['Morpeko', 'Common', 'Naoki Saito'],
  ['Miraidon', 'Rare', 'Kazumasa Yasukuni'],
  ['Mewtwo', 'Rare', 'nagimiso'],
  ['Mewtwo ex', 'Double Rare', '5ban Graphics'],
  ['Mew', 'Rare', 'danciao'],
  ['Mew ex', 'Double Rare', 'aky CG Works'],
  ['Marill', 'Common', 'Saya Tsuruta'],
  ['Azumarill', 'Common', 'Kagemaru Himeno'],
  ['Espeon', 'Common', 'aspara'],
  ['Espeon ex', 'Double Rare', '5ban Graphics'],
  ['Sylveon ex', 'Double Rare', '5ban Graphics'],
  ['Unown', 'Common', 'mingo'],
  ['Drifloon', 'Common', 'Shinya Komatsu'],
  ['Cresselia', 'Common', 'KEIICHIRO ITO'],
  ['Chandelure', 'Common', 'Yoshioka'],
  ['Xerneas', 'Rare', 'kodama'],
  ['Comfey', 'Common', 'sui'],
  ['Cosmog', 'Common', 'Mina Nakai'],
  ['Cosmoem', 'Common', 'Masako Tomii'],
  ['Lunala', 'Rare', 'Bun Toujo'],
  ['Gimmighoul', 'Common', 'Fujimoto Gold'],
  ['Groudon', 'Rare', 'Takumi Wada'],
  ['Lucario', 'Common', 'Hideki Ishikawa'],
  ['Seismitoad', 'Common', 'Kurata So'],
  ['Lycanroc', 'Common', 'matazo'],
  ['Koraidon', 'Rare', 'Mitsuhiro Arita'],
  ['Nidoran♀', 'Common', 'Taira Akitsu'],
  ['Nidorina', 'Common', 'Miki Tanaka'],
  ['Alolan Meowth', 'Common', 'Natsumi Yoshida'],
  ['Gengar ex', 'Double Rare', '5ban Graphics'],
  ['Umbreon', 'Common', 'Iori Suzuki'],
  ['Umbreon ex', 'Double Rare'],
  ['Murkrow', 'Common', 'Kouki Saitou'],
  ['Scraggy', 'Common', 'Souichirou Gunjima'],
  ['Zorua', 'Common', 'Atsuya Uki'],
  ['Zoroark', 'Common', 'Shiburingaru'],
  ['Deino', 'Common', 'Gapao'],
  ['Zweilous', 'Common', 'IKEDA Saki'],
  ['Hydreigon', 'Common', 'Ryuta Fuse'],
  ['Yveltal', 'Rare', 'hncl'],
  ['Galarian Meowth', 'Common', 'Mékayu'],
  ['Jirachi ex', 'Double Rare', '5ban Graphics'],
  ['Dialga', 'Rare', 'toriyufu'],
  ['Ferrothorn', 'Common', 'Po-Suzuki'],
  ['Solgaleo', 'Rare', 'Nurikabe'],
  ['Zacian', 'Rare', 'AKIRA EGAWA'],
  ['Zamazenta', 'Rare', 'Tsuyoshi Nagano'],
  ['Gholdengo', 'Common', 'Sanosuke Sakuma'],
  ['Salamence ex', 'Double Rare', '5ban Graphics'],
  ['Jangmo-o', 'Common', 'miki kudo'],
  ['Hakamo-o', 'Common', 'Jiro Sasumo'],
  ['Kommo-o', 'Common', 'MARINA Chikazawa'],
  ['Meowth', 'Common', 'MINAMINAMI Take'],
  ['Kangaskhan', 'Common', 'Pani Kobayashi'],
  ['Ditto', 'Common', 'Toshinao Aoki'],
  ['Eevee', 'Common', 'Wintr Wandr'],
  ['Eevee', 'Common', 'En Morikura'],
  ['Eevee', 'Common', 'Hitoshi Ariga'],
  ['Snorlax', 'Common', 'Aya Kusube'],
  ['Igglybuff', 'Common', 'Kanami Ogata'],
  ['Lugia', 'Rare', 'Kazuki Minami'],
  ['Hisuian Zorua', 'Common', 'Megumi Mizutani'],
  ['Hisuian Zoroark', 'Common', 'Kamome Shirahama'],
  ['Minior', 'Common', 'ryoma uratsuka'],
  ['Maushold', 'Common', 'Kariya'],
  ['Poké Pad', 'Common', 'Yuka Morii'],
  ['Switch', 'Common', 'Yuka Morii'],
  ['Ultra Ball', 'Common', 'Yuka Morii'],
];

const SECRET_CARD_ROWS: readonly MainCardRow[] = [
  ['Alolan Exeggutor', 'Illustration Rare', 'AYUMI ODASHIMA'],
  ['Moltres', 'Illustration Rare', 'mashu'],
  ['Lapras', 'Illustration Rare', 'Ameikart'],
  ['Articuno', 'Illustration Rare', 'mashu'],
  ['Zapdos', 'Illustration Rare', 'mashu'],
  ['Toxtricity', 'Illustration Rare', 'Kazumasa Yasukuni'],
  ['Morpeko', 'Illustration Rare', 'Yoshimi Miyoshi'],
  ['Drifloon', 'Illustration Rare', 'Whisker'],
  ['Chandelure', 'Illustration Rare', 'YASHIRO Nanaco'],
  ['Lycanroc', 'Illustration Rare', 'Raita Kazama'],
  ['Alolan Meowth', 'Illustration Rare', 'OKUBO'],
  ['Scraggy', 'Illustration Rare', 'GOSSAN'],
  ['Galarian Meowth', 'Illustration Rare', 'OKUBO'],
  ['Gholdengo', 'Illustration Rare', 'toriyufu'],
  ['Kommo-o', 'Illustration Rare'],
  ['Meowth', 'Illustration Rare', 'OKUBO'],
  ['Hisuian Zorua', 'Illustration Rare', '0313'],
  ['Maushold', 'Illustration Rare', 'osare'],
  ['Fuecoco ex', 'Special Illustration Rare', 'Atsushi Furusawa'],
  ['Greninja ex', 'Special Illustration Rare', 'GIDORA'],
  ['Pikachu ex', 'Special Illustration Rare', 'kantaro'],
  ['Pikachu ex', 'Special Illustration Rare', 'kantaro'],
  ['Mewtwo ex', 'Special Illustration Rare'],
  ['Mew ex', 'Special Illustration Rare'],
  ['Sylveon ex', 'Special Illustration Rare', 'You Iribi'],
  ['Gengar ex', 'Special Illustration Rare'],
  ['Jirachi ex', 'Special Illustration Rare', 'AKIRA EGAWA'],
  ['Salamence ex', 'Special Illustration Rare', 'Ryota Murayama'],
  ['Mewtwo ex', 'Futuristic Rare', 'YOSHIROTTEN'],
  ['Mew ex', 'Futuristic Rare', 'YOSHIROTTEN'],
];

const CLASSIC_CARD_ROWS: readonly (readonly [name: string, originalNumber: string, originalSet: string])[] = [
  ['Charizard', '4/102', 'Base Set (1999)'],
  ['Delcatty', '5/109', 'EX Ruby & Sapphire (2003)'],
  ['Metagross δ', '11/113', 'EX Delta Species (2005)'],
  ['Genesect-EX', '11/101', 'Plasma Blast (2013)'],
  ['Misty', '18/132', 'Gym Heroes (2000)'],
  ['Dark Tyranitar', '19/109', 'EX Team Rocket Returns (2004)'],
  ['Sneasel', '25/111', 'Neo Genesis (2000)'],
  ['Pikachu & Zekrom-GX', '33/181', 'Sun & Moon—Team Up (2019)'],
  ['Greninja BREAK', '41/122', 'XY—BREAKpoint (2016)'],
  ['Uxie', '43/146', 'Legends Awakened (2008)'],
  ['Crobat G', '47/127', 'Platinum (2009)'],
  ['Raikou', '050/185', 'Vivid Voltage (2020)'],
  ['Buzzwole-GX', '57/111', 'Crimson Invasion (2017)'],
  ['Pikachu', '58/102', 'Base Set (1999)'],
  ["Erika's Jigglypuff", '69/132', 'Gym Challenge (2000)'],
  ['Rayquaza-EX', '85/124', 'Dragons Exalted (2012)'],
  ['Solgaleo-GX', '89/149', 'Sun & Moon (2017)'],
  ['Gengar (Prime)', '94/102', 'HS—Triumphant (2010)'],
  ['Darkrai & Cresselia LEGEND (top)', '99/102', 'HS—Triumphant (2010)'],
  ['Darkrai & Cresselia LEGEND (bottom)', '100/102', 'HS—Triumphant (2010)'],
  ['N', '101/101', 'Noble Victories (2011)'],
  ['Palkia LV.X', '106/106', 'Great Encounters (2008)'],
  ['M Gardevoir-EX', '106/160', 'Primal Clash (2015)'],
  ['Shining Celebi', '106/105', 'Neo Destiny (2002)'],
  ['Scizor ex', '108/115', 'EX Unseen Forces (2005)'],
  ['Mew VMAX', '114/264', 'Fusion Strike (2021)'],
  ['Arceus VSTAR', '123/172', 'Brilliant Stars (2022)'],
  ['Zacian V', '138/202', 'Sword & Shield (2020)'],
  ['Lugia', '149/147', 'Aquapolis (2003), Crystal Type'],
  ['Magikarp', '203/193', 'Paldea Evolved (2023)'],
];

const BASIC_ENERGY_NAMES = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal'] as const;

const PROMO_ROWS: readonly (readonly [localId: string, name: string, imageStatus: Anniversary30Card['imageStatus']])[] = [
  ['094', 'Alolan Exeggutor', 'unknown'],
  ['095', 'Lucario', 'unknown'],
  ['096', 'Moltres', 'not-published'],
  ['097', 'Articuno', 'not-published'],
  ['098', 'Zapdos', 'not-published'],
  ['099', 'Greninja ex', 'unknown'],
  ['100', 'Sylveon ex', 'unknown'],
  ['101', 'Nidorina (full art)', 'unknown'],
  ['102', 'Victini', 'unknown'],
  ['103', 'Zeraora', 'unknown'],
  ['104', 'Mewtwo', 'not-published'],
  ['105', 'Mew', 'not-published'],
  ['106', 'Ditto', 'not-published'],
  ['107', 'Pikachu ex', 'unknown'],
  ['108', 'Espeon ex', 'unknown'],
  ['109', 'Pikachu ex', 'unknown'],
  ['110', 'Umbreon ex', 'unknown'],
];

const MAIN_SOURCE_URLS = [OFFICIAL_GALLERY_URL, CARD_LIST_URL] as const;
const CLASSIC_SOURCE_URLS = [OFFICIAL_GALLERY_URL, CLASSIC_LIST_URL] as const;

function createCard(input: Omit<Anniversary30Card, 'sourceUrls' | 'verifiedAt' | 'officialUrl'> & {
  sourceUrls?: readonly string[];
  verifiedAt?: string;
  officialUrl?: string;
}): Anniversary30Card {
  return {
    ...input,
    officialUrl: input.officialUrl ?? OFFICIAL_GALLERY_URL,
    sourceUrls: input.sourceUrls ?? MAIN_SOURCE_URLS,
    verifiedAt: input.verifiedAt ?? VERIFIED_AT,
  };
}

function createMainCard(row: MainCardRow, index: number): Anniversary30Card {
  const localId = String(index + 1).padStart(3, '0');
  const isPikachu = index >= 22 && index <= 51;
  return createCard({
    id: `${ANNIVERSARY_30_FALLBACK_SET_ID}-${localId}`,
    localId,
    collectorNumber: `${localId}/128`,
    name: row[0],
    scope: isPikachu ? 'pikachu' : 'numbered-main',
    rarity: row[1],
    ...(row[2] ? { illustrator: row[2] } : {}),
    ...(isPikachu ? { pikachuNumber: index - 21 } : {}),
    sourceStatus: 'verified-database',
    imageStatus: 'unknown',
  });
}

function createSecretCard(row: MainCardRow, index: number): Anniversary30Card {
  const number = index + 129;
  const localId = String(number);
  const imageUnavailable = [143, 151, 152, 154].includes(number);
  return createCard({
    id: `${ANNIVERSARY_30_FALLBACK_SET_ID}-${localId}`,
    localId,
    collectorNumber: `${localId}/128`,
    name: row[0],
    scope: 'secret-rare',
    rarity: row[1],
    ...(row[2] ? { illustrator: row[2] } : {}),
    sourceStatus: imageUnavailable ? 'reported' : 'verified-database',
    imageStatus: imageUnavailable ? 'not-published' : 'unknown',
  });
}

function createClassicCard(
  row: readonly [name: string, originalNumber: string, originalSet: string],
  index: number,
): Anniversary30Card {
  const localId = `classic-${String(index + 1).padStart(2, '0')}`;
  return createCard({
    id: `${ANNIVERSARY_30_FALLBACK_SET_ID}-${localId}`,
    localId,
    collectorNumber: row[1],
    name: row[0],
    scope: 'classic-collection',
    originalNumber: row[1],
    originalSet: row[2],
    rarity: 'Classic Collection',
    sourceStatus: 'reported',
    sourceUrls: CLASSIC_SOURCE_URLS,
    imageStatus: 'unknown',
  });
}

function createBasicEnergyCard(name: string, index: number): Anniversary30Card {
  void index;
  const localId = `energy-${name.toLowerCase()}`;
  return createCard({
    id: `${ANNIVERSARY_30_FALLBACK_SET_ID}-${localId}`,
    localId,
    collectorNumber: '—',
    name: `Basic ${name} Energy`,
    scope: 'basic-energy',
    rarity: 'Basic Energy',
    illustrator: 'YOSHIROTTEN',
    sourceStatus: 'reported',
    sourceUrls: [CARD_LIST_URL, CLASSIC_LIST_URL],
    imageStatus: 'unknown',
  });
}

function createPromoCard(
  row: readonly [localId: string, name: string, imageStatus: Anniversary30Card['imageStatus']],
): Anniversary30Card {
  return createCard({
    id: `${ANNIVERSARY_30_FALLBACK_SET_ID}-mep-${row[0]}`,
    localId: `MEP-${row[0]}`,
    collectorNumber: `MEP ${row[0]}`,
    name: row[1],
    scope: 'promo',
    rarity: 'Promo',
    sourceStatus: 'verified-database',
    imageStatus: row[2],
  });
}

export const ANNIVERSARY_30_NUMBERED_CARDS: readonly Anniversary30Card[] = MAIN_CARD_ROWS.map(createMainCard);
export const ANNIVERSARY_30_PIKACHU_CARDS: readonly Anniversary30Card[] = ANNIVERSARY_30_NUMBERED_CARDS.filter(
  (card) => card.scope === 'pikachu',
);
export const ANNIVERSARY_30_SECRET_CARDS: readonly Anniversary30Card[] = SECRET_CARD_ROWS.map(createSecretCard);
export const ANNIVERSARY_30_CLASSIC_CARDS: readonly Anniversary30Card[] = CLASSIC_CARD_ROWS.map(createClassicCard);
export const ANNIVERSARY_30_BASIC_ENERGY_CARDS: readonly Anniversary30Card[] = BASIC_ENERGY_NAMES.map(createBasicEnergyCard);
export const ANNIVERSARY_30_PROMO_CARDS: readonly Anniversary30Card[] = PROMO_ROWS.map(createPromoCard);

export const ANNIVERSARY_30_CARD_MANIFEST: readonly Anniversary30Card[] = [
  ...ANNIVERSARY_30_NUMBERED_CARDS,
  ...ANNIVERSARY_30_SECRET_CARDS,
  ...ANNIVERSARY_30_CLASSIC_CARDS,
  ...ANNIVERSARY_30_BASIC_ENERGY_CARDS,
  ...ANNIVERSARY_30_PROMO_CARDS,
];

export const ANNIVERSARY_30_CARD_SCOPES: readonly Anniversary30CardScope[] = [
  'numbered-main',
  'secret-rare',
  'pikachu',
  'classic-collection',
  'basic-energy',
  'promo',
];

const ANNIVERSARY_30_FEATURE_CARD_NAMES = [
  'Pikachu ex',
  'Mew ex',
  'Mewtwo ex',
  'Lugia',
  'Ho-Oh',
] as const;

export function getAnniversary30FeaturedCards(
  cards: readonly Anniversary30Card[],
): Anniversary30Card[] {
  return ANNIVERSARY_30_FEATURE_CARD_NAMES.flatMap((name) => {
    const card = cards.find((entry) => entry.scope === 'numbered-main' && entry.name === name);
    return card ? [card] : [];
  });
}

export function getAnniversary30FuturisticRareCards(
  cards: readonly Anniversary30Card[],
): Anniversary30Card[] {
  return cards.filter(
    (card) => card.scope === 'secret-rare' && canonicalRarity(card.rarity) === 'futuristicrare',
  );
}

export function getAnniversary30Manifest(
  cards: readonly Anniversary30Card[] = ANNIVERSARY_30_CARD_MANIFEST,
): Anniversary30CardDataset {
  return {
    cards,
    numberedMain: cards.filter((card) => card.scope === 'numbered-main' || card.scope === 'pikachu'),
    secretRares: cards.filter((card) => card.scope === 'secret-rare'),
    pikachu: cards.filter((card) => card.scope === 'pikachu'),
    classicCollection: cards.filter((card) => card.scope === 'classic-collection'),
    basicEnergy: cards.filter((card) => card.scope === 'basic-energy'),
    promos: cards.filter((card) => card.scope === 'promo'),
  };
}

function normalizeLocalId(value: string): string {
  const normalized = value.trim().replace(/^0+/, '');
  return normalized ? normalized : '0';
}

function providerCardKey(card: TCGCard): string {
  return normalizeLocalId(card.localId || card.number || '');
}

function providerImage(card: TCGCard): string | undefined {
  const value = card.imageUrl?.trim() || card.image?.trim();
  return value || undefined;
}

function localizedImage(url: string): Anniversary30Card['imageUrl'] {
  return { en: url, fr: url };
}

/**
 * Merge a validated provider response without letting provider identifiers
 * replace the stable fallback identity used by the collection store.
 */
export function mergeAnniversary30Cards(
  manifest: readonly Anniversary30Card[],
  providerCards: readonly TCGCard[],
): Anniversary30Card[] {
  const providerByLocalId = new Map<string, TCGCard>();
  for (const card of providerCards) {
    const key = providerCardKey(card);
    if (key && !providerByLocalId.has(key)) providerByLocalId.set(key, card);
  }

  return manifest.map((entry) => {
    const provider = providerByLocalId.get(normalizeLocalId(entry.localId));
    if (!provider) return entry;

    const image = providerImage(provider);
    return {
      ...entry,
      name: provider.name.trim() || entry.name,
      rarity: provider.rarity?.trim() || entry.rarity,
      illustrator: provider.illustrator?.trim() || entry.illustrator,
      ...(image ? { imageUrl: localizedImage(image), imageStatus: 'available' as const } : {}),
      ...(provider.id.trim() ? { lunidexCardId: provider.id.trim() } : {}),
    };
  });
}

function canonicalRarity(value: string | undefined): string {
  return value?.trim().toLowerCase().replace(/[^a-z]/g, '') ?? '';
}

export function filterAnniversary30Cards(
  cards: readonly Anniversary30Card[],
  filter: Anniversary30CardFilter,
  ownedCardIds: ReadonlySet<string> = new Set<string>(),
  wishlistCardIds: ReadonlySet<string> = new Set<string>(),
): Anniversary30Card[] {
  return cards.filter((card) => {
    const owned = ownedCardIds.has(card.id) || Boolean(card.lunidexCardId && ownedCardIds.has(card.lunidexCardId));
    switch (filter) {
      case 'owned':
        return owned;
      case 'missing':
        return !owned;
      case 'wishlist':
        return wishlistCardIds.has(card.id) || Boolean(card.lunidexCardId && wishlistCardIds.has(card.lunidexCardId));
      case 'pikachu':
        return card.scope === 'pikachu';
      case 'pokemon-ex':
        return /\bex\b/i.test(card.name);
      case 'illustration-rare':
        return canonicalRarity(card.rarity) === 'illustrationrare';
      case 'special-illustration-rare':
        return canonicalRarity(card.rarity) === 'specialillustrationrare';
      case 'futuristic-rare':
        return canonicalRarity(card.rarity) === 'futuristicrare';
      case 'classic-collection':
        return card.scope === 'classic-collection';
      case 'all':
      default:
        return true;
    }
  });
}

export function countAnniversary30IncompleteImages(cards: readonly Anniversary30Card[]): number {
  return cards.filter((card) => card.imageStatus !== 'available').length;
}

export function getAnniversary30ManifestDataQuality(
  cards: readonly Anniversary30Card[],
  providerCards: readonly TCGCard[] = [],
) {
  const manifest = getAnniversary30Manifest(cards);
  return {
    providerAvailable: providerCards.length > 0,
    fallbackUsed: cards.some((card) => !card.lunidexCardId),
    incompleteImageCount: countAnniversary30IncompleteImages(cards),
    numberedMainComplete: manifest.numberedMain.length === 128,
    pikachuComplete: manifest.pikachu.length === 30,
    classicCollectionComplete: manifest.classicCollection.length === 30,
    promoCount: manifest.promos.length,
    basicEnergyCount: manifest.basicEnergy.length,
  } as const;
}
