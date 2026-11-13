import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TCGCustomCollectionBinderPage, type TCGCustomCollectionBinderCardDetail } from './TCGCustomCollectionBinderPage';

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode } & Record<string, unknown>) =>
      React.createElement('a', { href, ...props }, children),
  };
});

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => path,
  useClientLanguage: () => 'en',
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { page?: number; total?: number; name?: string; copy?: number }) => {
      if (key === 'tcg.custom_collections.page_status') return `Page ${options?.page} of ${options?.total}`;
      if (key === 'tcg.custom_collections.card_instance') return `${options?.name}, copy ${options?.copy}`;
      if (key === 'tcg.custom_collections.card_actions') return `Actions: ${options?.name}`;
      if (key === 'tcg.custom_collections.drag_card_copy') return `Drag ${options?.name}, copy ${options?.copy}`;
      return key;
    },
  }),
}));

vi.mock('./TCGImageWithFallback', () => ({
  TCGImageWithFallback: ({ alt }: { alt: string }) => createElement('img', { alt }),
}));

const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';

function detail(cardId: string, quantity = 1, copyIndex = 0): TCGCustomCollectionBinderCardDetail {
  const cardName = cardId === 'base1-4' ? 'Charizard' : 'Alakazam';
  return {
    ref: {
      collectionId,
      cardId,
      cardName,
      language: 'en',
      addedAt: '2026-10-19T10:00:00.000Z',
      quantity,
    },
    layoutRef: { cardId, language: 'en', copyIndex },
    card: { id: cardId, localId: cardId.split('-').at(-1) ?? cardId, name: cardName, set: { id: 'base1', name: 'Base Set' } },
    unavailable: false,
  };
}

function renderPage({
  cards = [],
  emptySlots = 4,
  loading = false,
  columns = 2,
  rows = 2,
  capacity = 4,
}: {
  cards?: readonly TCGCustomCollectionBinderCardDetail[];
  emptySlots?: number;
  loading?: boolean;
  columns?: number;
  rows?: number;
  capacity?: number;
} = {}) {
  return renderToStaticMarkup(createElement(TCGCustomCollectionBinderPage, {
    collectionName: 'Classic set',
    cards,
    page: 2,
    pageCount: 3,
    capacity,
    emptySlots,
    columns,
    rows,
    totalCards: cards.length,
    canReorder: true,
    displayCurrency: 'USD',
    loading,
    onQuantityCommit: () => true,
    onRemove: () => undefined,
    onMoveCard: () => undefined,
  }));
}

describe('TCGCustomCollectionBinderPage', () => {
  it('renders the full configured number of empty pockets for an empty binder page', () => {
    const markup = renderPage();

    expect(markup).toContain('Page 2 of 3');
    expect(markup).toContain('repeat(2, minmax(0, 1fr))');
    expect(markup).toContain('data-binder-pocket-target="232"');
    expect(markup).toContain('data-binder-page-target="472"');
    expect(markup).toContain('md:w-[var(--binder-page-width)]');
    expect(markup.match(/<li[^>]*aria-label="tcg\.custom_collections\.empty_pocket"/g)).toHaveLength(4);
  });

  it('derives the desktop binder width from the selected column count', () => {
    const markup = renderPage({ columns: 4, rows: 3, capacity: 12, emptySlots: 12 });

    expect(markup).toContain('data-binder-pocket-target="232"');
    expect(markup).toContain('data-binder-page-target="952"');
    expect(markup).toContain('--binder-page-width:min(100%, 952px)');
  });

  it('renders card details below artwork and preserves empty pockets on a partial page', () => {
    const markup = renderPage({ cards: [detail('base1-4')], emptySlots: 3 });

    expect(markup).toContain('alt="Charizard"');
    expect(markup).toContain('Base Set · 4');
    expect(markup.match(/<li[^>]*aria-label="tcg\.custom_collections\.empty_pocket"/g)).toHaveLength(3);
    expect(markup.indexOf('alt="Charizard"')).toBeLessThan(markup.indexOf('>Charizard</a>'));
  });

  it('renders a full page without extra empty pockets', () => {
    const markup = renderPage({ cards: [detail('base1-4'), detail('base1-1'), detail('base1-10'), detail('base1-20')], emptySlots: 0 });

    expect(markup.match(/<li/g)).toHaveLength(4);
    expect(markup).not.toContain('tcg.custom_collections.empty_pocket');
  });

  it('renders capacity-sized loading placeholders', () => {
    const markup = renderPage({ loading: true, emptySlots: 4 });

    expect(markup).toContain('aria-busy="true"');
    expect(markup.match(/<li/g)).toHaveLength(4);
    expect(markup).not.toContain('tcg.custom_collections.empty_pocket');
  });

  it('renders an accessible action trigger outside artwork without expanding grid items', () => {
    const markup = renderPage({ cards: [detail('base1-4')], emptySlots: 3 });

    expect(markup).toContain('data-sortable-handle="true"');
    expect(markup).toContain('aria-label="tcg.custom_collections.drag_card"');
    expect(markup).toContain('aria-label="Actions: Charizard"');
    expect(markup.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(2);
    const imageEnd = markup.indexOf('</a>');
    expect(imageEnd).toBeGreaterThan(-1);
    expect(markup.indexOf('data-sortable-handle="true"')).toBeGreaterThan(imageEnd);
    expect(markup.indexOf('aria-label="Actions: Charizard"')).toBeGreaterThan(imageEnd);
    expect(markup).toContain('data-binder-actions-presentation="dialog"');
    expect(markup).not.toContain('data-binder-actions-fields');
    expect(markup).not.toContain('tcg.custom_collections.move_earlier');
  });

  it('gives duplicated pockets stable, individually named controls', () => {
    const markup = renderPage({
      cards: [detail('base1-4', 2, 0), detail('base1-4', 2, 1)],
      emptySlots: 2,
    });

    expect(markup.match(/data-sortable-id="binder-card:base1-4:en:\d"/g)).toHaveLength(2);
    expect(markup).toContain('aria-label="Drag Charizard, copy 1"');
    expect(markup).toContain('aria-label="Drag Charizard, copy 2"');
    expect(markup).toContain('aria-label="Actions: Charizard, copy 1"');
    expect(markup).toContain('aria-label="Actions: Charizard, copy 2"');
  });
});
