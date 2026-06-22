import type { TCGCard } from '@/types/tcg';

const TCG_CARD_PLACEHOLDER = '/images/card-placeholder.svg';

function appendFormat(base: string, ext: string): string {
  const stripped = base.replace(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i, '');
  return `${stripped}/${ext}`;
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
  const candidates = [
    card.image ? appendFormat(card.image, 'high.webp') : null,
    card.image ? appendFormat(card.image, 'high.png') : null,
    card.image ? appendFormat(card.image, 'high.jpg') : null,
    card.image ?? null,
    card.imageUrl ?? null,
    TCG_CARD_PLACEHOLDER,
  ];

  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

