import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import { usePrimeDexStore } from '@/store/primedex';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => path,
  useClientLanguage: () => 'en',
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('./TCGImageWithFallback', () => ({
  TCGImageWithFallback: () => createElement('img', { alt: 'Pokémon TCG card' }),
}));

import { TCGCardDetailRoute, getQueryReturnHref } from './TCGCardDetailRoute';

describe('TCGCardDetailRoute', () => {
  it('keeps the first render independent of already hydrated comparison preferences', () => {
    const previous = usePrimeDexStore.getState().tcgCompareList;
    const card: TCGCard = { id: '2024sv-3', localId: '3', name: 'Miraidon' };
    usePrimeDexStore.setState({ tcgCompareList: [card.id] });
    try {
      const markup = renderToStaticMarkup(createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(TCGCardDetailRoute, { card }),
      ));
      expect(markup).toContain('tcg.add_to_compare');
      expect(markup).not.toContain('tcg.remove_from_compare');
    } finally {
      usePrimeDexStore.setState({ tcgCompareList: previous });
    }
  });

  it('provides a main landmark without duplicating the shared skip-link target', () => {
    const card: TCGCard = { id: '2024sv-3', localId: '3', name: 'Miraidon' };
    const markup = renderToStaticMarkup(createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(TCGCardDetailRoute, { card }),
    ));

    expect(markup).toMatch(/<main(?:\s|>)/);
    expect(markup).not.toMatch(/<main[^>]*id="main-content"/);
    expect(markup).toMatch(/<h1[^>]*>Miraidon<\/h1>/);
    expect(markup).not.toContain('role="dialog"');
    expect(markup).toContain('tcg.add_to_compare');
    expect(markup).toContain('tcg.mark_wishlist');
    expect(markup).toContain('detail.share');
  });
});

const frenchLocaleHref = (path: string) => `/fr${path}`;

describe('getQueryReturnHref', () => {
  it('preserves a validated catalog return path and its search state', () => {
    const searchParams = new URLSearchParams({
      from: '/fr/tcg?tcgLang=ja&set=base1&view=grid',
    });

    expect(getQueryReturnHref(searchParams, frenchLocaleHref)).toBe('/fr/tcg?tcgLang=ja&set=base1&view=grid');
  });

  it('does not accept an external return URL and retains only catalog filters', () => {
    const searchParams = new URLSearchParams({
      from: 'https://attacker.invalid/tcg',
      q: 'charizard',
      view: 'grid',
    });

    expect(getQueryReturnHref(searchParams, frenchLocaleHref)).toBe('/fr/tcg?q=charizard&view=grid');
  });

  it('ignores card-to-card return paths', () => {
    const searchParams = new URLSearchParams({ from: '/en/tcg/cards/base1-5' });

    expect(getQueryReturnHref(searchParams, frenchLocaleHref)).toBeUndefined();
  });
});
