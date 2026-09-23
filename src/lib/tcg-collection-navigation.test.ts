import { describe, expect, it } from 'vitest';
import {
  parseTCGCollectionScrollPosition,
  shouldUseTCGCollectionHistoryBack,
} from './tcg-collection-navigation';

describe('TCG collection album return navigation', () => {
  it('uses browser back only when the current album matches a collection-origin marker', () => {
    expect(shouldUseTCGCollectionHistoryBack(
      '/fr/tcg/collection/fr/me02?return=tcgLang%3Dfr',
      '/fr/tcg/collection/fr/me02?return=tcgLang%3Dfr',
      true,
    )).toBe(true);
  });

  it('keeps the explicit collection link for direct or mismatched album visits', () => {
    expect(shouldUseTCGCollectionHistoryBack(
      null,
      '/fr/tcg/collection/fr/me02?return=tcgLang%3Dfr',
      true,
    )).toBe(false);
    expect(shouldUseTCGCollectionHistoryBack(
      '/fr/tcg/collection/fr/30th?return=tcgLang%3Dfr',
      '/fr/tcg/collection/fr/me02?return=tcgLang%3Dfr',
      true,
    )).toBe(false);
    expect(shouldUseTCGCollectionHistoryBack(
      '/fr/tcg/collection/fr/me02?return=tcgLang%3Dfr',
      '/fr/tcg/collection/fr/me02?return=tcgLang%3Dfr',
      false,
    )).toBe(false);
  });

  it('parses a saved collection path and its exact scroll position', () => {
    const savedPosition = {
      collectionPath: '/fr/tcg/collection?tcgLang=fr&sort=name-asc',
      scrollY: 751.5,
    };

    expect(parseTCGCollectionScrollPosition(JSON.stringify(savedPosition))).toEqual(savedPosition);
  });

  it('rejects malformed, negative, or non-collection scroll positions', () => {
    expect(parseTCGCollectionScrollPosition('{bad json')).toBeNull();
    expect(parseTCGCollectionScrollPosition(JSON.stringify({
      collectionPath: '/fr/tcg/collection?tcgLang=fr',
      scrollY: -1,
    }))).toBeNull();
    expect(parseTCGCollectionScrollPosition(JSON.stringify({
      collectionPath: 'https://lunidex.app/fr/tcg/collection',
      scrollY: 751,
    }))).toBeNull();
  });
});
