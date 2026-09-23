import { describe, expect, it } from 'vitest';
import { shouldUseTCGCollectionHistoryBack } from './tcg-collection-navigation';

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
});
