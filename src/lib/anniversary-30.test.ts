import { describe, expect, it } from 'vitest';

import type { TCGCard } from '@/types/tcg';
import nextConfig from '../../next.config';
import {
  ANNIVERSARY_30_RELEASE_DATE,
  ANNIVERSARY_30_LAST_VERIFIED_DATE,
  ANNIVERSARY_30_PRODUCTS,
  getAnniversary30ReleaseState,
} from '@/lib/anniversary-30';
import {
  ANNIVERSARY_30_CARD_MANIFEST,
  ANNIVERSARY_30_PIKACHU_CARDS,
  getAnniversary30OfficialCardImage,
  getAnniversary30Manifest,
  getAnniversary30FeaturedCards,
  getAnniversary30FuturisticRareCards,
  filterAnniversary30Cards,
  mergeAnniversary30Cards,
} from '@/lib/anniversary-30-cards';
import { buildAnniversary30CardItemList } from '@/lib/anniversary-30-seo';

describe('30th Celebration verified data', () => {
  it('uses the requested editorial snapshot and release date', () => {
    expect(ANNIVERSARY_30_LAST_VERIFIED_DATE).toBe('2026-09-12');
    expect(ANNIVERSARY_30_RELEASE_DATE).toBe('2026-09-16');
  });

  it('keeps the countdown bounded before, at, and after release', () => {
    const before = getAnniversary30ReleaseState(new Date('2026-09-15T23:59:59.000Z'));
    expect(before.status).toBe('upcoming');
    expect(before.totalSeconds).toBe(1);
    expect(getAnniversary30ReleaseState(new Date('2026-09-16T00:00:00.000Z')))
      .toEqual({ status: 'available', totalSeconds: 0 });
    expect(getAnniversary30ReleaseState(new Date('2026-09-17T00:00:00.000Z')))
      .toEqual({ status: 'available', totalSeconds: 0 });
  });

  it('contains the 30 real Pikachu cards in collector order', () => {
    expect(ANNIVERSARY_30_PIKACHU_CARDS).toHaveLength(30);
    expect(ANNIVERSARY_30_PIKACHU_CARDS.map((card) => card.localId)).toEqual(
      Array.from({ length: 30 }, (_, index) => String(index + 23).padStart(3, '0')),
    );
    expect(new Set(ANNIVERSARY_30_PIKACHU_CARDS.map((card) => card.id)).size).toBe(30);
    expect(ANNIVERSARY_30_PIKACHU_CARDS.every((card) => card.name === 'Pikachu')).toBe(true);
  });

  it('contains a complete, non-placeholder main checklist', () => {
    expect(getAnniversary30Manifest().numberedMain).toHaveLength(128);
    expect(ANNIVERSARY_30_CARD_MANIFEST.some((card) => /slot/i.test(card.name))).toBe(false);
    expect(new Set(ANNIVERSARY_30_CARD_MANIFEST.map((card) => card.id)).size)
      .toBe(ANNIVERSARY_30_CARD_MANIFEST.length);
  });

  it('attaches the verified official gallery images to static card records', () => {
    const manifest = getAnniversary30Manifest().cards;
    const officialImageCards = manifest.filter((card) => (
      card.scope === 'numbered-main'
      || card.scope === 'pikachu'
      || card.scope === 'secret-rare'
      || card.scope === 'classic-collection'
    ));

    expect(getAnniversary30OfficialCardImage({ scope: 'numbered-main', localId: '001' }))
      .toBe('https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/en-us/2M6P_EN_1-2x.png');
    expect(getAnniversary30OfficialCardImage({ scope: 'classic-collection', imageIndex: 1 }))
      .toBe('https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/en-us/2M6P_Classic_EN_1-2x.png');
    expect(officialImageCards).toHaveLength(188);
    expect(officialImageCards.every((card) => (
      card.imageStatus === 'available'
      && card.imageUrl?.en
      && card.imageUrl.fr === card.imageUrl.en
    ))).toBe(true);
    expect(manifest.filter((card) => card.imageStatus !== 'available')).toHaveLength(25);
  });

  it('allows the official card CDN through the image security boundaries', async () => {
    const headerRules = await nextConfig.headers?.();
    const securityHeaders = headerRules?.find((rule) => rule.source === '/(.*)')?.headers ?? [];
    const contentSecurityPolicy = securityHeaders.find((header) => header.key === 'Content-Security-Policy')?.value;
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    expect(contentSecurityPolicy).toContain('https://dz3we2x72f7ol.cloudfront.net');
    expect(remotePatterns.some((pattern) => (
      pattern.protocol === 'https'
      && pattern.hostname === 'dz3we2x72f7ol.cloudfront.net'
      && pattern.pathname === '/expansions/30th-celebration/**'
    ))).toBe(true);
  });

  it('does not duplicate product identities', () => {
    expect(new Set(ANNIVERSARY_30_PRODUCTS.map((product) => product.id)).size)
      .toBe(ANNIVERSARY_30_PRODUCTS.length);
    expect(ANNIVERSARY_30_PRODUCTS).toHaveLength(14);
  });

  it('keeps the complete manifest when the provider returns a partial list', () => {
    const result = mergeAnniversary30Cards(ANNIVERSARY_30_CARD_MANIFEST, [
      { id: 'provider-023', localId: '023', name: 'Pikachu', image: '/provider.webp' } as TCGCard,
    ]);

    expect(result.filter((card) => card.scope === 'pikachu')).toHaveLength(30);
    expect(result.find((card) => card.localId === '023')?.lunidexCardId).toBe('provider-023');
    expect(result.find((card) => card.localId === '052')?.lunidexCardId).toBeUndefined();
    expect(result.find((card) => card.localId === '023')?.imageStatus).toBe('available');
  });

  it('filters the same manifest by ownership and verified card families', () => {
    const cards = getAnniversary30Manifest().cards;
    const owned = new Set(['30th-023', '30th-129']);

    expect(filterAnniversary30Cards(cards, 'owned', owned).map((card) => card.localId)).toEqual(['023', '129']);
    expect(filterAnniversary30Cards(cards, 'missing', owned)).toHaveLength(cards.length - 2);
    expect(filterAnniversary30Cards(cards, 'pikachu')).toHaveLength(30);
    expect(filterAnniversary30Cards(cards, 'classic-collection')).toHaveLength(30);
    expect(filterAnniversary30Cards(cards, 'illustration-rare')).toHaveLength(18);
    expect(filterAnniversary30Cards(cards, 'special-illustration-rare')).toHaveLength(10);
    expect(filterAnniversary30Cards(cards, 'futuristic-rare')).toHaveLength(2);
  });

  it('selects stable highlight cards without duplicating secret variants', () => {
    const featured = getAnniversary30FeaturedCards(getAnniversary30Manifest().cards);

    expect(featured.map((card) => card.name)).toEqual([
      'Pikachu ex',
      'Mew ex',
      'Mewtwo ex',
      'Lugia',
      'Ho-Oh',
    ]);
    expect(featured.every((card) => card.scope === 'numbered-main')).toBe(true);
  });

  it('keeps the two Futuristic Rare cards as a separate family', () => {
    const futuristic = getAnniversary30FuturisticRareCards(getAnniversary30Manifest().cards);

    expect(futuristic).toHaveLength(2);
    expect(futuristic.map((card) => card.name).sort()).toEqual(['Mew ex', 'Mewtwo ex']);
    expect(futuristic.every((card) => card.scope === 'secret-rare')).toBe(true);
  });

  it('only emits structured card links for validated provider identities', () => {
    const model = buildAnniversary30CardItemList({
      pageUrl: 'https://lunidex.app/en/30e-anniversaire',
      language: 'en',
      name: '30th Celebration cards',
      cards: [
        { ...ANNIVERSARY_30_PIKACHU_CARDS[0], lunidexCardId: '30th-023' },
        { ...ANNIVERSARY_30_PIKACHU_CARDS[1], lunidexCardId: 'invalid' },
        ANNIVERSARY_30_PIKACHU_CARDS[2],
      ],
      getCardUrl: (id) => `https://lunidex.app/en/tcg/cards/${id}`,
    });

    expect(model.numberOfItems).toBe(1);
    expect(model.itemListElement[0]?.item.url).toBe('https://lunidex.app/en/tcg/cards/30th-023');
  });
});
