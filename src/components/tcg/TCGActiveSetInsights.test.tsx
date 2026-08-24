import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCollectionCard, TCGSet } from '@/types/tcg';
import { TCGActiveSetInsights } from './TCGActiveSetInsights';

const queryState = vi.hoisted(() => ({
  data: [] as TCGCollectionCard[],
  isLoading: false,
  isError: false,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => queryState,
}));

vi.mock('@/lib/api/tcg', () => ({
  fetchSetCollectionCards: vi.fn(),
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => path,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        'tcg.collection_view_set': 'Open {{name}} set',
        'tcg.collection_loading': 'Loading collection...',
        'tcg.collection_insights_error': 'Set details unavailable',
        'tcg.collection_value_unavailable': 'No pricing available',
        'tcg.collection_value_none_owned': 'No cards owned yet',
      };
      return (labels[key] ?? key).replace('{{name}}', String(values?.name ?? ''));
    },
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
}));

const set: TCGSet = {
  id: 'me05',
  name: 'Nuit Noire',
  cardCount: { total: 120, official: 84 },
};

describe('TCGActiveSetInsights', () => {
  beforeEach(() => {
    queryState.data = [];
    queryState.isLoading = false;
    queryState.isError = false;
  });

  it('does not treat an empty card response as a complete set', () => {
    render(
      <TCGActiveSetInsights
        set={set}
        ownedIds={new Set(['me05-001', 'me05-002'])}
        resolvedLang="fr"
      />,
    );

    expect(screen.getByText('2/120')).toBeInTheDocument();
    expect(screen.getByText(/Set details unavailable|collection_insights_error/)).toBeInTheDocument();
    expect(screen.queryByText('Every card collected!')).not.toBeInTheDocument();
  });

  it('distinguishes owned cards from missing pricing data', () => {
    queryState.data = [{
      id: 'me05-001',
      localId: '001',
      name: 'Tropius',
      rarity: null,
      value: null,
    }];

    render(
      <TCGActiveSetInsights
        set={set}
        ownedIds={new Set(['me05-001'])}
        resolvedLang="fr"
      />,
    );

    expect(screen.getByText('No pricing available')).toBeInTheDocument();
    expect(screen.queryByText('No cards owned yet')).not.toBeInTheDocument();
  });
});
