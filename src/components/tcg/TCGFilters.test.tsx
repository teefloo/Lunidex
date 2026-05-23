import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { getFilterOptions, getRaritiesForSet } from '@/lib/api/tcg';
import { TCGFilters } from './TCGFilters';

vi.mock('@/hooks/useMounted', () => ({
  useMounted: vi.fn(),
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: () => ({ language: 'en' }),
}));

vi.mock('@/lib/api/tcg', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tcg')>('@/lib/api/tcg');
  return {
    ...actual,
    getFilterOptions: vi.fn(),
    getRaritiesForSet: vi.fn(),
  };
});

vi.mock('@/components/ui/PokeballIcon', () => ({
  PokeballIcon: () => null,
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <div aria-label={props.alt || ''} />,
}));

const mockedUseMounted = vi.mocked(useMounted);
const mockedGetFilterOptions = vi.mocked(getFilterOptions);
const mockedGetRaritiesForSet = vi.mocked(getRaritiesForSet);

beforeEach(() => {
  mockedUseMounted.mockReturnValue(true);
  mockedGetFilterOptions.mockResolvedValue({
    categories: ['all', 'Pokemon', 'Trainer', 'Energy'],
    sets: [
      { id: 'sv99', name: 'Omega Set', totalCards: 1, releaseDate: '2025-01-01' },
      { id: 'sv01', name: 'Base Set', totalCards: 1, releaseDate: '2023-01-01' },
      { id: 'xy99', name: 'Alpha Set', totalCards: 1, releaseDate: '2024-01-01' },
    ],
    pokemonTypes: ['Fire', 'Water'],
    trainerTypes: ['Item', 'Supporter'],
    energyTypes: ['Basic', 'Special'],
    stages: ['Basic', 'Stage1'],
    rarities: ['Common', 'Rare', 'Uncommon', 'Ultra Rare'],
  });
  mockedGetRaritiesForSet.mockResolvedValue(['Common', 'Uncommon']);
});

describe('TCGFilters', () => {
  it('defaults to the latest set when no set is selected', async () => {
    const onChange = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TCGFilters
            filters={{
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onChange={onChange}
          />
        </QueryClientProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedSet: 'sv99',
        }),
      );
    });
  });

  it('clears an invalid rarity when the set rarities change', async () => {
    const onChange = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TCGFilters
            filters={{
              selectedSet: 'sv01',
              selectedRarity: 'Rare',
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onChange={onChange}
          />
        </QueryClientProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedSet: 'sv01',
          selectedRarity: null,
        }),
      );
    });
  });

  it('shows only the rarities available in the selected set in simple mode', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TCGFilters
            mode="simple"
            filters={{
              selectedSet: 'sv01',
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onChange={vi.fn()}
          />
        </QueryClientProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(mockedGetRaritiesForSet).toHaveBeenCalledWith('sv01', 'en');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Common' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Uncommon' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rare' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ultra Rare' })).not.toBeInTheDocument();
  });

  it('shows all database rarities when no set is selected', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TCGFilters
            mode="simple"
            filters={{
              selectedSet: null,
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onChange={vi.fn()}
          />
        </QueryClientProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Common' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Rare' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ultra Rare' })).toBeInTheDocument();
  });

  it('hides category controls in simple mode', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TCGFilters
            mode="simple"
            filters={{
              selectedSet: 'sv01',
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onChange={vi.fn()}
          />
        </QueryClientProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Common' })).toBeInTheDocument();
    });

    expect(screen.queryByText(i18n.t('tcg.card_category'))).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('tcg.card_category_all') })).not.toBeInTheDocument();
  });

  it('removes category shortcuts from advanced mode', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TCGFilters
            filters={{
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onChange={vi.fn()}
          />
        </QueryClientProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: i18n.t('tcg.filter_set') })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: i18n.t('tcg.card_category_all') })).not.toBeInTheDocument();
  });
});
