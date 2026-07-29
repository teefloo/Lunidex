import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGCollectionStartLink } from './TCGCollectionStartLink';

vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }) }));

afterEach(() => act(() => { usePrimeDexStore.setState({ tcgOwnedCards: [], tcgActiveSets: [], _hasHydrated: true }); }));

describe('TCGCollectionStartLink', () => {
  it('offers a localized collection resume link to a user with local cards', () => {
    act(() => { usePrimeDexStore.setState({ tcgOwnedCards: ['sv01-1'], tcgActiveSets: ['sv01'], _hasHydrated: true }); });
    render(<TCGCollectionStartLink />);

    expect(screen.getByRole('link', { name: /resume my collection/i })).toHaveAttribute('href', '/fr/tcg/collection/sv01');
  });
});
