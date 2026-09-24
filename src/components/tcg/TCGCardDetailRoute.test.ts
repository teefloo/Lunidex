import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
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

import { TCGCardDetailRoute } from './TCGCardDetailRoute';

describe('TCGCardDetailRoute', () => {
  it('provides a main landmark without duplicating the shared skip-link target', () => {
    const card: TCGCard = { id: '2024sv-3', localId: '3', name: 'Miraidon' };
    const markup = renderToStaticMarkup(createElement(TCGCardDetailRoute, { card }));

    expect(markup).toMatch(/<main(?:\s|>)/);
    expect(markup).not.toMatch(/<main[^>]*id="main-content"/);
  });
});
