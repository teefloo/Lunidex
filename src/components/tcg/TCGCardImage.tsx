'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { TCGCard, TCGCardLanguage } from '@/types/tcg';
import { getTCGCard } from '@/lib/api/tcg';
import { TCG_CARD_PLACEHOLDER, getTCGCardImageCandidates, isOptimizableTcgImage } from '@/lib/tcg-images';

interface TCGCardImageProps {
  card: TCGCard;
  alt?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  language?: TCGCardLanguage;
}

export function TCGCardImage({ card, alt, fill = true, priority = false, sizes, className, language = 'en' }: TCGCardImageProps) {
  const imageSourceKey = `${card.id}\u0000${language}\u0000${card.image ?? ''}\u0000${card.imageUrl ?? ''}`;
  const [fallbackState, setFallbackState] = useState<{
    sourceKey: string;
    imageIndex: number;
    enrichedCard: TCGCard | null;
    enrichmentAttempted: boolean;
  }>({ sourceKey: imageSourceKey, imageIndex: 0, enrichedCard: null, enrichmentAttempted: false });
  const activeFallbackState = fallbackState.sourceKey === imageSourceKey
    ? fallbackState
    : { sourceKey: imageSourceKey, imageIndex: 0, enrichedCard: null, enrichmentAttempted: false };
  const imageIndex = activeFallbackState.imageIndex;
  const displayCard = useMemo(() => activeFallbackState.enrichedCard?.id === card.id
    ? {
        ...activeFallbackState.enrichedCard,
        image: card.image ?? activeFallbackState.enrichedCard.image,
        imageUrl: card.imageUrl ?? activeFallbackState.enrichedCard.imageUrl,
        set: card.set ?? activeFallbackState.enrichedCard.set,
      }
    : card, [activeFallbackState.enrichedCard, card]);
  const imageCandidates = useMemo(
    () => getTCGCardImageCandidates(displayCard, 'high', { language }),
    [displayCard, language],
  );

  const src = imageCandidates[imageIndex] ?? imageCandidates.at(-1) ?? TCG_CARD_PLACEHOLDER;
  const hasTcgPlayerFallback = imageCandidates.some((candidate) => candidate.startsWith('https://tcgplayer-cdn.tcgplayer.com/'));

  return (
    <Image
      src={src}
      alt={alt ?? card.name}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
      // TCGdex already serves card-sized CDN variants. Bypassing Vercel's
      // image proxy avoids quota failures while keeping fallback candidates;
      // non-CDN fallbacks (such as CardTrader) still use Next image resizing.
      unoptimized={isOptimizableTcgImage(src)}
      onError={() => {
        const nextIndex = Math.min(imageIndex + 1, imageCandidates.length - 1);
        const exhaustedTcgDexImages = nextIndex === imageCandidates.length - 1 && src !== TCG_CARD_PLACEHOLDER;
        if (exhaustedTcgDexImages && !hasTcgPlayerFallback && !activeFallbackState.enrichmentAttempted) {
          setFallbackState({ ...activeFallbackState, imageIndex: nextIndex, enrichmentAttempted: true });
          void getTCGCard(card.id, language, undefined, { allowEnglishFallback: true })
            .then((details) => {
              if (!details) return;
              const candidateCard = {
                ...details,
                image: card.image ?? details.image,
                imageUrl: card.imageUrl ?? details.imageUrl,
                set: card.set ?? details.set,
              };
              const detailCandidates = getTCGCardImageCandidates(candidateCard, 'high', { language });
              const hasAdditionalImage = detailCandidates.some((candidate) => (
                candidate !== TCG_CARD_PLACEHOLDER && !imageCandidates.includes(candidate)
              ));
              if (hasAdditionalImage) {
                setFallbackState((current) => current.sourceKey === imageSourceKey
                  ? { ...current, imageIndex: 0, enrichedCard: candidateCard }
                  : current);
              }
            })
            .catch(() => undefined);
          return;
        }
        setFallbackState({ ...activeFallbackState, imageIndex: nextIndex });
      }}
    />
  );
}
