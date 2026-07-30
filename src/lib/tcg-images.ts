import type { TCGCard, TCGSet } from '@/types/tcg';

interface TCGImageCard {
  id: string;
  localId?: string;
  number?: string;
  image?: string;
  imageUrl?: string;
  set?: Pick<TCGSet, 'id'>;
}

const TCG_CARD_PLACEHOLDER = '/images/card-placeholder.svg';

const OPTIMIZABLE_TCG_HOSTS = new Set([
  'assets.tcgdex.net',
  'images.tcgdex.net',
  'images.pokemontcg.io',
]);

export function isOptimizableTcgImage(src: string): boolean {
  if (src.startsWith('/')) return true;
  if (/\.gif(?:$|\?)/i.test(src)) return false;
  try {
    return OPTIMIZABLE_TCG_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

function appendFormat(base: string, ext: string): string {
  const stripped = base.replace(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i, '');
  return `${stripped}/${ext}`;
}

function replaceFormat(base: string, ext: 'webp' | 'png' | 'jpg'): string {
  const stripped = base.replace(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i, '');
  return `${stripped}.${ext}`;
}

function isTcgDexAsset(base: string): boolean {
  try {
    const hostname = new URL(base).hostname;
    return hostname === 'assets.tcgdex.net' || hostname === 'images.tcgdex.net';
  } catch {
    return false;
  }
}

function getEnglishTcgDexVariant(base: string): string | undefined {
  try {
    const url = new URL(base);
    if (url.hostname !== 'assets.tcgdex.net' && url.hostname !== 'images.tcgdex.net') return undefined;

    const segments = url.pathname.split('/');
    const languageIndex = 1;
    const language = segments[languageIndex];
    if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(language) || language === 'en') return undefined;

    segments[languageIndex] = 'en';
    url.pathname = segments.join('/');
    return url.toString();
  } catch {
    return undefined;
  }
}

function addTcgDexLanguageVariants(base: string | undefined | null): string[] {
  if (!base) return [];
  const englishVariant = getEnglishTcgDexVariant(base);
  // Keep the language returned by the API first. English is only a fallback
  // after the browser reports that the localized asset failed to load.
  return englishVariant ? [base, englishVariant] : [base];
}

/**
 * Build a TCGdex image URL at the requested quality/format from a base image url
 * (with or without an extension). Returns undefined when no base is provided.
 */
export function buildTcgImageUrl(
  base: string | undefined | null,
  quality: 'low' | 'high' = 'low',
  ext: 'webp' | 'png' = 'webp',
): string | undefined {
  if (!base) return undefined;
  return appendFormat(base, `${quality}.${ext}`);
}

/**
 * Best PNG image URL for a card. satori (next/og) cannot decode WebP, and the
 * raw `imageUrl` from the API lacks the required quality suffix, so OG images
 * must use the `/high.png` variant built from `card.image`.
 */
export function getTCGCardPngImage(card: TCGCard): string | undefined {
  if (card.image) return appendFormat(card.image, 'high.png');
  return card.imageUrl ?? undefined;
}

export function getTCGCardImageCandidates(
  card: TCGImageCard,
  quality: 'low' | 'high' = 'high',
): string[] {
  const setId = card.set?.id;
  const localId = card.localId || card.number;
  const pokemonTcgFallbacks = setId && localId
    ? [
        `https://images.pokemontcg.io/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}_hires.png`,
        `https://images.pokemontcg.io/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}.png`,
      ]
    : [];
  const cardBaseGroups = [card.image, card.imageUrl]
    .map(addTcgDexLanguageVariants)
    .filter((group) => group.length > 0);
  const cardBases = cardBaseGroups.flat();
  const hasTcgDexSource = cardBases.some(isTcgDexAsset);
  const candidates = [
    ...cardBaseGroups.flatMap((group) => (
      group.some(isTcgDexAsset)
        ? (['webp', 'png', 'jpg'] as const).flatMap((ext) =>
            group.map((base) => appendFormat(base, `${quality}.${ext}`)),
          )
        : group
    )),
    ...(hasTcgDexSource ? [] : pokemonTcgFallbacks),
    TCG_CARD_PLACEHOLDER,
  ];

  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

/** Return resilient logo/symbol candidates, including the English TCGdex asset. */
export function getTCGSetImageCandidates(
  set: TCGSet,
  kind: 'logo' | 'symbol' = 'logo',
): string[] {
  const bases = addTcgDexLanguageVariants(kind === 'logo' ? set.logo : set.symbol);
  const candidates = isTcgDexAsset(bases[0] ?? '')
    ? (['png', 'webp', 'jpg'] as const).flatMap((ext) =>
        bases.map((base) => replaceFormat(base, ext)),
      )
    : bases;

  return [...new Set(candidates)];
}
