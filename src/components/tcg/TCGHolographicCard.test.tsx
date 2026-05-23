import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/lib/i18n';
import type { TCGCard } from '@/types/tcg';
import { TCGHolographicCard } from './TCGHolographicCard';

vi.mock('next/image', () => ({
  default: (props: { alt?: string; src?: string }) => (
    <div role="img" aria-label={props.alt || ''} data-src={props.src || ''} />
  ),
}));

const baseCard: TCGCard = {
  id: 'sv1-1',
  localId: '001',
  name: 'Charizard',
  image: 'https://assets.tcgdex.net/en/base/base1/001',
  rarity: 'Rare Holo',
  category: 'Pokemon',
};

describe('TCGHolographicCard', () => {
  it('renders the reference holo surface without a back face', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <TCGHolographicCard card={baseCard} />
      </I18nextProvider>,
    );

    const openCardButton = screen.getByRole('button', { name: i18n.t('tcg.open_card_detail', { name: baseCard.name }) });
    const cardRoot = openCardButton.closest('[data-rarity]') as HTMLElement;

    expect(cardRoot).toHaveAttribute('data-rarity', 'rare holo');
    expect(cardRoot.querySelector('.card__back')).toBeNull();
    expect(cardRoot.querySelector('.card__front > .card__shine')).toBeInTheDocument();
    expect(cardRoot.querySelector('.card__front > .card__glare')).toBeInTheDocument();
  });
});
