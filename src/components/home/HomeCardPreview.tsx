'use client';

import type { CSSProperties, PointerEvent } from 'react';
import type { TCGCard } from '@/types/tcg';
import { TCGCardImage } from '@/components/tcg/TCGCardImage';

interface HomeCardPreviewProps {
  card: TCGCard;
  rotationClass: string;
  sizes: string;
}

type HomeCardStyle = CSSProperties & {
  '--card-rotate-x': string;
  '--card-rotate-y': string;
};

const RESTING_STYLE: HomeCardStyle = {
  '--card-rotate-x': '0deg',
  '--card-rotate-y': '0deg',
  borderRadius: '4.55% / 3.5%',
};

function resetCardStyle(element: HTMLDivElement) {
  element.style.setProperty('--card-rotate-x', '0deg');
  element.style.setProperty('--card-rotate-y', '0deg');
  element.style.removeProperty('will-change');
}

function handleCardPointerMove(event: PointerEvent<HTMLDivElement>) {
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (event.pointerType === 'touch' || prefersReducedMotion) {
    return;
  }

  const element = event.currentTarget;
  const bounds = element.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) {
    return;
  }

  const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

  element.style.setProperty('--card-rotate-x', `${((0.5 - y) * 10).toFixed(2)}deg`);
  element.style.setProperty('--card-rotate-y', `${((x - 0.5) * 10).toFixed(2)}deg`);
  element.style.setProperty('will-change', 'transform');
}

export function HomeCardPreview({ card, rotationClass, sizes }: HomeCardPreviewProps) {
  return (
    <div
      aria-hidden="true"
      className={`home-card-preview group relative aspect-[2.15/3] min-w-0 shadow-[0_4px_10px_rgba(0,0,0,0.2)] [perspective:900px] ${rotationClass}`}
      data-testid="home-card-preview"
      onPointerCancel={(event) => resetCardStyle(event.currentTarget)}
      onPointerLeave={(event) => resetCardStyle(event.currentTarget)}
      onPointerMove={handleCardPointerMove}
      style={RESTING_STYLE}
    >
      <div
        className="relative h-full w-full overflow-hidden bg-black/10 transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          borderRadius: '4.55% / 3.5%',
          transform: 'perspective(900px) rotateX(var(--card-rotate-x)) rotateY(var(--card-rotate-y)) translateZ(0)',
        }}
      >
        <TCGCardImage card={card} alt="" sizes={sizes} className="object-contain" />
      </div>
    </div>
  );
}
