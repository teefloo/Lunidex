import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import { onSyncAccessRequired, setSyncAccessStatus } from '@/store/sync-access';
import { TCGAlbumCard } from './TCGAlbumCard';

const toggleTCGOwned = vi.fn();

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: { toggleTCGOwned: typeof toggleTCGOwned }) => unknown) => selector({ toggleTCGOwned }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const messages: Record<string, string> = {
        'tcg.activation.add_card_aria': `Add ${values?.name ?? 'card'} to my collection`,
        'tcg.activation.remove_card_aria': `Remove ${values?.name ?? 'card'} from my collection`,
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
  beforeEach(() => {
    toggleTCGOwned.mockClear();
    setSyncAccessStatus('ready');
  });

  afterEach(() => setSyncAccessStatus('checking'));

  it('toggles ownership from the card and keeps card detail as a separate action', () => {
    const onView = vi.fn();
    const onOwnershipChange = vi.fn();
    render(<TCGAlbumCard card={card} owned={false} onView={onView} onOwnershipChange={onOwnershipChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Sprigatito to my collection' }));
    expect(toggleTCGOwned).toHaveBeenCalledWith('sv01-1');
    expect(onOwnershipChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'View card' }));
    expect(onView).toHaveBeenCalledOnce();
    expect(toggleTCGOwned).toHaveBeenCalledTimes(1);
  });

  it('removes an owned card immediately without a confirmation step', () => {
    const onOwnershipChange = vi.fn();
    render(<TCGAlbumCard card={card} owned onOwnershipChange={onOwnershipChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Sprigatito from my collection' }));
    expect(toggleTCGOwned).toHaveBeenCalledWith('sv01-1');
    expect(onOwnershipChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('button', { name: 'Confirm removal' })).not.toBeInTheDocument();
  });

  it('does not report a card change before remote access is ready', () => {
    const required = vi.fn();
    const unsubscribe = onSyncAccessRequired(required);
    const onOwnershipChange = vi.fn();
    setSyncAccessStatus('unauthenticated');
    render(<TCGAlbumCard card={card} owned={false} onOwnershipChange={onOwnershipChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Sprigatito to my collection' }));

    expect(toggleTCGOwned).not.toHaveBeenCalled();
    expect(onOwnershipChange).not.toHaveBeenCalled();
    expect(required).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
