'use client';

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Image from 'next/image';
import type { TCGCard } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getTCGHoloData } from '@/lib/tcg-holo';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';

interface TCGHolographicCardProps {
  card: TCGCard;
  className?: string;
  imageClassName?: string;
  onClick?: (card: TCGCard) => void;
  priority?: boolean;
  sizes?: string;
  noFrame?: boolean;
}

type HoloStyle = CSSProperties & Record<`--${string}`, string | number>;

export const TCGHolographicCard = memo(function TCGHolographicCard({
  card,
  className,
  imageClassName,
  onClick,
  priority = false,
  sizes = '(min-width: 1280px) 260px, (min-width: 768px) 30vw, 45vw',
  noFrame = false,
}: TCGHolographicCardProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingVarsRef = useRef<Record<string, string> | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const holoData = useMemo(() => getTCGHoloData(card), [card]);
  const staticStyle = useMemo(() => getInitialHoloStyle(card.id), [card.id]);
  const imageCandidates = useMemo(() => getTCGCardImageCandidates(card), [card]);
  const setId = card.set?.id ?? card.id.split('-')[0] ?? '';
  const cardNumber = card.localId ?? card.number ?? '';

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (document.querySelector('link[href="/pokemon-cards/css/all-cards.css"]')) return;

    void import('../../styles/pokemon-cards-css.css');
    void import('../../styles/tcg-card-overrides.css');
  }, []);

  const flushVars = () => {
    const element = cardRef.current;
    const vars = pendingVarsRef.current;

    if (element && vars) {
      for (const [key, value] of Object.entries(vars)) {
        element.style.setProperty(key, value);
      }
    }

    pendingVarsRef.current = null;
    animationFrameRef.current = null;
  };

  const scheduleVars = (vars: Record<string, string>) => {
    pendingVarsRef.current = vars;

    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(flushVars);
    }
  };

  const resetCard = () => {
    setInteracting(false);
    scheduleVars({
      '--pointer-x': '50%',
      '--pointer-y': '50%',
      '--pointer-from-center': '0',
      '--pointer-from-top': '0.5',
      '--pointer-from-left': '0.5',
      '--card-opacity': '0',
      '--rotate-x': '0deg',
      '--rotate-y': '0deg',
      '--background-x': '50%',
      '--background-y': '50%',
      '--card-scale': '1',
      '--translate-x': '0px',
      '--translate-y': '0px',
    });
  };

  const applyPointerPosition = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    setInteracting(true);

    const percentX = clamp(Math.round((100 / rect.width) * (event.clientX - rect.left)));
    const percentY = clamp(Math.round((100 / rect.height) * (event.clientY - rect.top)));
    const centerX = percentX - 50;
    const centerY = percentY - 50;
    const distanceFromCenter = clamp(
      Math.sqrt(centerX * centerX + centerY * centerY) / 50,
      0,
      1,
    );

    scheduleVars({
      '--pointer-x': `${percentX}%`,
      '--pointer-y': `${percentY}%`,
      '--pointer-from-center': distanceFromCenter.toFixed(3),
      '--pointer-from-top': (percentY / 100).toFixed(3),
      '--pointer-from-left': (percentX / 100).toFixed(3),
      '--card-opacity': '1',
      '--rotate-x': `${Math.round(-(centerX / 3.5))}deg`,
      '--rotate-y': `${Math.round(centerY / 3.5)}deg`,
      '--background-x': `${adjust(percentX, 0, 100, 37, 63)}%`,
      '--background-y': `${adjust(percentY, 0, 100, 33, 67)}%`,
      '--card-scale': '1',
      '--translate-x': '0px',
      '--translate-y': '0px',
    });
  };

  const applyFocusPosition = () => {
    setInteracting(true);
    scheduleVars({
      '--pointer-x': '25%',
      '--pointer-y': '10%',
      '--pointer-from-center': '0.9',
      '--pointer-from-top': '0.11',
      '--pointer-from-left': '0.25',
      '--card-opacity': '1',
      '--rotate-x': '7deg',
      '--rotate-y': '-19deg',
      '--background-x': '44%',
      '--background-y': '36%',
      '--card-scale': '1',
      '--translate-x': '0px',
      '--translate-y': '0px',
    });
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        'card interactive pokemon-holo-card',
        holoData.typeClasses,
        interacting && 'active interacting',
        noFrame && 'card--no-frame',
        className,
      )}
      data-number={String(cardNumber).toLowerCase()}
      data-set={setId.toLowerCase()}
      data-subtypes={holoData.subtypes}
      data-supertype={holoData.supertype}
      data-rarity={holoData.rarity}
      data-art-window={holoData.artWindow}
      data-trainer-gallery={holoData.isTrainerGallery ? 'true' : 'false'}
      data-holo-effect={holoData.hasHoloEffect ? 'true' : 'false'}
      style={staticStyle}
    >
      <div className="card__translater">
        <button
          type="button"
          className="card__rotator"
          onClick={() => onClick?.(card)}
          onPointerEnter={applyPointerPosition}
          onPointerMove={applyPointerPosition}
          onPointerDown={applyPointerPosition}
          onPointerUp={(event) => {
            if (event.pointerType !== 'mouse') resetCard();
          }}
          onPointerCancel={resetCard}
          onPointerLeave={resetCard}
          onFocus={applyFocusPosition}
          onBlur={resetCard}
          aria-label={t('tcg.open_card_detail', { name: card.name })}
        >
          <div className="card__front">
            <Image
              src={imageCandidates[imageIndex] ?? imageCandidates.at(-1) ?? '/images/card-placeholder.svg'}
              alt={card.name}
              width={660}
              height={921}
              sizes={sizes}
              priority={priority}
              // TCG CDNs are already optimized and Vercel's image proxy can
              // reject these remote assets (402), leaving every card on the
              // desktop grid as a placeholder. Load the authorized CDN URL
              // directly instead.
              unoptimized
              className={cn('card__image', imageClassName)}
              onError={() => {
                setImageIndex((current) => {
                  if (current >= imageCandidates.length - 1) return current;
                  return current + 1;
                });
              }}
            />
            <div className="card__shine" aria-hidden="true" />
            <div className="card__glare" aria-hidden="true" />
          </div>
        </button>
      </div>
    </div>
  );
});

function getInitialHoloStyle(id: string): HoloStyle {
  const seedX = hashToUnit(`${id}:x`);
  const seedY = hashToUnit(`${id}:y`);

  return {
    '--pointer-x': '50%',
    '--pointer-y': '50%',
    '--pointer-from-center': '0',
    '--pointer-from-top': '0.5',
    '--pointer-from-left': '0.5',
    '--card-opacity': '0',
    '--rotate-x': '0deg',
    '--rotate-y': '0deg',
    '--background-x': '50%',
    '--background-y': '50%',
    '--card-scale': '1',
    '--translate-x': '0px',
    '--translate-y': '0px',
    '--seedx': seedX.toFixed(4),
    '--seedy': seedY.toFixed(4),
    '--cosmosbg': `${Math.floor(seedX * 734)}px ${Math.floor(seedY * 1280)}px`,
  };
}

function hashToUnit(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

function adjust(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const next = ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin;
  return Math.round(clamp(next, toMin, toMax));
}

export type { TCGHolographicCardProps };
