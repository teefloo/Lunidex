import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TCGResearchDesk } from './TCGResearchDesk';

const navigation = vi.hoisted(() => {
  const state = {
    replace: vi.fn(),
    searchParams: new URLSearchParams('sortBy=id&sortOrder=asc'),
  };

  state.replace.mockImplementation((href: string) => {
    state.searchParams = new URLSearchParams(href.split('?')[1] ?? '');
  });

  return state;
});

const store = vi.hoisted(() => ({
  language: 'fr',
  systemLanguage: 'fr',
  tcgOwnedCards: [],
  tcgWishlistCards: [],
}));

const translations = vi.hoisted(() => ({
  'tcg.all_collections': 'Toutes les collections',
  'tcg.filter_set': 'Extension',
  'tcg.discover_title': 'Découvrir',
  'tcg.page_title': 'Catalogue Pokémon TCG',
  'tcg.discover_subtitle': 'Explorez les cartes',
  'tcg.search_placeholder': 'Rechercher',
  'tcg.sort_label': 'Trier les cartes',
  'tcg.sort_name_asc': 'Nom A-Z',
  'tcg.sort_name_desc': 'Nom Z-A',
  'tcg.sort_number_asc': 'Numéro croissant',
  'tcg.sort_number_desc': 'Numéro décroissant',
  'tcg.sort_id_asc': 'ID A-Z',
  'tcg.sort_id_desc': 'ID Z-A',
  'tcg.sort_hp_desc': 'PV décroissants',
  'tcg.sort_hp_asc': 'PV croissants',
  'tcg.sort_rarity_asc': 'Rareté A-Z',
  'tcg.sort_rarity_desc': 'Rareté Z-A',
  'tcg.filters': 'Filtres',
  'tcg.cards_found': 'Cartes trouvées',
  'tcg.card_count_in_set': '{{count}} cartes dans {{set}}',
  'collection_guide.eyebrow': 'Guide de collection',
  'collection_guide.nav_label': 'Guide du suivi de collection Pokémon',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/tcg',
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => ({
    data: queryKey[1] === 'filter-options'
      ? {
        sets: [
          { id: 'previous-set', name: 'Collection précédente', releaseDate: '2025-01-01' },
          { id: 'latest-set', name: 'Dernière collection', releaseDate: '2026-01-01' },
        ],
      }
      : {
        cards: [{ id: 'latest-set-1', localId: '1', name: 'Pikachu' }],
      },
    isFetching: false,
    isLoading: false,
  }),
  useInfiniteQuery: () => ({
    data: {
      pages: [{ cards: [{ id: 'latest-set-1', localId: '1', name: 'Pikachu' }], hasMore: false }],
    },
    isFetching: false,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector?: (state: typeof store) => unknown) => selector ? selector(store) : store,
}));

vi.mock('@/lib/i18n', () => ({
  persistLanguageCookie: vi.fn(),
  useTranslation: () => ({
    t: (key: string, values?: { count?: string | number; set?: string | number }) => {
      let translation = translations[key as keyof typeof translations] ?? key;
      if (values?.count !== undefined) translation = translation.replace('{{count}}', String(values.count));
      if (values?.set !== undefined) translation = translation.replace('{{set}}', String(values.set));
      return translation;
    },
  }),
}));

vi.mock('@/lib/api/tcg', () => ({
  DEFAULT_TCG_CARD_FILTERS: {
    selectedCategory: 'all',
    sortBy: 'id',
    sortOrder: 'asc',
    ownedState: 'all',
  },
  getFilterOptions: vi.fn(),
  isTcgLangLimited: () => false,
  searchCards: vi.fn(),
}));

vi.mock('@/lib/api/keys', () => ({
  tcgKeys: {
    filterOptions: (language: string) => ['tcg', 'filter-options', language],
    catalog: () => ['tcg', 'catalog'],
  },
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./TCGCardDetailModal', () => ({
  TCGCardDetailModal: () => null,
}));

vi.mock('./TCGCardItem', () => ({
  TCGCardItem: () => null,
}));

vi.mock('./TCGFilters', () => ({
  TCGFilters: () => null,
}));

vi.mock('./TCGUnsupportedLangBanner', () => ({
  TCGDataLangBanner: () => null,
}));

describe('TCGResearchDesk collection selector', () => {
  it('lists collections, selects the active collection, and synchronizes the set query parameter', async () => {
    render(<TCGResearchDesk initialLatestSet={{ id: 'latest-set', name: 'Dernière collection' }} />);

    const collectionSelect = screen.getByRole('combobox', { name: 'Extension' });
    expect(collectionSelect).toHaveValue('latest-set');
    expect(screen.getByRole('option', { name: 'Toutes les collections' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Dernière collection' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Collection précédente' })).toBeInTheDocument();

    fireEvent.change(collectionSelect, { target: { value: 'previous-set' } });

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenLastCalledWith(
        '/fr/tcg?set=previous-set&sortBy=id&sortOrder=asc',
        { scroll: false },
      );
    });

    fireEvent.change(collectionSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenLastCalledWith(
        '/fr/tcg?sortBy=id&sortOrder=asc',
        { scroll: false },
      );
    });
  });

  it('keeps the collection guide inside the discovery hero with a localized link', () => {
    window.history.pushState({}, '', '/fr/tcg');
    render(<TCGResearchDesk initialLatestSet={{ id: 'latest-set', name: 'Dernière collection' }} />);

    expect(screen.getByRole('link', { name: 'Guide du suivi de collection Pokémon' })).toHaveAttribute(
      'href',
      '/fr/guides/pokemon-card-collection-tracker',
    );
  });
});
