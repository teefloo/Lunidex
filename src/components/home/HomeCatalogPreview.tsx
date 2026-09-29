'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TCG_CARD_PLACEHOLDER, getTCGCardImageCandidates } from '@/lib/tcg-images';
import { useTranslation } from '@/lib/i18n';
import { localeHref } from '@/lib/seo';
import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import {
  getHomeCatalogCandidates,
  getInitialHomeCatalogSelection,
  getNextHomeCatalogSelection,
  type HomeCatalogPreviewCard,
} from '@/lib/home-catalog-preview';
import type { SupportedLanguage } from '@/lib/languages';

interface HomeCatalogPreviewProps {
  cards: readonly HomeCatalogPreviewCard[];
  language: SupportedLanguage;
}

interface CatalogCardImageProps {
  card: HomeCatalogPreviewCard;
  preload: boolean;
  onLoad: (cardId: string) => void;
  onError: (cardId: string) => void;
}

const SLOT_COUNT = 3;
const ROTATION_INTERVAL_MS = 60_000;
const IMAGE_TIMEOUT_MS = 8_000;
const RARITY_TRANSLATION_KEYS: Record<string, string> = {
  hyperrare: 'lunidex_home.rarity_hyperrare',
  secretrare: 'lunidex_home.rarity_secretrare',
  specialillustrationrare: 'lunidex_home.rarity_specialillustrationrare',
  illustrationrare: 'lunidex_home.rarity_illustrationrare',
};

function getRarityLabel(card: HomeCatalogPreviewCard, t: ReturnType<typeof useTranslation>['t']): string {
  const rawLabel = card.rarity ?? '';
  const translationKey = RARITY_TRANSLATION_KEYS[getCanonicalTcgRarity(rawLabel)];
  return translationKey ? t(translationKey, { defaultValue: rawLabel }) : rawLabel;
}

function CatalogCardImage({ card, preload, onLoad, onError }: CatalogCardImageProps) {
  const imageCandidates = getTCGCardImageCandidates(card);
  const [imageIndex, setImageIndex] = useState(0);
  const source = imageCandidates[imageIndex] ?? TCG_CARD_PLACEHOLDER;
  const isPlaceholder = source === TCG_CARD_PLACEHOLDER;

  return (
    <Image
      key={card.id}
      src={source}
      alt={card.name}
      fill
      sizes="(max-width: 767px) 27vw, (max-width: 1023px) 20vw, 12rem"
      className="object-contain"
      unoptimized
      preload={preload || undefined}
      loading={preload ? undefined : 'eager'}
      onLoad={() => {
        if (!isPlaceholder) onLoad(card.id);
      }}
      onError={() => {
        if (isPlaceholder) return;
        onError(card.id);
        setImageIndex((current) => Math.min(current + 1, imageCandidates.length - 1));
      }}
    />
  );
}

function getCardSlots(cards: readonly HomeCatalogPreviewCard[]): (HomeCatalogPreviewCard | null)[] {
  return Array.from({ length: SLOT_COUNT }, (_, index) => cards[index] ?? null);
}

