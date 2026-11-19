import { describe, expect, it } from 'vitest';
import { getShareableTCGCollection, normalizeTCGSharePage, sliceTCGShareCards } from './tcg-collection-share';

const binderId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const otherBinderId = '27df8648-39da-4fc9-88b2-fd194d28cc5a';

function state() {
  return {
    email: 'private@example.com',
    tcgCustomCollections: [
      { id: binderId, name: 'Trade binder', description: 'For swaps', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
      { id: otherBinderId, name: 'Private binder', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
    ],
    tcgCustomCollectionCards: [
      { collectionId: binderId, cardId: 'sv1-1', language: 'en', cardName: 'Card One', addedAt: '2026-01-02T00:00:00.000Z', quantity: 2 },
      { collectionId: binderId, cardId: 'sv1-2', language: 'fr', cardName: 'Carte Deux', addedAt: '2026-01-03T00:00:00.000Z', quantity: 0 },
      { collectionId: otherBinderId, cardId: 'sv1-3', language: 'en', cardName: 'Secret Card', addedAt: '2026-01-04T00:00:00.000Z', quantity: 7 },
    ],
  };
}

describe('custom TCG collection share projection', () => {
  it('projects only the requested binder and excludes unrelated account state', () => {
    const projection = getShareableTCGCollection(state(), binderId);

    expect(projection).toEqual({
      collection: {
        id: binderId,
        name: 'Trade binder',
        description: 'For swaps',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      cards: [
        { collectionId: binderId, cardId: 'sv1-1', language: 'en', cardName: 'Card One', addedAt: '2026-01-02T00:00:00.000Z', quantity: 2 },
        { collectionId: binderId, cardId: 'sv1-2', language: 'fr', cardName: 'Carte Deux', addedAt: '2026-01-03T00:00:00.000Z', quantity: 0 },
      ],
    });
    expect(JSON.stringify(projection)).not.toContain('private@example.com');
    expect(JSON.stringify(projection)).not.toContain('Secret Card');
  });

  it('returns no scope for missing or invalid binders', () => {
    expect(getShareableTCGCollection(state(), '00000000-0000-4000-8000-000000000000')).toBeNull();
    expect(getShareableTCGCollection(null, binderId)).toBeNull();
  });
});

describe('TCG share pagination', () => {
  it('bounds page parameters and returns only the selected compact slice', () => {
    const query = new URLSearchParams({ page: '2', pageSize: '2' });
    const page = normalizeTCGSharePage(query);
    expect(page).toEqual({ page: 2, pageSize: 2 });
    expect(sliceTCGShareCards(['a', 'b', 'c', 'd', 'e'], page)).toEqual(['c', 'd']);

    expect(normalizeTCGSharePage(new URLSearchParams({ page: 'NaN', pageSize: '1000' })))
      .toEqual({ page: 1, pageSize: 48 });
  });
});
