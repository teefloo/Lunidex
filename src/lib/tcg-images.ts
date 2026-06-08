import type { TCGCard } from '@/types/tcg';

const TCG_CARD_PLACEHOLDER = '/images/card-placeholder.svg';

function appendFormat(base: string, ext: string): string {
  const stripped = base.replace(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i, '');
  return `${stripped}/${ext}`;
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

