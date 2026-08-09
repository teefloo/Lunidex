'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { TCGCard } from '@/types/tcg';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';

interface TCGCardImageProps {
  card: TCGCard;
  alt?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export function TCGCardImage({ card, alt, fill = true, priority = false, sizes, className }: TCGCardImageProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCandidates = useMemo(() => getTCGCardImageCandidates(card), [card]);

  const src = imageCandidates[imageIndex] ?? imageCandidates.at(-1) ?? '/images/card-placeholder.svg';

  return (
    <Image
      src={src}
      alt={alt ?? card.name}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => {
        setImageIndex((prev) => Math.min(prev + 1, imageCandidates.length - 1));
      }}
    />
  );
}
