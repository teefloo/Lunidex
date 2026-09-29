import { SEALED_RELEASES_V1 } from '@/content/tcg/sealed-releases.v1';
import { describe, expect, it } from 'vitest';
import { formatReleaseWindow, type ReleaseWindow } from './tcg-release-calendar';

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


describe('versioned French sealed release data', () => {
  it('keeps official product windows at their announced quarter precision', () => {
    const products = SEALED_RELEASES_V1.filter((release) => release.kind === 'sealed-product');
    expect(products).toHaveLength(13);
    expect(products.every((release) => release.window.precision === 'quarter')).toBe(true);
    expect(products.every((release) => release.source.publisher === 'The Pokémon Company' && release.source.verifiedAt === '2026-09-29')).toBe(true);
    expect(products.every((release) => !('cardmarketProductId' in release))).toBe(true);
    expect(products.find((release) => release.id === 'collection-premium-metamorph-30e')?.window).toEqual({ precision: 'quarter', year: 2026, quarter: 4 });
  });
});
