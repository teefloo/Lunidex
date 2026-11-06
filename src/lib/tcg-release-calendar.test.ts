import { SEALED_RELEASES_V1 } from '@/content/tcg/sealed-releases.v1';
import { describe, expect, it } from 'vitest';
import * as releaseCalendar from './tcg-release-calendar';
import { formatReleaseWindow, getReleaseDisplayStatus, type ReleaseWindow, type SealedReleaseV1 } from './tcg-release-calendar';

const releases: readonly SealedReleaseV1[] = SEALED_RELEASES_V1;

describe('formatReleaseWindow', () => {
  it('renders an exact date in the requested locale without timezone drift', () => {
    const release: ReleaseWindow = { precision: 'day', date: '2026-11-06' };
    expect(formatReleaseWindow(release, 'fr')).toBe('6 novembre 2026');
    expect(formatReleaseWindow(release, 'en')).toBe('November 6, 2026');
  });

  it('keeps a quarter imprecise rather than inventing a release day', () => {
    const release: ReleaseWindow = { precision: 'quarter', year: 2026, quarter: 4 };
    expect(formatReleaseWindow(release, 'fr')).toBe('4e trimestre 2026');
    expect(formatReleaseWindow(release, 'en')).toBe('Q4 2026');
  });
});

describe('dynamic sealed release status', () => {
  it('uses the France calendar day and leaves a passed announcement uncertain', () => {
    const release = { ...releases[0], status: 'announced' as const, window: { precision: 'day' as const, date: '2026-11-06' as const } };
    expect(getReleaseDisplayStatus(release, new Date('2026-11-05T22:30:00.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(release, new Date('2026-11-06T22:59:59.000Z'))).toBe('availability-uncertain');
  });

  it('handles month and quarter boundaries without claiming a release', () => {
    const base = { ...releases[0], status: 'announced' as const };
    const month = { ...base, window: { precision: 'month' as const, year: 2026, month: 11 } };
    expect(getReleaseDisplayStatus(month, new Date('2026-10-31T21:59:59.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(month, new Date('2026-10-31T22:00:00.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(month, new Date('2026-11-30T22:59:59.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(month, new Date('2026-11-30T23:00:00.000Z'))).toBe('availability-uncertain');

    const quarter = { ...base, window: { precision: 'quarter' as const, year: 2026, quarter: 4 as const } };
    expect(getReleaseDisplayStatus(quarter, new Date('2026-09-30T21:59:59.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(quarter, new Date('2026-09-30T22:00:00.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(quarter, new Date('2026-12-31T22:59:59.000Z'))).toBe('upcoming');
    expect(getReleaseDisplayStatus(quarter, new Date('2026-12-31T23:00:00.000Z'))).toBe('availability-uncertain');
  });

  it('keeps explicit editorial outcomes regardless of the calendar', () => {
    const base = { ...releases[0], window: { precision: 'day' as const, date: '2020-01-01' as const } };
    expect(getReleaseDisplayStatus({ ...base, status: 'released' }, new Date('2026-11-06T12:00:00Z'))).toBe('released');
    expect(getReleaseDisplayStatus({ ...base, status: 'postponed' }, new Date('2026-11-06T12:00:00Z'))).toBe('postponed');
    expect(getReleaseDisplayStatus({ ...base, status: 'availability-uncertain' }, new Date('2026-11-06T12:00:00Z'))).toBe('availability-uncertain');
  });
});

describe('sealed release market links', () => {
  it('keeps the locale and rejects releases without a verified Cardmarket match', () => {
    const makeHref = Reflect.get(releaseCalendar, 'sealedReleaseMarketHref') as
      ((productId: number | undefined, language: 'en' | 'fr') => string | null) | undefined;
    expect(makeHref?.(885542, 'fr')).toBe('/fr/tcg/sealed/market/885542');
    expect(makeHref?.(885542, 'en')).toBe('/en/tcg/sealed/market/885542');
    expect(makeHref?.(undefined, 'fr')).toBeNull();
    expect(makeHref?.(0, 'fr')).toBeNull();
  });
});


describe('versioned French sealed release data', () => {
  it('keeps record IDs unique and every source traceable', () => {
    expect(new Set(releases.map((release) => release.id)).size).toBe(releases.length);
    expect(releases.every((release) => release.source.url.startsWith('https://')
      && /^\d{4}-\d{2}-\d{2}$/.test(release.source.verifiedAt))).toBe(true);
    expect(releases.filter((release) => release.retailPriceCents !== undefined)
      .every((release) => Number.isInteger(release.retailPriceCents) && (release.retailPriceCents ?? 0) > 0)).toBe(true);
    const marketMatches = Object.fromEntries(releases
      .filter((release) => release.cardmarketProductId !== undefined)
      .map((release) => [release.id, release.cardmarketProductId]));
    expect(marketMatches).toEqual({
      'collection-ko-30e': 895559,
      'collection-classeur-30e': 895560,
      'collection-poster-30e': 895553,
      'collection-premium-metamorph-30e': 895574,
      'lot-boosters-30e': 895561,
      'coffret-dresseur-elite-30e': 895551,
      'collection-premiers-partenaires-heroes-transcendants': 864106,
      'prerelease-equilibre-parfait': 865397,
      'etb-equilibre-parfait': 865406,
      'bundle-equilibre-parfait': 865404,
      'prerelease-chaos-ascendant': 877282,
      'etb-chaos-ascendant': 877294,
      'bundle-chaos-ascendant': 877284,
      'prerelease-nuit-noire': 885540,
      'etb-nuit-noire': 885542,
      'bundle-nuit-noire': 885539,
      'etb-heros-transcendants': 860574,
      'bundle-heros-transcendants': 860578,
    });
    const matchIds = Object.values(marketMatches);
    expect(new Set(matchIds).size).toBe(matchIds.length);
  });

  it('uses only the precision supported by current official French product sources', () => {
    const q3Ids = [
      'blister-2-boosters-30e', 'collection-ko-30e', 'collection-poster-30e',
      'coffrets-nymphali-amphinobi-30e', 'coffret-dresseur-elite-30e',
    ];
    const q4Ids = [
      'collection-autocollant-30e', 'collection-premium-metamorph-30e',
      'collection-ultra-premium-journee-soiree-30e', 'collection-figurine-mew-mewtwo-30e',
    ];
    for (const id of q3Ids) {
      const release = releases.find((entry) => entry.id === id);
      expect(release?.window).toEqual({ precision: 'quarter', year: 2026, quarter: 3 });
      expect(release?.source.url).toBe('https://www.pokemon.com/fr/news/jcc-pokemon-produits-30-anniversaire');
      expect(release?.source.verifiedAt).toBe('2026-11-06');
    }
    for (const id of q4Ids) {
      const release = releases.find((entry) => entry.id === id);
      expect(release?.window).toEqual({ precision: 'quarter', year: 2026, quarter: 4 });
      expect(release?.source.url).toBe('https://www.pokemon.com/fr/news/jcc-pokemon-produits-30-anniversaire');
      expect(release?.source.verifiedAt).toBe('2026-11-06');
    }
    const octoberIds = ['collection-classeur-30e', 'lot-boosters-30e', 'mini-boites-30e', 'decks-combat-mentali-noctali-30e', 'duopack-octobre-2026'];
    for (const id of octoberIds) {
      const release = releases.find((entry) => entry.id === id);
      expect(release?.window).toEqual({ precision: 'month', year: 2026, month: 10 });
      expect(release?.source.url).toBe('https://www.pokemon.com/fr/actualites/decouvrez-tous-les-produits-du-jcc-pokemon-qui-sortiront-en-octobre-2026');
      expect(release?.source.verifiedAt).toBe('2026-11-06');
    }
    for (const id of [
      'collection-poster-30e', 'coffrets-nymphali-amphinobi-30e', 'coffret-dresseur-elite-30e',
      'collection-classeur-30e', 'decks-combat-mentali-noctali-30e', 'duopack-octobre-2026',
      'prerelease-regne-delta', 'etb-regne-delta', 'bundle-regne-delta',
    ]) {
      const release = releases.find((entry) => entry.id === id);
      expect(release?.priceSource).toMatchObject({
        publisher: 'PokéCardex',
        url: 'https://www.pokecardex.com/forums/viewtopic.php?t=49894',
        verifiedAt: '2026-09-30',
      });
    }
    expect(releases.find((release) => release.id === 'collection-poster-30e')?.status).toBe('released');
    expect(releases.find((release) => release.id === 'coffrets-nymphali-amphinobi-30e')?.status).toBe('released');
    expect(releases.find((release) => release.id === 'coffret-dresseur-elite-30e')?.status).toBe('released');
    expect(releases.find((release) => release.id === 'collection-premium-metamorph-30e')?.retailPriceCents)
      .toBeUndefined();
  });

  it('adds French 2026 product dates and recommended prices from PokéCardex', () => {
    const raikou = releases.find((release) => release.id === 'duopack-raikou-2026');
    expect(raikou?.window).toEqual({ precision: 'day', date: '2026-01-02' });
    expect(raikou?.retailPriceCents).toBe(1199);
    expect(raikou?.source.publisher).toBe('PokéCardex');

    const upcoming = releases.find((release) => release.id === 'etb-regne-delta');
    expect(upcoming?.window).toEqual({ precision: 'quarter', year: 2026, quarter: 4 });
    expect(upcoming?.retailPriceCents).toBe(5599);
    expect(upcoming?.status).toBe('announced');
    expect(upcoming?.source.url).toBe('https://www.pokemon.com/fr/actualites/jcc-pokemon-apercu-des-produits-mega-evolution-regne-delta');
    expect(upcoming?.source.verifiedAt).toBe('2026-11-06');
    const bundle = releases.find((release) => release.id === 'bundle-regne-delta');
    expect(bundle?.window).toEqual({ precision: 'quarter', year: 2026, quarter: 4 });
    expect(bundle?.source.url).toBe('https://www.pokemon.com/fr/actualites/jcc-pokemon-apercu-des-produits-mega-evolution-regne-delta');
    const prerelease = releases.find((release) => release.id === 'prerelease-regne-delta');
    expect(prerelease?.window).toEqual({ precision: 'day', date: '2026-10-24' });
    expect(prerelease?.source.url).toBe('https://www.pokemon.com/fr/actualites/participez-a-un-evenement-davant-premiere-pour-lextension-mega-evolution-regne-delta-du-jcc-pokemon');
    expect(prerelease?.source.publisher).toBe('The Pokémon Company');
    expect(prerelease?.source.verifiedAt).toBe('2026-11-06');
    expect(releases.find((release) => release.id === 'tripack-regne-delta')?.source.publisher).toBe('PokéCardex');
    const expansion = releases.find((release) => release.id === 'mega-evolution-regne-delta');
    expect(expansion?.source.verifiedAt).toBe('2026-11-06');
    expect(expansion?.source.url).toBe('https://www.pokemon.com/fr/actualites/jcc-pokemon-apercu-des-produits-mega-evolution-regne-delta');
  });

  it('covers every 2026 expansion with its official release day and source', () => {
    const expansions = releases.filter((release) => release.kind === 'expansion'
      && release.window.precision === 'day' && release.window.date.startsWith('2026-'));
    expect(expansions.map((release) => [release.id, release.window])).toEqual([
      ['mega-evolution-heros-transcendants', { precision: 'day', date: '2026-01-30' }],
      ['mega-evolution-equilibre-parfait', { precision: 'day', date: '2026-03-27' }],
      ['mega-evolution-chaos-ascendant', { precision: 'day', date: '2026-05-22' }],
      ['mega-evolution-nuit-noire', { precision: 'day', date: '2026-07-17' }],
      ['pokemon-30th-anniversary-expansion', { precision: 'day', date: '2026-09-16' }],
      ['mega-evolution-regne-delta', { precision: 'day', date: '2026-11-06' }],
    ]);
    expect(expansions.every((release) => release.source.publisher === 'The Pokémon Company')).toBe(true);
    expect(expansions.filter((release) => [
      'mega-evolution-heros-transcendants',
      'mega-evolution-equilibre-parfait',
      'mega-evolution-chaos-ascendant',
      'mega-evolution-nuit-noire',
    ].includes(release.id))
      .every((release) => release.source.verifiedAt === '2026-09-30')).toBe(true);
  });

  it('fills the 2025 French expansion calendar from the official Pokémon index', () => {
    const expansions = releases.filter((release) => release.kind === 'expansion'
      && release.window.precision === 'day' && release.window.date.startsWith('2025-'));
    expect(expansions.map((release) => [release.id, release.window])).toEqual([
      ['evolutions-prismatiques', { precision: 'day', date: '2025-01-17' }],
      ['aventures-ensemble', { precision: 'day', date: '2025-03-28' }],
      ['rivalites-destinees', { precision: 'day', date: '2025-05-30' }],
      ['foudre-noire', { precision: 'day', date: '2025-07-18' }],
      ['flamme-blanche', { precision: 'day', date: '2025-07-18' }],
      ['mega-evolution', { precision: 'day', date: '2025-10-10' }],
      ['mega-evolution-flammes-fantasmagoriques', { precision: 'day', date: '2025-11-14' }],
    ]);
    expect(expansions.every((release) => release.source.publisher === 'The Pokémon Company'
      && release.source.url === 'https://www.pokemon.com/fr/jcc-pokemon/extensions-jeu-cartes-a-collectionner'
      && release.source.verifiedAt === '2026-09-30')).toBe(true);
  });

  it('fills the 2024 French expansion calendar without inventing Forces Temporelles day precision', () => {
    const expansions = releases.filter((release) => release.kind === 'expansion'
      && ((release.window.precision === 'day' && release.window.date.startsWith('2024-'))
        || (release.window.precision === 'quarter' && release.window.year === 2024)));
    expect(expansions.map((release) => [release.id, release.window])).toEqual([
      ['destinees-de-paldea', { precision: 'day', date: '2024-01-26' }],
      ['forces-temporelles', { precision: 'quarter', year: 2024, quarter: 1 }],
      ['mascarade-crepusculaire', { precision: 'day', date: '2024-05-24' }],
      ['fable-nebuleuse', { precision: 'day', date: '2024-08-02' }],
      ['couronne-stellaire', { precision: 'day', date: '2024-09-13' }],
      ['etincelles-deferlantes', { precision: 'day', date: '2024-11-08' }],
    ]);
    expect(expansions.every((release) => release.source.publisher === 'The Pokémon Company'
      && release.source.verifiedAt === '2026-09-30')).toBe(true);
  });
});
