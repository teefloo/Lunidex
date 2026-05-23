import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { getFilterOptions, getRaritiesForSet, searchCards } from '@/lib/api/tcg';
import { TCGResearchDesk } from './TCGResearchDesk';

const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams('set=me03&rarity=Illustration+sp%C3%A9ciale+rare&sortBy=name&sortOrder=asc');

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
    searchCards: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: replaceMock,
    prefetch: vi.fn(),
  }),
  usePathname: () => '/tcg',
  useSearchParams: () => currentSearchParams,
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <div aria-label={props.alt || ''} />,
}));

vi.mock('@/components/ui/PokeballIcon', () => ({
  PokeballIcon: () => null,
}));

vi.mock('@/components/ui/sheet', () => {
  const FragmentWrapper = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    Sheet: FragmentWrapper,
    SheetContent: FragmentWrapper,
    SheetHeader: FragmentWrapper,
    SheetTitle: FragmentWrapper,
  };
});

vi.mock('./TCGCardItem', () => ({
  TCGCardItem: () => null,
}));

vi.mock('./TCGCardDetailModal', () => ({
  TCGCardDetailModal: () => null,
}));

const mockedUseMounted = vi.mocked(useMounted);
const mockedGetFilterOptions = vi.mocked(getFilterOptions);
const mockedGetRaritiesForSet = vi.mocked(getRaritiesForSet);
const mockedSearchCards = vi.mocked(searchCards);

function renderResearchDesk(initialLatestSet?: { id: string; name: string } | null) {
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
        <TCGResearchDesk initialLatestSet={initialLatestSet ?? undefined} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  currentSearchParams = new URLSearchParams('set=me03&rarity=Illustration+sp%C3%A9ciale+rare&sortBy=name&sortOrder=asc');
  replaceMock.mockReset();
  mockedSearchCards.mockReset();
  mockedUseMounted.mockReturnValue(true);
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
    writable: true,
  });
  mockedGetFilterOptions.mockResolvedValue({
    categories: ['all', 'Pokemon', 'Trainer', 'Energy'],
    sets: [
      { id: 'me03', name: 'Perfect Order', totalCards: 124, releaseDate: '2026-05-16' },
      { id: 'sv01', name: 'Base Set', totalCards: 198, releaseDate: '2023-03-31' },
    ],
    pokemonTypes: ['Grass', 'Lightning'],
    trainerTypes: ['Item', 'Supporter'],
    energyTypes: ['Basic', 'Special'],
    stages: ['Basic', 'Stage1'],
    rarities: ['Common', 'Special Illustration Rare'],
  });
  mockedGetRaritiesForSet.mockResolvedValue(['Common', 'Special Illustration Rare']);
  mockedSearchCards.mockResolvedValue({
    cards: [],
    hasMore: false,
  });
});

describe('TCGResearchDesk', () => {
  it('removes the redundant category shortcuts from the TCG page', async () => {
    currentSearchParams = new URLSearchParams('category=Trainer&sortBy=number&sortOrder=asc');

    renderResearchDesk({ id: 'me03', name: 'Perfect Order' });

    await waitFor(() => {
      expect(mockedSearchCards).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: 'Pokémon' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dresseur' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('tcg.card_category_all') })).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  }, 10000);

  it('keeps the latest set selected by default even when a category is present in the URL without rewriting it', async () => {
    currentSearchParams = new URLSearchParams('category=Trainer&sortBy=number&sortOrder=asc');

    renderResearchDesk({ id: 'me03', name: 'Perfect Order' });

    await waitFor(() => {
      expect(mockedSearchCards).toHaveBeenCalled();
    });

    const [filtersArg] = mockedSearchCards.mock.calls.at(-1) ?? [];

    expect(filtersArg).toEqual(expect.objectContaining({
      selectedSet: 'me03',
      selectedCategory: 'Trainer',
    }));
    expect(screen.getAllByText('Perfect Order')).not.toHaveLength(0);
    expect(replaceMock).not.toHaveBeenCalled();
  }, 10000);
});