export default function HomeCatalogPreview({ cards, language }: HomeCatalogPreviewProps) {
  const { t } = useTranslation();
  const [initialSelection] = useState(() => getInitialHomeCatalogSelection(cards));
  const [visibleCards, setVisibleCards] = useState(initialSelection);
  const visibleCardsRef = useRef<HomeCatalogPreviewCard[]>(initialSelection);
  const seenCardIdsRef = useRef(new Set(initialSelection.map(({ id }) => id)));
  const failedImageIdsRef = useRef(new Set<string>());
  const retryCountRef = useRef(0);
  const loadedPendingCardIdsRef = useRef(new Set<string>());
  const [pendingCards, setPendingCards] = useState<HomeCatalogPreviewCard[] | null>(null);
  const [loadedPendingCardIds, setLoadedPendingCardIds] = useState<ReadonlySet<string>>(new Set());
  const [isEntering, setIsEntering] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [interactionPaused, setInteractionPaused] = useState(false);

  const cancelPreparedSelection = useCallback(() => {
    retryCountRef.current = 0;
    loadedPendingCardIdsRef.current = new Set();
    setLoadedPendingCardIds(new Set());
    setPendingCards(null);
    setIsEntering(false);
  }, []);

  const prepareNextSelection = useCallback(() => {
    if (!documentVisible || interactionPaused) return;
    if (retryCountRef.current >= cards.length) {
      setPendingCards(null);
      setLoadedPendingCardIds(new Set());
      setIsEntering(false);
      return;
    }

    const nextSelection = getNextHomeCatalogSelection(
      cards,
      visibleCardsRef.current,
      seenCardIdsRef.current,
      failedImageIdsRef.current,
    );
    const currentIds = new Set(visibleCardsRef.current.map(({ id }) => id));
    if (
      (nextSelection.length === SLOT_COUNT && nextSelection.every(({ id }) => currentIds.has(id)))
    ) return;

    retryCountRef.current += 1;
    loadedPendingCardIdsRef.current = new Set();
    setLoadedPendingCardIds(new Set());
    setIsEntering(false);
    setPendingCards(nextSelection);
  }, [cards, documentVisible, interactionPaused]);

  const handleImageLoad = useCallback((cardId: string) => {
    if (!pendingCards?.some((card) => card.id === cardId)) return;

    const nextLoadedIds = new Set(loadedPendingCardIdsRef.current);
    nextLoadedIds.add(cardId);
    loadedPendingCardIdsRef.current = nextLoadedIds;
    setLoadedPendingCardIds(nextLoadedIds);
  }, [pendingCards]);

  const handleImageError = useCallback((cardId: string) => {
    if (failedImageIdsRef.current.has(cardId)) return;

    failedImageIdsRef.current = new Set([...failedImageIdsRef.current, cardId]);
    setPendingCards(null);
    loadedPendingCardIdsRef.current = new Set();
    setLoadedPendingCardIds(new Set());
    setIsEntering(false);
    if (documentVisible && !interactionPaused) prepareNextSelection();
  }, [documentVisible, interactionPaused, prepareNextSelection]);

  const commitPendingSelection = useCallback((nextSelection: HomeCatalogPreviewCard[]) => {
    visibleCardsRef.current = nextSelection;
    setVisibleCards(nextSelection);

    const eligibleIds = getHomeCatalogCandidates(cards, failedImageIdsRef.current).map(({ id }) => id);
    const seenCardIds = new Set([...seenCardIdsRef.current, ...nextSelection.map(({ id }) => id)]);
    seenCardIdsRef.current = seenCardIds.size >= eligibleIds.length
      ? new Set(nextSelection.map(({ id }) => id))
      : seenCardIds;

    retryCountRef.current = 0;
    loadedPendingCardIdsRef.current = new Set();
    setLoadedPendingCardIds(new Set());
    setPendingCards(null);
    setIsEntering(false);
  }, [cards]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncMotionPreference();
    mediaQuery.addEventListener('change', syncMotionPreference);
    return () => mediaQuery.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    const syncDocumentVisibility = () => {
      const isVisible = document.visibilityState !== 'hidden';
      setDocumentVisible(isVisible);
      if (!isVisible) cancelPreparedSelection();
    };
    syncDocumentVisibility();
    document.addEventListener('visibilitychange', syncDocumentVisibility);
    return () => document.removeEventListener('visibilitychange', syncDocumentVisibility);
  }, [cancelPreparedSelection]);

  useEffect(() => {
    if (!pendingCards || pendingCards.some(({ id }) => !loadedPendingCardIds.has(id))) return;
    if (!documentVisible || interactionPaused) return;
    const animationFrame = window.requestAnimationFrame(() => {
      if (prefersReducedMotion) commitPendingSelection(pendingCards);
      else setIsEntering(true);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [commitPendingSelection, documentVisible, interactionPaused, isEntering, loadedPendingCardIds, pendingCards, prefersReducedMotion]);

  useEffect(() => {
    if (!pendingCards || isEntering || !documentVisible || interactionPaused) return;

    const timeout = window.setTimeout(() => {
      const unresponsiveIds = pendingCards
        .filter(({ id }) => !loadedPendingCardIdsRef.current.has(id))
        .map(({ id }) => id);

      if (unresponsiveIds.length === 0) return;
      failedImageIdsRef.current = new Set([...failedImageIdsRef.current, ...unresponsiveIds]);
      loadedPendingCardIdsRef.current = new Set();
      setLoadedPendingCardIds(new Set());
      setPendingCards(null);
      setIsEntering(false);
      prepareNextSelection();
    }, IMAGE_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [documentVisible, interactionPaused, isEntering, pendingCards, prepareNextSelection]);

  useEffect(() => {
    if (
      !documentVisible
      || interactionPaused
      || pendingCards
      || cards.length <= SLOT_COUNT
      || visibleCards.length !== SLOT_COUNT
    ) return;

    const timeout = window.setTimeout(prepareNextSelection, ROTATION_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [cards.length, documentVisible, interactionPaused, pendingCards, prepareNextSelection, visibleCards]);

  const visibleSlots = getCardSlots(visibleCards);
  const pendingSlots = pendingCards ? getCardSlots(pendingCards) : null;
  const visiblePreloadIds = new Set(initialSelection.slice(0, SLOT_COUNT).map(({ id }) => id));

  function renderCards(
    slots: readonly (HomeCatalogPreviewCard | null)[],
    keyPrefix: 'visible' | 'pending',
    isLayerAccessible: boolean,
  ) {
    return slots.map((card, index) => (
      <li key={card?.id ?? `${keyPrefix}-empty-${index}`}>
        {card ? (
          <Link
            href={localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`, language)}
            aria-label={`${card.name}, ${getRarityLabel(card, t)}, ${card.set.name}, ${card.localId} — ${t('lunidex_home.open_card')}`}
            className="home-catalog-preview-card"
            tabIndex={isLayerAccessible ? undefined : -1}
          >
            <span className="home-catalog-preview-image">
              <CatalogCardImage
                card={card}
                preload={keyPrefix === 'visible' && visiblePreloadIds.has(card.id)}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </span>
            <span className="home-catalog-preview-card-name">{card.name}</span>
            <span className="home-catalog-preview-card-number">{card.localId}</span>
            <span className="home-catalog-preview-card-rarity">{getRarityLabel(card, t)}</span>
            <span className="home-catalog-preview-card-set">{card.set.name}</span>
          </Link>
        ) : (
          <div className="home-catalog-preview-card home-catalog-preview-card--empty" aria-hidden="true">
            <span className="home-catalog-preview-image home-catalog-preview-image--empty" />
            <span className="home-catalog-preview-empty-line" />
            <span className="home-catalog-preview-empty-line home-catalog-preview-empty-line--short" />
            <span className="home-catalog-preview-empty-line home-catalog-preview-empty-line--short" />
            <span className="home-catalog-preview-empty-line" />
          </div>
        )}
      </li>
    ));
  }

  return (
    <section
      className="home-catalog-preview"
      aria-labelledby="home-catalog-preview-title"
      onFocusCapture={() => {
        setInteractionPaused(true);
        cancelPreparedSelection();
      }}
      onBlurCapture={(event) => {
        const focusLeftSection = !event.currentTarget.contains(event.relatedTarget as Node | null);
        if (focusLeftSection && !event.currentTarget.matches(':hover')) setInteractionPaused(false);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          setInteractionPaused(true);
          cancelPreparedSelection();
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) {
          setInteractionPaused(false);
        }
      }}
    >
      <div className="home-catalog-preview-heading">
        <div>
          <p className="home-section-kicker">{t('lunidex_home.featured_cards_eyebrow')}</p>
          <h2 id="home-catalog-preview-title">{t('lunidex_home.featured_cards_title')}</h2>
        </div>
        <Link href={localeHref('/tcg', language)} className="home-catalog-preview-link">
          {t('lunidex_home.cta_explore_cards')}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="home-catalog-preview-deck">
        <ul
          className={`home-catalog-preview-cards home-catalog-preview-layer${pendingCards && isEntering ? ' home-catalog-preview-layer--leaving' : ''}`}
          aria-hidden={Boolean(pendingCards && isEntering)}
          inert={Boolean(pendingCards && isEntering) || undefined}
        >
          {renderCards(visibleSlots, 'visible', !pendingCards || !isEntering)}
        </ul>

        {pendingSlots ? (
          <ul
            className={`home-catalog-preview-cards home-catalog-preview-layer home-catalog-preview-layer--pending${isEntering ? ' home-catalog-preview-layer--entering' : ''}`}
            aria-hidden="true"
            inert
            onTransitionEnd={(event) => {
              if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;
              if (pendingCards) commitPendingSelection(pendingCards);
            }}
          >
            {renderCards(pendingSlots, 'pending', false)}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
