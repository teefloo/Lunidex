'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

interface TCGImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  candidates: string[];
  alt: string;
}

export function TCGImageWithFallback({ candidates, ...props }: TCGImageWithFallbackProps) {
  const candidatesKey = candidates.join('\u0000');
  const [fallbackState, setFallbackState] = useState({ candidatesKey, imageIndex: 0 });
  const imageIndex = fallbackState.candidatesKey === candidatesKey
    ? fallbackState.imageIndex
    : 0;
  const src = candidates[imageIndex] ?? candidates.at(-1);

  if (!src) return null;

  return (
    <Image
      {...props}
      src={src}
      alt={props.alt}
      onError={(event) => {
        props.onError?.(event);
        setFallbackState((current) => {
          const currentIndex = current.candidatesKey === candidatesKey
            ? current.imageIndex
            : 0;
          return {
            candidatesKey,
            imageIndex: Math.min(currentIndex + 1, candidates.length - 1),
          };
        });
      }}
    />
  );
}
