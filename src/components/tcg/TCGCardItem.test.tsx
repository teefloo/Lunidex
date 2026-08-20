import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { TCGCard } from '@/types/tcg';
import { TCGCardItem } from './TCGCardItem';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useLocaleHref: () => (path: string) => path,
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector?: (state: { toggleTCGOwned: () => void; tcgOwnedCards: string[] }) => unknown) => {
    const state = {
      toggleTCGOwned: vi.fn(),
      tcgOwnedCards: [],
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('./TCGHolographicCard', () => ({
  TCGHolographicCard: ({ quality }: { quality?: string }) => (
    <div data-testid="holographic-card" data-quality={quality} />
  ),
}));

const card: TCGCard = {
  id: 'me05-001',
  localId: '001',
  name: 'Pikachu',
  image: 'https://assets.tcgdex.net/fr/me/me05/001',
};

describe('TCGCardItem', () => {
  it('requests high-resolution artwork for catalog cards', () => {
    render(<TCGCardItem card={card} />);

    expect(screen.getByTestId('holographic-card')).toHaveAttribute('data-quality', 'high');
  });
});
