import type { TCGCard } from '@/types/tcg';

const TCG_CARD_PLACEHOLDER = '/images/card-placeholder.svg';

export function getTCGCardImageCandidates(card: TCGCard): string[] {
  const candidates = [
    card.image ? `${card.image}/high.webp` : null,
    card.image ? `${card.image}/high.png` : null,
    card.image ? `${card.image}/high.jpg` : null,
    card.image ?? null,
    card.imageUrl ?? null,
    TCG_CARD_PLACEHOLDER,
  ];

  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

