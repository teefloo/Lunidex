import type { EditorialSource } from '@/lib/tcg-release-calendar';

export interface PurchaseSafetyTopicV1 {
  id: 'seller' | 'listing' | 'payment' | 'authenticity';
  source: EditorialSource;
}

/** French-first source registry; localized guidance lives in i18n bundles. */
export const PURCHASE_SAFETY_V1 = {
  version: 1,
  market: 'FR',
  reviewedAt: '2026-09-29',
  topics: [
    {
      id: 'seller',
      source: {
        publisher: 'DGCCRF',
        url: 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/comment-realiser-des-achats-sur-internet-de-facon-securisee',
        verifiedAt: '2026-09-29',
      },
    },
    {
      id: 'listing',
      source: {
        publisher: 'DGCCRF',
        url: 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/comment-realiser-des-achats-sur-internet-de-facon-securisee',
        verifiedAt: '2026-09-29',
      },
    },
    {
      id: 'payment',
      source: {
        publisher: 'DGCCRF',
        url: 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/comment-realiser-des-achats-sur-internet-de-facon-securisee',
        verifiedAt: '2026-09-29',
      },
    },
    {
      id: 'authenticity',
      source: {
        publisher: 'The Pokémon Company',
        url: 'https://support.pokemon.com/hc/fr/articles/360002068953-Est-ce-que-j-ai-achet%C3%A9-des-cartes-contrefaites',
        verifiedAt: '2026-09-29',
      },
    },
  ] satisfies readonly PurchaseSafetyTopicV1[],
  report: {
    publisher: 'SignalConso',
    url: 'https://signal.conso.gouv.fr/fr/achat-site',
    verifiedAt: '2026-09-29',
  } satisfies EditorialSource,
} as const;
