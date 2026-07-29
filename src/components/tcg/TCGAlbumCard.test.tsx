import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import { TCGAlbumCard } from './TCGAlbumCard';

const toggleTCGOwned = vi.fn();

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: { toggleTCGOwned: typeof toggleTCGOwned }) => unknown) => selector({ toggleTCGOwned }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const messages: Record<string, string> = {
        'tcg.open_card_detail': `View ${values?.name ?? 'card'}`,
        'tcg.activation.owned_action': 'I own this card',
        'tcg.activation.remove_owned': 'Remove from my collection',
        'tcg.activation.confirm_remove': 'Confirm removal',
        'tcg.activation.view_card': 'View card',
      };
      return messages[key] ?? key;
    },
  }),
}));

vi.mock('./TCGCardImage', () => ({
  TCGCardImage: () => <div data-testid="card-image" />,
}));

const card: TCGCard = { id: 'sv01-1', localId: '1', name: 'Sprigatito', image: '/card.png' };

describe('TCGAlbumCard', () => {
  it('keeps card detail and ownership as separate actions', () => {
    const onView = vi.fn();
    const onOwnershipChange = vi.fn();
    render(<TCGAlbumCard card={card} owned={false} onView={onView} onOwnershipChange={onOwnershipChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'View Sprigatito' }));
    expect(onView).toHaveBeenCalledOnce();
    expect(toggleTCGOwned).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'I own this card' }));
    expect(toggleTCGOwned).toHaveBeenCalledWith('sv01-1');
    expect(onOwnershipChange).toHaveBeenCalledWith(true);
  });

  it('requires a second explicit action before removing an owned card', () => {
    toggleTCGOwned.mockClear();
    const onOwnershipChange = vi.fn();
    render(<TCGAlbumCard card={card} owned onOwnershipChange={onOwnershipChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove from my collection' }));
    expect(screen.getByRole('button', { name: 'Confirm removal' })).toBeInTheDocument();
    expect(toggleTCGOwned).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    expect(toggleTCGOwned).toHaveBeenCalledWith('sv01-1');
    expect(onOwnershipChange).toHaveBeenCalledWith(false);
  });
});
