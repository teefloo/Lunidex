import {
  getTCGCardLocalizedCached,
  getTCGIllustratorCardsCached,
  getTCGIllustratorsCached,
} from '@/lib/api/server-cache';
import { TCG_CARD_LANGUAGES, type TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGCard } from '@/types/tcg';
import {
  getTCGIllustratorAliases,
  isTCGIllustratorCredit,
  mergeTCGIllustratorCards,
  normalizeTCGIllustratorIdentity,
  paginateTCGIllustratorCards,
} from './tcg-illustrators';

export interface TCGIllustratorGallery {
  artist: string;
  identity: string;
  language: TCGCardLanguage;
  cards: TCGCard[];
  total: number;
  page: number;
  pageCount: number;
  hasUnavailableDetails: boolean;
  isUnavailable: boolean;
}

export class TCGIllustratorAttributionMismatchError extends Error {
  constructor(cardId: string, expectedArtist: string, actualArtist: string) {
    super(`Card ${cardId} has illustrator attribution "${actualArtist}", expected "${expectedArtist}"`);
    this.name = 'TCGIllustratorAttributionMismatchError';
  }
}

export async function loadTCGIllustratorGallery(
  identityValue: string,
  language: TCGCardLanguage,
  page: number,
): Promise<TCGIllustratorGallery | null> {
  const identity = normalizeTCGIllustratorIdentity(identityValue);
  if (!identity || !Number.isInteger(page) || page < 1) return null;

  let selectedLanguageNames: string[];
  try {
    selectedLanguageNames = await getTCGIllustratorsCached(language);
  } catch {
    return unavailableGallery(identityValue.trim(), identity, language, page);
  }
  const selectedAliases = getTCGIllustratorAliases(selectedLanguageNames, identity);
  let knownNames: string[];
  if (selectedAliases.length > 0) {
    knownNames = selectedAliases;
  } else {
    try {
      knownNames = await findIllustratorInOtherLanguages(identity, language);
    } catch {
      return unavailableGallery(identityValue.trim(), identity, language, page);
    }
  }

  if (knownNames.length === 0) return null;
  const artist = knownNames[0]?.trim() ?? identityValue.trim();

  if (selectedAliases.length === 0) {
    return {
      artist,
      identity,
      language,
      cards: [],
      total: 0,
      page,
      pageCount: 0,
      hasUnavailableDetails: false,
      isUnavailable: false,
    };
  }

  let lists: TCGCard[][];
  try {
    lists = await Promise.all(selectedAliases.map((alias) => getTCGIllustratorCardsCached(alias, language)));
  } catch {
    return unavailableGallery(artist, identity, language, page);
  }
  const allCards = mergeTCGIllustratorCards(lists).map((summary) => {
    if (summary.illustrator
      && normalizeTCGIllustratorIdentity(summary.illustrator) !== identity) {
      throw new TCGIllustratorAttributionMismatchError(summary.id, artist, summary.illustrator);
    }
    return { ...summary, illustrator: summary.illustrator ?? artist };
  });
  const paged = paginateTCGIllustratorCards(allCards, page);
  let hasUnavailableDetails = false;
  const cards = await mapWithConcurrency(paged.cards, 8, async (summary) => {
    let detail: TCGCard | null;
    try {
      detail = await getTCGCardLocalizedCached(summary.id, language);
    } catch {
      hasUnavailableDetails = true;
      return summary;
    }

    if (!detail) {
      hasUnavailableDetails = true;
      return summary;
    }

    if (isTCGIllustratorCredit(detail.illustrator)
      && normalizeTCGIllustratorIdentity(detail.illustrator) !== identity) {
      throw new TCGIllustratorAttributionMismatchError(summary.id, artist, detail.illustrator);
    }

    return {
      ...detail,
      illustrator: isTCGIllustratorCredit(detail.illustrator) ? detail.illustrator : summary.illustrator,
    };
  });

  return {
    artist,
    identity,
    language,
    cards,
    total: paged.total,
    page,
    pageCount: paged.pageCount,
    hasUnavailableDetails,
    isUnavailable: false,
  };
}

function unavailableGallery(
  artist: string,
  identity: string,
  language: TCGCardLanguage,
  page: number,
): TCGIllustratorGallery {
  return {
    artist,
    identity,
    language,
    cards: [],
    total: 0,
    page,
    pageCount: 0,
    hasUnavailableDetails: false,
    isUnavailable: true,
  };
}

async function findIllustratorInOtherLanguages(
  identity: string,
  selectedLanguage: TCGCardLanguage,
): Promise<string[]> {
  const otherLanguages = TCG_CARD_LANGUAGES.filter((language) => language !== selectedLanguage);
  const languageNames = await mapWithConcurrency(otherLanguages, 4, (language) => getTCGIllustratorsCached(language));
  return getTCGIllustratorAliases(languageNames.flat(), identity);
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await mapper(item, index);
    }
  }));
  return results;
}
