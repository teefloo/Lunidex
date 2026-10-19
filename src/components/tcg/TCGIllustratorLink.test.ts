import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({
  t: (key: string, values?: { artist?: string }) => key === 'tcg.open_illustrator_cards'
    ? `View cards illustrated by ${values?.artist}`
    : key,
}) }));

import { TCGIllustratorLink } from './TCGIllustratorLink';

describe('TCGIllustratorLink', () => {
  it('renders a locale-aware, keyboard-accessible link for the artist credit', () => {
    const markup = renderToStaticMarkup(createElement(TCGIllustratorLink, {
      artist: 'Shinji Kanda',
      tcgLanguage: 'fr',
    }));

    expect(markup).toContain('href="/fr/tcg/illustrators/shinji%20kanda?tcgLang=fr"');
    expect(markup).toContain('aria-label="View cards illustrated by Shinji Kanda"');
    expect(markup).toContain('focus-visible:ring-2');
    expect(markup).toContain('>Shinji Kanda</a>');
  });
});
