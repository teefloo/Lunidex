import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TCGSet } from '@/types/tcg';
import { TCGCollectionOverview } from './TCGCollectionOverview';

const mockStore = vi.hoisted(() => ({
  tcgOwnedCards: ['sv-base-1'],
  tcgActiveSets: [],
  toggleTCGActiveSet: vi.fn(),
}));

const collectionValueQuery = vi.hoisted(() => ({
  data: {
    groups: [{ currency: 'EUR', total: 2.5, count: 1 }],
    ownedCount: 1,
    pricedCount: 1,
  },
  isPending: false,
  isError: false,
}));

const translations = vi.hoisted(() => ({
  'tcg.collection_search_sets': 'Search sets...',
  'tcg.collection_sort_label': 'Sort sets',
  'tcg.collection_filter_in_progress': 'Show incomplete sets',
  'tcg.collection_results_summary': '{{count}} sets shown',
  'tcg.collection_reset_filters': 'Clear filters',
  'tcg.collection_missing_count': 'missing',
  'tcg.collection_view_set': 'Open {{name}} set',
  'tcg.collection_active_set_add': 'Add {{name}} to active sets',
  'tcg.collection_active_set_remove': 'Remove {{name}} from active sets',
  'tcg.collection_in_progress': 'In Progress',
  'tcg.collection_active_sets_singular': 'active set',
  'tcg.collection_complete': 'Complete',
  'tcg.collection_per_set': 'Per Set',
  'tcg.collection_recap_title': 'Collection Overview',
  'tcg.collection_total_owned': 'Total Owned',
  'tcg.collection_sets_completed': 'Sets Completed',
  'tcg.collection_value_estimate': 'My Collection Value',
  'tcg.collection_value_coverage': '{{priced}}/{{owned}} cards priced',
  'tcg.collection_value_unavailable': 'No pricing available',
  'tcg.collection_value_none_owned': 'No cards owned yet',
  'tcg.collection_loading': 'Loading collection...',
  'tcg.collection_overall_progress': 'Overall Progress',
  'tcg.collection_total_cards': 'Total Cards',
  'tcg.collection_active_sets_plural': 'active sets',
  'tcg.collection_active_insights': 'Active Set Insights',
  'tcg.collection_active_insights_hint': 'Mark sets as active.',
  'tcg.no_cards': 'No cards found',
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => path,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      let value = translations[key as keyof typeof translations] ?? key;
      for (const [name, replacement] of Object.entries(values ?? {})) {
        value = value.replace(`{{${name}}}`, String(replacement));
      }
      return value;
    },
  }),
}));

vi.mock('@/lib/api/tcg', () => ({
  fetchCollectionValue: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => collectionValueQuery,
}));

const sets: TCGSet[] = [
  {
    id: 'sv-base',
    name: 'Base Set',
    cardCount: { total: 3, official: 3 },
  },
  {
    id: 'sv-surge',
    name: 'Surging Sparks',
    cardCount: { total: 2, official: 2 },
  },
];

describe('TCGCollectionOverview responsive UX', () => {
  it('shows the total value and pricing coverage for the full collection', () => {
    render(<TCGCollectionOverview sets={sets} />);

    expect(screen.getByText('€2.50')).toBeInTheDocument();
    expect(screen.getByText('1/1 cards priced')).toBeInTheDocument();
  });

  it('keeps set navigation and active-set actions as separate controls', () => {
    render(<TCGCollectionOverview sets={sets} />);

    const setLink = screen.getByRole('link', { name: 'Open Base Set set' });
    const activeButton = screen.getByRole('button', { name: 'Add Base Set to active sets' });

    expect(setLink.querySelector('button')).toBeNull();
    expect(activeButton).toHaveAttribute('aria-pressed', 'false');
    expect(activeButton.className).toContain('min-h-11');
    expect(screen.getAllByText('2 missing')).toHaveLength(2);
  });

  it('exposes labelled touch-sized filters and announces visible set count', () => {
    render(<TCGCollectionOverview sets={sets} />);

    expect(screen.getByRole('textbox', { name: 'Search sets...' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort sets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show incomplete sets' })).toHaveClass('min-h-11');
    expect(screen.getByRole('status')).toHaveTextContent('2 sets shown');
  });

  it('offers a reset action when a search removes every set', () => {
    render(<TCGCollectionOverview sets={sets} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search sets...' }), {
      target: { value: 'does-not-exist' },
    });

    expect(screen.getByText('No cards found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('link', { name: 'Open Base Set set' })).toBeInTheDocument();
  });
});
