import type { TCGCard } from '@/types/tcg';

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

export function getTCGCardImageCandidates(card: TCGCard): string[] {
  const setId = card.set?.id;
  const localId = card.localId || card.number;
  const pokemonTcgFallbacks = setId && localId
    ? [
        `https://images.pokemontcg.io/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}_hires.png`,
        `https://images.pokemontcg.io/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}.png`,
      ]
    : [];
  const candidates = [
    card.image ? appendFormat(card.image, 'high.webp') : null,
    card.image ? appendFormat(card.image, 'high.png') : null,
    card.image ? appendFormat(card.image, 'high.jpg') : null,
    card.image ?? null,
    card.imageUrl ?? null,
    ...pokemonTcgFallbacks,
    TCG_CARD_PLACEHOLDER,
  ];

  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}
