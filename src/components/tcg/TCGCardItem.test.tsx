import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import i18n from '@/lib/i18n';
import type { TCGCard } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGCardItem } from './TCGCardItem';

vi.mock('next/image', () => ({
  default: (props: { alt?: string; src?: string }) => (
    <div role="img" aria-label={props.alt || ''} data-src={props.src || ''} />
  ),
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: vi.fn(),
}));

const mockedUsePrimeDexStore = vi.mocked(usePrimeDexStore);

const baseCard: TCGCard = {
  id: 'sv1-1',
  localId: '001',
  name: 'Charizard',
  image: 'https://assets.tcgdex.net/en/base/base1/001',
  rarity: 'Rare Holo VMAX',
  category: 'Pokemon',
  stage: 'VMAX',
};

function buildStore(overrides: Partial<ReturnType<typeof createStore>> = {}) {
  const store = createStore();
  Object.assign(store, overrides);
  mockedUsePrimeDexStore.mockReturnValue(store as never);
  return store;
}

function createStore() {
  return {
    language: 'en',
    toggleTCGWishlist: vi.fn(),
    toggleTCGWatchlist: vi.fn(),
    isTCGWishlist: vi.fn(() => false),
    isTCGWatchlist: vi.fn(() => false),
  };
}

beforeEach(() => {
  mockedUsePrimeDexStore.mockReset();
});

describe('TCGCardItem', () => {
  it('renders the holographic preview and keeps actions separate in default mode', () => {
    const store = buildStore();
    const onClick = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <TCGCardItem card={baseCard} onClick={onClick} />
      </I18nextProvider>,
    );

    const openCardButton = screen.getByRole('button', { name: i18n.t('tcg.open_card_detail', { name: baseCard.name }) });

    expect(openCardButton.closest('[data-rarity]')).toHaveAttribute('data-rarity', 'rare holo vmax');
    expect(screen.getByRole('img', { name: baseCard.name })).toBeInTheDocument();

    fireEvent.click(openCardButton);
    expect(onClick).toHaveBeenCalledWith(baseCard);

    fireEvent.click(screen.getByRole('button', { name: /favorite/i }));
    expect(store.toggleTCGWishlist).toHaveBeenCalledWith(baseCard.id);

    fireEvent.click(screen.getByRole('button', { name: /watchlist/i }));
    expect(store.toggleTCGWatchlist).toHaveBeenCalledWith(baseCard.id);

    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renders the list variant with the same holographic preview contract', () => {
    buildStore();

    render(
      <I18nextProvider i18n={i18n}>
        <TCGCardItem card={baseCard} variant="list" />
      </I18nextProvider>,
    );

    const openCardButton = screen.getByRole('button', { name: i18n.t('tcg.open_card_detail', { name: baseCard.name }) });

    expect(openCardButton.closest('[data-rarity]')).toHaveAttribute('data-rarity', 'rare holo vmax');
    expect(screen.getByRole('img', { name: baseCard.name })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marks trainer gallery cards with the trainer gallery data attribute', () => {
    buildStore();

    const trainerGalleryCard: TCGCard = {
      ...baseCard,
      id: 'swsh11tg-TG03',
      localId: 'TG03',
      stage: undefined,
      rarity: 'Trainer Gallery Rare Holo',
      set: {
        id: 'swsh11tg',
        name: 'Lost Origin Trainer Gallery',
      },
    };

    render(
      <I18nextProvider i18n={i18n}>
        <TCGCardItem card={trainerGalleryCard} />
      </I18nextProvider>,
    );

    const openCardButton = screen.getByRole('button', { name: i18n.t('tcg.open_card_detail', { name: trainerGalleryCard.name }) });

    expect(openCardButton.closest('[data-trainer-gallery]')).toHaveAttribute('data-trainer-gallery', 'true');
    expect(openCardButton.closest('[data-rarity]')).toHaveAttribute('data-rarity', 'trainer gallery rare holo');
  });
});
