import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGAlbumPage } from './TCGAlbumPage';

const authState = vi.hoisted(() => ({ enabled: true, user: null as { id: string } | null }));

vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'tcg.collection_owned': 'Owned', 'tcg.collection_overall_progress': 'Progress', 'tcg.search_placeholder': 'Search cards', 'tcg.collection_missing': 'Missing',
        'tcg.activation.album_title': 'Add your first card', 'tcg.activation.album_description': 'Start this set', 'tcg.activation.first_card_added': 'Card added · {{owned}} / {{total}} cards in this set', 'tcg.activation.continue_adding': 'Keep adding',
        'tcg.activation.change_set': 'Change set', 'tcg.activation.sync_title': 'Take your collection with you', 'tcg.activation.sync_description': 'Create an account to sync.', 'tcg.activation.create_account': 'Create an account', 'tcg.activation.continue_without_account': 'Continue without an account',
      };
      let message = messages[key] ?? key;
      for (const [name, value] of Object.entries(values ?? {})) message = message.replace(`{{${name}}}`, String(value));
      return message;
    },
  }),
}));
vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => authState }));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => <div /> }));
vi.mock('./TCGImageWithFallback', () => ({ TCGImageWithFallback: () => <div /> }));
vi.mock('./TCGCardDetailModal', () => ({
  TCGCardDetailModal: ({ onWishlistAdded }: { onWishlistAdded?: () => void }) => <button type="button" onClick={onWishlistAdded}>Add missing card to wishlist</button>,
}));

const set: TCGSet = { id: 'sv01', name: 'Scarlet & Violet', cardCount: { total: 2, official: 2 } };
const cards: TCGCard[] = [
  { id: 'sv01-1', localId: '1', name: 'Sprigatito' },
  { id: 'sv01-2', localId: '2', name: 'Fuecoco' },
];

function resetStore(owned: string[] = []) {
  act(() => {
    usePrimeDexStore.setState({ tcgOwnedCards: owned, tcgWishlistCards: [], tcgActiveSets: [], _hasHydrated: true });
  });
}

afterEach(() => resetStore());

describe('TCGAlbumPage activation', () => {
  it('shows exact first-card progress without a sync prompt', () => {
    resetStore();
    render(<TCGAlbumPage set={set} cards={cards} activation />);

    fireEvent.click(screen.getAllByRole('button', { name: 'tcg.activation.owned_action' })[0]);

    expect(screen.getByText('Card added · 1 / 2 cards in this set')).toBeInTheDocument();
    expect(screen.queryByText('Take your collection with you')).not.toBeInTheDocument();
  });

  it('completes activation after a second card and allows the account prompt to be dismissed', () => {
    resetStore();
    render(<TCGAlbumPage set={set} cards={cards} activation />);

    fireEvent.click(screen.getAllByRole('button', { name: 'tcg.activation.owned_action' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'tcg.activation.owned_action' }));

    expect(screen.getByText('Take your collection with you')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }));
    expect(screen.queryByText('Take your collection with you')).not.toBeInTheDocument();
  });

  it('completes activation when a missing card is wishlisted after the first card', () => {
    resetStore();
    render(<TCGAlbumPage set={set} cards={cards} activation />);

    fireEvent.click(screen.getAllByRole('button', { name: 'tcg.activation.owned_action' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'tcg.open_card_detail' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Add missing card to wishlist' }));

    expect(screen.getByText('Take your collection with you')).toBeInTheDocument();
  });

  it('uses localized start navigation only in activation mode', () => {
    resetStore();
    const { rerender } = render(<TCGAlbumPage set={set} cards={cards} activation />);

    expect(screen.getByRole('link', { name: 'Change set' })).toHaveAttribute('href', '/fr/tcg/start');
    expect(screen.getByRole('link', { name: 'Back to TCG collection' })).toHaveAttribute('href', '/fr/tcg/start');

    rerender(<TCGAlbumPage set={set} cards={cards} />);
    expect(screen.queryByRole('link', { name: 'Change set' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to TCG collection' })).toHaveAttribute('href', '/fr/tcg/collection');
  });
});
