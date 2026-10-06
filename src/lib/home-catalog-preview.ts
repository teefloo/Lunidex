import { getRarityWeight } from '@/lib/tcg-collection';
import type { TCGCard } from '@/types/tcg';

export type HomeCatalogPreviewCard = Pick<TCGCard, 'id' | 'localId' | 'name' | 'rarity'> & {
  image: string;
  set: Pick<NonNullable<TCGCard['set']>, 'id' | 'name'>;
};

const HOME_CATALOG_PREVIEW_RESPONSIVE_WIDTHS = [160, 256] as const;

export function getHomeCatalogPreviewImageSrcSet(src: string): string | undefined {
  const filename = /^\/tcg-showcase\/([^/]+)\.webp$/.exec(src)?.[1];
  if (!filename) return undefined;

  const variants = HOME_CATALOG_PREVIEW_RESPONSIVE_WIDTHS
    .map((width) => `/tcg-showcase/responsive/${filename}-${width}.webp ${width}w`);
  variants.push(`${src} 384w`);
  return variants.join(', ');
}

// Card facts come from the public TCGdex detail records. The image paths point
// to local 384px WebP preview copies. Smaller responsive variants reduce mobile
// transfers while the 384px source covers a 192px CSS display at 2x density.
export const HOME_CATALOG_PREVIEW_CARDS: readonly HomeCatalogPreviewCard[] = [
  { id: 'sv03-228', localId: '228', name: 'Charizard ex', rarity: 'Hyper rare', image: '/tcg-showcase/sv03-228.webp', set: { id: 'sv03', name: 'Obsidian Flames' } },
  { id: 'swsh7-215', localId: '215', name: 'Umbreon VMAX', rarity: 'Secret Rare', image: '/tcg-showcase/swsh7-215.webp', set: { id: 'swsh7', name: 'Evolving Skies' } },
  { id: 'sv06-214', localId: '214', name: 'Greninja ex', rarity: 'Special illustration rare', image: '/tcg-showcase/sv06-214.webp', set: { id: 'sv06', name: 'Twilight Masquerade' } },
  { id: 'swsh7-218', localId: '218', name: 'Rayquaza VMAX', rarity: 'Secret Rare', image: '/tcg-showcase/swsh7-218.webp', set: { id: 'swsh7', name: 'Evolving Skies' } },
  { id: 'sv03.5-198', localId: '198', name: 'Venusaur ex', rarity: 'Special illustration rare', image: '/tcg-showcase/sv03.5-198.webp', set: { id: 'sv03.5', name: '151' } },
  { id: 'sv03.5-199', localId: '199', name: 'Charizard ex', rarity: 'Special illustration rare', image: '/tcg-showcase/sv03.5-199.webp', set: { id: 'sv03.5', name: '151' } },
  { id: 'sv03.5-200', localId: '200', name: 'Blastoise ex', rarity: 'Special illustration rare', image: '/tcg-showcase/sv03.5-200.webp', set: { id: 'sv03.5', name: '151' } },
  { id: 'sv02-203', localId: '203', name: 'Magikarp', rarity: 'Illustration rare', image: '/tcg-showcase/sv02-203.webp', set: { id: 'sv02', name: 'Paldea Evolved' } },
  { id: 'sv02-269', localId: '269', name: 'Iono', rarity: 'Special illustration rare', image: '/tcg-showcase/sv02-269.webp', set: { id: 'sv02', name: 'Paldea Evolved' } },
  { id: 'sv04-251', localId: '251', name: 'Roaring Moon ex', rarity: 'Special illustration rare', image: '/tcg-showcase/sv04-251.webp', set: { id: 'sv04', name: 'Paradox Rift' } },
  { id: 'sv04-254', localId: '254', name: 'Mela', rarity: 'Special illustration rare', image: '/tcg-showcase/sv04-254.webp', set: { id: 'sv04', name: 'Paradox Rift' } },
  { id: 'sv06-215', localId: '215', name: 'Cornerstone Mask Ogerpon ex', rarity: 'Special illustration rare', image: '/tcg-showcase/sv06-215.webp', set: { id: 'sv06', name: 'Twilight Masquerade' } },
];

export function getHomeCatalogCandidates(
  cards: readonly HomeCatalogPreviewCard[],
  failedImageIds: ReadonlySet<string> = new Set(),
): HomeCatalogPreviewCard[] {
  const seenIds = new Set<string>();
  const minimumRarity = getRarityWeight('Illustration Rare');

  return cards.filter((card) => {
    if (
      !card.id
      || seenIds.has(card.id)
      || failedImageIds.has(card.id)
      || !card.image
      || getRarityWeight(card.rarity) < minimumRarity
    ) return false;

    seenIds.add(card.id);
    return true;
  });
}

export function getInitialHomeCatalogSelection(
  cards: readonly HomeCatalogPreviewCard[],
): HomeCatalogPreviewCard[] {
  return getHomeCatalogCandidates(cards).slice(0, 3);
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function shuffleWithinRarityTiers(
  cards: readonly HomeCatalogPreviewCard[],
  random: () => number,
): HomeCatalogPreviewCard[] {
  const tiers = new Map<number, HomeCatalogPreviewCard[]>();
  for (const card of cards) {
    const weight = getRarityWeight(card.rarity);
    tiers.set(weight, [...(tiers.get(weight) ?? []), card]);
  }

  return [...tiers.entries()]
    .sort(([left], [right]) => right - left)
    .flatMap(([, tier]) => shuffle(tier, random));
}

export function getNextHomeCatalogSelection(
  cards: readonly HomeCatalogPreviewCard[],
  current: readonly HomeCatalogPreviewCard[],
  seenCardIds: ReadonlySet<string>,
  failedImageIds: ReadonlySet<string> = new Set(),
  random: () => number = Math.random,
): HomeCatalogPreviewCard[] {
  const candidates = getHomeCatalogCandidates(cards, failedImageIds);
  if (candidates.length <= 3) return candidates;

  const currentIds = new Set(current.map(({ id }) => id));
  const unseen = candidates.filter((card) => !seenCardIds.has(card.id) && !currentIds.has(card.id));
  const novelByRarity = shuffleWithinRarityTiers(unseen, random).slice(0, 3);
  if (novelByRarity.length === 3) return novelByRarity;

  const selectedIds = new Set(novelByRarity.map(({ id }) => id));
  const otherCandidates = candidates.filter((card) => !selectedIds.has(card.id));
  const notVisible = otherCandidates.filter((card) => !currentIds.has(card.id));
  const stillVisible = otherCandidates.filter((card) => currentIds.has(card.id));

  return [
    ...novelByRarity,
    ...shuffleWithinRarityTiers(notVisible, random),
    ...shuffleWithinRarityTiers(stillVisible, random),
  ].slice(0, 3);
}
