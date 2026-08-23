import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: { _hasHydrated: boolean; tcgOwnedCards: string[]; language: string; systemLanguage: string }) => unknown) => (
    selector({ _hasHydrated: true, tcgOwnedCards: [], language: 'en', systemLanguage: 'en' })
  ),
}));

vi.mock('./useHomeFeaturedCards', () => ({
  useHomeFeaturedCards: () => ({
    cards: [
      { id: 'miscp_ja-37', localId: '37', name: 'Pikachu Illustrator', image: 'https://images.scrydex.com/pokemon/miscp_ja-37/small' },
      { id: 'wotc-presentation-009-165r', localId: '009/165R', name: 'Blastoise — Commissioned Presentation Galaxy Star Holo (1998)', image: 'https://www.cardtrader.com/uploads/blueprints/image/273508/show_blastoise-cosmos-holo-009-165-white-back-starlight-holo-test-print-card-wizards-of-the-coast-era-promos.jpg' },
      { id: 'base1-4', localId: '4', name: 'Charizard — Base Set 1st Edition Shadowless', image: 'https://images.scrydex.com/pokemon/base1-4/small' },
    ],
  }),
}));

vi.mock('@/components/tcg/TCGCardImage', () => ({
  TCGCardImage: ({ card, alt = '' }: { card: { id: string }; alt?: string }) => (
    <div aria-label={alt} data-card-id={card.id} data-testid="preview-card-image" />
  ),
}));

vi.mock('./HomeCollectionEntry', () => ({
  HomeCollectionEntry: () => <a href="/fr/tcg/collection">Start</a>,
}));

import { HomeCollectionPreview } from './HomeCollectionPreview';

describe('HomeCollectionPreview', () => {
  it('shows real card previews instead of empty placeholders', () => {
    render(
      <HomeCollectionPreview
        locale="fr"
        copy={{
          startLabel: 'Start',
          resumeLabel: 'Resume',
          previewEyebrow: 'Collection preview',
          previewTitle: 'Your collection',
          previewBody: 'Add cards',
          previewNote: 'No account',
          previewOwnedEyebrow: 'Owned',
          previewOwnedTitle: 'Your cards',
          previewOwnedCountOne: '{{count}} card',
          previewOwnedCountOther: '{{count}} cards',
          noAccount: 'No account needed',
        }}
      />,
    );

    const previewCards = screen.getAllByTestId('preview-card-image');
    expect(previewCards).toHaveLength(3);
    expect(screen.getAllByTestId('home-card-preview')).toHaveLength(3);
    expect(previewCards.map((image) => image.getAttribute('data-card-id'))).toEqual([
      'miscp_ja-37',
      'wotc-presentation-009-165r',
      'base1-4',
    ]);
    expect(screen.getByRole('link', { name: 'Start' })).toBeInTheDocument();
  });

  it('can hide its collection action when embedded in the homepage bento', () => {
    render(
      <HomeCollectionPreview
        locale="fr"
        showAction={false}
        copy={{
          startLabel: 'Start',
          resumeLabel: 'Resume',
          previewEyebrow: 'Collection preview',
          previewTitle: 'Your collection',
          previewBody: 'Add cards',
          previewNote: 'No account',
          previewOwnedEyebrow: 'Owned',
          previewOwnedTitle: 'Your cards',
          previewOwnedCountOne: '{{count}} card',
          previewOwnedCountOther: '{{count}} cards',
          noAccount: 'No account needed',
        }}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Start' })).not.toBeInTheDocument();
  });
});
