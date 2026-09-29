import type { SealedReleaseV1 } from '@/lib/tcg-release-calendar';

/**
 * French-market editorial snapshot, version 1. Review each source and status
 * before updating; a date is never inferred from a marketplace listing.
 */
export const SEALED_RELEASES_V1 = [
  {
    id: 'pokemon-30th-anniversary-expansion',
    titleFr: '30ᵉ Anniversaire',
    kind: 'expansion',
    market: 'FR',
    window: { precision: 'day', date: '2026-09-16' },
    status: 'released',
    source: {
      publisher: 'The Pokémon Company',
      url: 'https://www.pokemon.com/fr/actualites/decouvrez-des-pokemon-legendaires-et-bien-plus-encore-dans-lextension-30-anniversaire-du-jcc-pokemon',
      verifiedAt: '2026-09-29',
    },
  },
  {
    id: 'mega-evolution-regne-delta',
    titleFr: 'Méga-Évolution – Règne Delta',
    kind: 'expansion',
    market: 'FR',
    window: { precision: 'day', date: '2026-11-06' },
    status: 'announced',
    source: {
      publisher: 'The Pokémon Company',
      url: 'https://www.pokemon.com/fr/actualites/lextension-mega-evolution-regne-delta-du-jcc-pokemon-arrive-le-6-novembre-2026',
      verifiedAt: '2026-09-29',
    },
  },
] as const satisfies readonly SealedReleaseV1[];
