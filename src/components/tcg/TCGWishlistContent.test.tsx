import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TCGCard, TCGSet } from '@/types/tcg';
import { TCGWishlistContent } from './TCGWishlistContent';

const store = vi.hoisted(() => ({
  tcgWishlistCards: ['base-25'],
  tcgOwnedCards: [],
  tcgActiveSets: [],
  toggleTCGWishlist: vi.fn(),
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: () => store,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) => {
      if (key === 'tcg.open_card_detail') return `Open ${values?.name ?? ''}`;
      if (key === 'tcg.compare_remove_card') return 'Remove card';
      return key;
    },
  }),
}));

vi.mock('./TCGCardImage', () => ({
  TCGCardImage: () => <div data-testid="card-image" />,
}));

vi.mock('./TCGCardDetailModal', () => ({
  TCGCardDetailModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog" /> : null,
}));

const set: TCGSet = { id: 'base', name: 'Base Set', cardCount: { total: 1, official: 1 } };
const card: TCGCard = { id: 'base-25', localId: '25', name: 'Pikachu', set };

describe('TCGWishlistContent controls', () => {
  it('keeps card details and wishlist removal as sibling controls', () => {
    render(<TCGWishlistContent setsMap={new Map([[set.id, { set, cards: [card] }]])} />);

    const detailButton = screen.getByRole('button', { name: 'Open Pikachu' });
    const removeButton = screen.getByRole('button', { name: 'Remove card' });

    expect(detailButton.querySelector('button')).toBeNull();
    expect(removeButton.closest('button')?.parentElement?.querySelector('button')).toBe(detailButton);

    fireEvent.click(detailButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(store.toggleTCGWishlist).toHaveBeenCalledWith(card.id);
  });
});
