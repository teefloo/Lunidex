import { SEALED_RELEASES_V1 } from '@/content/tcg/sealed-releases.v1';
import { describe, expect, it } from 'vitest';
import * as releaseCalendar from './tcg-release-calendar';
import { formatReleaseWindow, type ReleaseWindow, type SealedReleaseV1 } from './tcg-release-calendar';

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

  it('keeps French 30th anniversary dates imprecise where no exact day is sourced', () => {
    expect(releases.find((release) => release.id === 'blister-2-boosters-30e')?.window)
      .toEqual({ precision: 'quarter', year: 2026, quarter: 3 });
    expect(releases.find((release) => release.id === 'collection-ko-30e')?.window)
      .toEqual({ precision: 'quarter', year: 2026, quarter: 3 });
    expect(releases.find((release) => release.id === 'collection-premium-metamorph-30e')?.window)
      .toEqual({ precision: 'day', date: '2026-11-06' });
    expect(releases.find((release) => release.id === 'collection-premium-metamorph-30e')?.retailPriceCents)
      .toBeUndefined();
  });

  it('adds French 2026 product dates and recommended prices from PokéCardex', () => {
    const raikou = releases.find((release) => release.id === 'duopack-raikou-2026');
    expect(raikou?.window).toEqual({ precision: 'day', date: '2026-01-02' });
    expect(raikou?.retailPriceCents).toBe(1199);
    expect(raikou?.source.publisher).toBe('PokéCardex');

    const upcoming = releases.find((release) => release.id === 'etb-regne-delta');
    expect(upcoming?.window).toEqual({ precision: 'day', date: '2026-11-06' });
    expect(upcoming?.retailPriceCents).toBe(5599);
    expect(upcoming?.status).toBe('announced');
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
