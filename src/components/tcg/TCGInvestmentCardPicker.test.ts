import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';

const fixture = vi.hoisted(() => ({
  search: 'missing',
  cards: [] as TCGCard[],
  searchQuery: undefined as undefined | ((context: { signal?: AbortSignal; pageParam: number }) => unknown),
  exactQuery: undefined as undefined | ((context: { signal?: AbortSignal }) => unknown),
  searchCards: vi.fn().mockResolvedValue({ cards: [], hasMore: false }),
  getTCGCard: vi.fn().mockResolvedValue(null),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useState: () => [fixture.search, vi.fn()] };
});
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: { queryFn: typeof fixture.searchQuery }) => {
    fixture.searchQuery = options.queryFn;
    return { data: { pages: [{ cards: fixture.cards }] }, isError: false, isPending: false, isFetching: false, hasNextPage: false };
  },
  useQuery: (options: { queryFn: typeof fixture.exactQuery }) => {
    fixture.exactQuery = options.queryFn;
    return { data: null, isFetching: false };
  },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('@/lib/api/tcg', () => ({ DEFAULT_TCG_CARD_FILTERS: {}, searchCards: fixture.searchCards, getTCGCard: fixture.getTCGCard }));
vi.mock('./TCGImageWithFallback', () => ({ TCGImageWithFallback: () => null }));

import { TCGInvestmentCardPicker } from './TCGInvestmentCardPicker';

const renderPicker = () => renderToStaticMarkup(createElement(TCGInvestmentCardPicker, { language: 'fr', onSelect: vi.fn() }));

beforeEach(() => {
  fixture.search = 'missing';
  fixture.cards = [];
  vi.clearAllMocks();
});

describe('purchase card picker', () => {
  it('explains the search minimum and uses a card-specific empty result', () => {
    const markup = renderPicker();
    expect(markup).toContain('investments.search_hint');
    expect(markup).toContain('investments.no_cards');
    expect(markup).not.toContain('tcg.custom_collections.no_results');
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
  });

  it('keeps both search and exact-ID requests in the selected card language', async () => {
    fixture.search = 'base1-1';
    renderPicker();
    await fixture.searchQuery?.({ pageParam: 1 });
    await fixture.exactQuery?.({});
    expect(fixture.searchCards).toHaveBeenCalledWith(expect.objectContaining({ searchTerm: 'base1-1' }), 'fr', 1, 12, undefined, undefined, undefined, false, { allowEnglishFallback: false });
    expect(fixture.getTCGCard).toHaveBeenCalledWith('base1-1', 'fr', undefined, { allowEnglishFallback: false });
  });

  it('shows finish-specific euro references, source and date outside the selection button', () => {
    fixture.cards = [{
      id: 'base1-1', localId: '1', name: 'Alakazam',
      variants: { normal: true, holo: true, reverse: true },
      pricing: { cardmarket: { unit: 'EUR', trend: 35, 'trend-holo': 50, updated: '2026-10-18' } },
    }];
    const markup = renderPicker();
    expect(markup).toContain('€35.00');
    expect(markup).toContain('€50.00');
    expect(markup).toContain('Cardmarket');
    expect(markup).toContain('Oct 18, 2026');
    expect(markup).not.toContain('tcg.collection_variant_reverse');
    const selectionButton = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/)?.[0];
    expect(selectionButton).toContain('Alakazam');
    expect(selectionButton).not.toContain('Cardmarket');
    expect(selectionButton).not.toMatch(/<a\b/);
    expect(markup).toContain('investments.reference_note');
  });

  it('does not describe an unpriced summary as a confirmed absence at the provider', () => {
    fixture.cards = [{ id: 'base1-1', localId: '1', name: 'Alakazam' }];
    const markup = renderPicker();
    expect(markup).toContain('investments.reference_preview_missing');
    expect(markup).not.toContain('investments.reference_missing');
  });
});
