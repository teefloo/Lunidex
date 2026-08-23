import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => {
    delete props.prefetch;
    return <a href={href} {...props}>{children}</a>;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/pokedex',
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useClientLanguage: () => 'fr',
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => ({
      'header.navigation': 'Navigation principale',
      'header.menu_description': 'Parcourez la navigation Lunidex et les outils du compte.',
      'header.open_menu': 'Ouvrir le menu',
      'common.close': 'Fermer',
      'nav.more': 'Plus',
      'nav.tools': 'Outils',
      'nav.pokedex': 'Pokédex',
      'nav.team': 'Équipe',
      'nav.tcg': 'Catalogue TCG',
      'nav.collection': 'Collection',
      'nav.quiz': 'Quiz',
      'nav.blog': 'Blog',
      'nav.compare': 'Comparer',
    }[key] ?? options?.defaultValue ?? key),
  }),
}));

vi.mock('./HeaderLogo', () => ({
  HeaderLogo: () => <a href="/fr" aria-label="Accueil">Lunidex</a>,
}));

vi.mock('./HeaderActions', () => ({
  HeaderActions: ({ onInteraction }: { onInteraction?: () => void }) => (
    <button type="button" onClick={onInteraction} aria-label="Search">Search</button>
  ),
}));

import { HeaderMobileNav } from './HeaderMobileNav';

describe('HeaderMobileNav', () => {
  it('keeps navigation, tools disclosure, Escape, and focus restoration accessible', () => {
    render(<HeaderMobileNav />);

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu' });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Pokédex' })).toHaveAttribute('href', '/fr/pokedex');
    expect(within(dialog).queryByRole('link', { name: 'Comparer' })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Outils' }));
    expect(within(dialog).getByRole('link', { name: 'Comparer' })).toHaveAttribute('href', '/fr/compare');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  }, 10000);
});
