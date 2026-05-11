import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import i18n from '@/lib/i18n';
import type { TCGCard } from '@/types/tcg';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { getTCGCard } from '@/lib/api/tcg';
import { TCGCardDetailModal } from './TCGCardDetailModal';

vi.mock('@/hooks/useMounted', () => ({
  useMounted: vi.fn(),
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: vi.fn(),
}));

vi.mock('@/lib/api/tcg', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tcg')>('@/lib/api/tcg');
  return {
    ...actual,
    getTCGCard: vi.fn(),
  };
});

vi.mock('next/image', () => ({
  default: (props: { alt?: string; src?: string }) => (
    <div role="img" aria-label={props.alt || ''} data-src={props.src || ''} />
  ),
}));

const mockedUseMounted = vi.mocked(useMounted);
const mockedUsePrimeDexStore = vi.mocked(usePrimeDexStore);
const mockedGetTCGCard = vi.mocked(getTCGCard);

const baseCard: TCGCard = {
  id: 'sv1-025',
  localId: '025',
  name: 'Pikachu',
  image: 'https://assets.tcgdex.net/en/base/base1/025',
};

function renderModal(card: TCGCard) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TCGCardDetailModal card={card} isOpen onClose={vi.fn()} />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

beforeEach(() => {
  mockedUseMounted.mockReturnValue(true);
  mockedUsePrimeDexStore.mockReturnValue({
    language: 'en',
  } as never);
  mockedGetTCGCard.mockReset();
});

describe('TCGCardDetailModal', () => {
  it('renders Pokémon specific sections', async () => {
    mockedGetTCGCard.mockResolvedValueOnce({
      ...baseCard,
      category: 'Pokemon',
      dexId: [25],
      hp: 60,
      types: ['Lightning'],
      stage: 'Basic',
      evolveFrom: 'Pichu',
      attacks: [
        {
          name: 'Thunder Jolt',
          cost: ['Lightning'],
          damage: '30',
          effect: 'A small shock.',
        },
      ],
      abilities: [
        {
          name: 'Static',
          effect: 'The Defending Pokémon is now Paralyzed.',
        },
      ],
      weaknesses: [{ type: 'Fighting', value: '×2' }],
      resistances: [{ type: 'Metal', value: '-30' }],
      retreat: 1,
      flavorText: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.',
      set: {
        id: 'sv1',
        name: 'Scarlet & Violet',
        totalCards: 198,
      },
      rarity: 'Common',
      illustrator: 'Atsushi Furusawa',
      regulationMark: 'G',
    } as TCGCard);

    renderModal(baseCard);

    expect(await screen.findByText('Thunder Jolt')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('tcg.retreat_cost'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('tcg.open_pokemon_page', { defaultValue: 'Open Pokémon page' }) })).toHaveAttribute('href', '/pokemon/25?lang=en');
  });

  it('renders Trainer specific metadata and effect text', async () => {
    mockedGetTCGCard.mockResolvedValueOnce({
      ...baseCard,
      id: 'sv1-150',
      localId: '150',
      name: 'Rare Candy',
      category: 'Trainer',
      trainerType: 'Item',
      effect: 'Choose 1 of your Basic Pokémon in play.',
      set: {
        id: 'sv1',
        name: 'Scarlet & Violet',
        totalCards: 198,
      },
      rarity: 'Rare',
    } as TCGCard);

    renderModal({ ...baseCard, id: 'sv1-150', localId: '150', name: 'Rare Candy' });

    expect(await screen.findByText(i18n.t('tcg.trainer_type'))).toBeInTheDocument();
  });

  it('renders Energy specific metadata and effect text', async () => {
    mockedGetTCGCard.mockResolvedValueOnce({
      ...baseCard,
      id: 'sv1-206',
      localId: '206',
      name: 'Double Turbo Energy',
      category: 'Energy',
      energyType: 'Special',
      effect: 'This card provides Colorless Colorless Energy.',
      set: {
        id: 'sv1',
        name: 'Scarlet & Violet',
        totalCards: 198,
      },
      rarity: 'Uncommon',
    } as TCGCard);

    renderModal({ ...baseCard, id: 'sv1-206', localId: '206', name: 'Double Turbo Energy' });

    expect(await screen.findByText(i18n.t('tcg.energy_type'))).toBeInTheDocument();
  });
});
