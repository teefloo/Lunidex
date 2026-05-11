import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/lib/i18n';
import { getAllPokemonSearchIndex } from '@/lib/api';
import { usePrimeDexStore } from '@/store/primedex';
import ComparePage from './page';

vi.mock('@/components/layout/Header', () => ({
  default: () => null,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: vi.fn(),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getAllPokemonSearchIndex: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/compare',
  useSearchParams: () => new URLSearchParams(),
}));

const mockedUsePrimeDexStore = vi.mocked(usePrimeDexStore);
const mockedGetAllPokemonSearchIndex = vi.mocked(getAllPokemonSearchIndex);

function renderComparePage() {
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
        <ComparePage />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

beforeEach(() => {
  mockedUsePrimeDexStore.mockReturnValue({
    language: 'en',
    systemLanguage: 'en',
    compareList: [],
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    clearCompare: vi.fn(),
  } as never);
  mockedGetAllPokemonSearchIndex.mockClear();
});

describe('ComparePage', () => {
  it('renders the public shell immediately instead of returning null', () => {
    renderComparePage();

    expect(screen.getByText(i18n.t('compare.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('compare.no_compare'))).toBeInTheDocument();
    const searchInput = screen.getByLabelText(i18n.t('search.placeholder'));
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.parentElement?.querySelector('svg')).toBeInTheDocument();
  });
});
