import { cache } from 'react';

import {
  getAllSetsCached,
  getTCGSetCardsCached,
} from '@/lib/api/server-cache';
import {
  getAnniversary30Manifest,
  getAnniversary30ManifestDataQuality,
  mergeAnniversary30Cards,
} from '@/lib/anniversary-30-cards';
import {
  ANNIVERSARY_30_FALLBACK_SET_ID,
  type Anniversary30Card,
  type Anniversary30Language,
} from '@/lib/anniversary-30';
import { decodeTCGCollectionKey, encodeTCGCollectionKey } from '@/lib/tcg-collections';
import { isIndexableTCGSetCardList } from '@/lib/tcg-seo';
import type { TCGCard, TCGSet } from '@/types/tcg';

export type Anniversary30ProviderStatus = 'complete' | 'partial' | 'unavailable';

export interface Anniversary30PageData {
  setId: string;
  providerSet?: TCGSet;
  cards: readonly Anniversary30Card[];
  numberedMain: readonly Anniversary30Card[];
  secretRares: readonly Anniversary30Card[];
  pikachu: readonly Anniversary30Card[];
  classicCollection: readonly Anniversary30Card[];
  basicEnergy: readonly Anniversary30Card[];
  promos: readonly Anniversary30Card[];
  providerStatus: Anniversary30ProviderStatus;
  dataQuality: ReturnType<typeof getAnniversary30ManifestDataQuality>;
  unavailableImageCount: number;
}

function normalizeSetName(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function normalizeSetId(value: string): string {
  const key = encodeTCGCollectionKey('en', value);
  return decodeTCGCollectionKey(key)?.setId ?? ANNIVERSARY_30_FALLBACK_SET_ID;
}

function isValidProviderCardId(value: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i.test(value);
}

/**
 * Rekey the static records to the exact set identity used by the generic TCG
 * collection. Invalid provider set identifiers fall back to the validated
 * static id rather than being interpolated into a collection/card URL.
 */
export function rekeyAnniversary30Cards(
  cards: readonly Anniversary30Card[],
  collectionSetId: string,
): Anniversary30Card[] {
  const safeSetId = normalizeSetId(collectionSetId);

  return cards.map((card) => ({
    ...card,
    id: `${safeSetId}-${card.localId.trim().toLowerCase()}`,
    ...(card.lunidexCardId && isValidProviderCardId(card.lunidexCardId)
      ? { lunidexCardId: card.lunidexCardId.trim() }
      : { lunidexCardId: undefined }),
  }));
}

function getProviderStatus(
  providerSet: TCGSet | undefined,
  providerCards: readonly TCGCard[],
  cards: readonly Anniversary30Card[],
): Anniversary30ProviderStatus {
  if (!providerSet || providerCards.length === 0) return 'unavailable';

  const requiredCards = cards.filter(
    (card) => card.scope === 'numbered-main' || card.scope === 'pikachu' || card.scope === 'secret-rare',
  );
  const hasEveryProviderIdentity = requiredCards.length === 158
    && requiredCards.every((card) => Boolean(card.lunidexCardId));

  return hasEveryProviderIdentity && isIndexableTCGSetCardList(providerSet, [...providerCards])
    ? 'complete'
    : 'partial';
}

function buildAnniversary30PageData(
  cards: readonly Anniversary30Card[],
  providerSet: TCGSet | undefined,
  providerCards: readonly TCGCard[],
): Anniversary30PageData {
  const dataset = getAnniversary30Manifest(cards);
  const providerStatus = getProviderStatus(providerSet, providerCards, cards);

  return {
    setId: normalizeSetId(providerSet?.id ?? ANNIVERSARY_30_FALLBACK_SET_ID),
    ...(providerSet ? { providerSet } : {}),
    ...dataset,
    providerStatus,
    dataQuality: getAnniversary30ManifestDataQuality(cards, [...providerCards]),
    unavailableImageCount: cards.filter((card) => card.imageStatus !== 'available').length,
  };
}

/** Build the one serialized server model consumed by the page and client leaves. */
export const getAnniversary30PageData = cache(async (
  _language: Anniversary30Language,
): Promise<Anniversary30PageData> => {
  // The provider catalogue is fetched in English so the stable card identity
  // can be shared by the English and French page renders.
  void _language;
  const manifest = getAnniversary30Manifest();
  let providerSet: TCGSet | undefined;
  let providerCards: TCGCard[] = [];

  try {
    const sets = await getAllSetsCached('en');
    providerSet = sets.find((set) => normalizeSetName(set.name) === '30th celebration');
    if (providerSet) {
      providerCards = await getTCGSetCardsCached(providerSet.id, 'en').catch(() => []);
    }
  } catch {
    providerSet = undefined;
    providerCards = [];
  }

  const mergedCards = mergeAnniversary30Cards(manifest.cards, providerCards);
  const collectionSetId = providerSet?.id ?? ANNIVERSARY_30_FALLBACK_SET_ID;
  const cards = rekeyAnniversary30Cards(mergedCards, collectionSetId);
  return buildAnniversary30PageData(cards, providerSet, providerCards);
});

export { buildAnniversary30PageData };
