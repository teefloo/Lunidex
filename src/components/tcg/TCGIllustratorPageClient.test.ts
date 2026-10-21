import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
  createElement('a', { ...props, href }, children) }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/tcg/illustrators/shinji%20kanda',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tcgLang=fr'),
}));
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, string | number>) => {
  if (key === 'tcg.illustrator_cards_count') return `${values?.count} cards in this language`;
  if (key === 'tcg.illustrator_page') return `Page ${values?.page} of ${values?.total}`;
  if (key === 'tcg.illustrator_back_to_catalog') return 'Back to the card catalog';
  return key;
} }) }));
vi.mock('./TCGCardItem', () => ({ TCGCardItem: ({ card }: { card: { id: string; name: string } }) =>
  createElement('div', { 'data-card-id': card.id }, card.name) }));
vi.mock('./TCGLanguageSelector', () => ({ TCGLanguageSelector: () => createElement('select', { 'aria-label': 'Card language' }) }));

import { TCGIllustratorPageClient } from './TCGIllustratorPageClient';

const baseGallery = {
  artist: 'Shinji Kanda',
  identity: 'shinji kanda',
  language: 'fr' as const,
  cards: [
    { id: 'swsh11-186', localId: '186', name: 'Giratina V' },
    { id: 'mep-024', localId: '024', name: 'Magmar' },
  ],
  total: 26,
  page: 1,
  pageCount: 2,
  hasUnavailableDetails: false,
  isUnavailable: false,
};

describe('TCGIllustratorPageClient', () => {
  it('shows the artist, exact card count, language control, and next page link', () => {
    const markup = renderToStaticMarkup(createElement(TCGIllustratorPageClient, { gallery: baseGallery }));

    expect(markup).toContain('<h1');
    expect(markup).toContain('Shinji Kanda</h1>');
    expect(markup).toContain('26 cards in this language');
    expect(markup).toContain('aria-label="Card language"');
    expect(markup).toContain('data-card-id="swsh11-186"');
    expect(markup).toContain('href="/fr/tcg/illustrators/shinji%20kanda?tcgLang=fr&amp;page=2"');
  });

  it('explains when a known illustrator has no cards in the selected language', () => {
    const markup = renderToStaticMarkup(createElement(TCGIllustratorPageClient, {
      gallery: { ...baseGallery, cards: [], total: 0, pageCount: 0 },
    }));

    expect(markup).toContain('tcg.illustrator_empty');
    expect(markup).not.toContain('data-card-id=');
  });

  it('shows a retry action when TCGdex could not load the illustrator catalog', () => {
    const markup = renderToStaticMarkup(createElement(TCGIllustratorPageClient, {
      gallery: { ...baseGallery, cards: [], total: 0, pageCount: 0, isUnavailable: true },
    }));

    expect(markup).toContain('tcg.illustrator_catalog_unavailable');
    expect(markup).toContain('tcg.illustrator_retry');
    expect(markup).not.toContain('tcg.illustrator_empty');
  });
});
