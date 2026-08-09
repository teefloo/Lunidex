import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import type { TCGCard } from '@/types/tcg';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    <div
      role="img"
      aria-label={props.alt ?? ''}
      data-src={String(props.src)}
      data-unoptimized={String(props.unoptimized ?? false)}
    />
  ),
}));

import { TCGCardImage } from './TCGCardImage';

const card: TCGCard = {
  id: 'basep-24',
  localId: '24',
  name: 'Pikachu',
  image: 'https://assets.tcgdex.net/en/base/basep/24',
};

const cardTraderCard: TCGCard = {
  id: 'wotc-presentation-009-165r',
  localId: '009/165R',
  name: 'Blastoise presentation card',
  image: 'https://www.cardtrader.com/uploads/blueprints/image/273508/show_blastoise.jpg',
};

describe('TCGCardImage', () => {
  it('serves TCG CDN images directly without the Vercel image proxy', () => {
    render(<TCGCardImage card={card} alt="Pikachu card" />);

    const image = screen.getByRole('img', { name: 'Pikachu card' });
    expect(image).toHaveAttribute(
      'data-src',
      'https://assets.tcgdex.net/en/base/basep/24/high.webp',
    );
    expect(image).toHaveAttribute('data-unoptimized', 'true');
  });

  it('optimizes non-CDN fallback artwork through Next image', () => {
    render(<TCGCardImage card={cardTraderCard} alt="Blastoise card" />);

    const image = screen.getByRole('img', { name: 'Blastoise card' });
    expect(image).toHaveAttribute('data-unoptimized', 'false');
  });
});
