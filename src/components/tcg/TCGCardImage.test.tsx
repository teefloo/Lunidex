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
      data-unoptimized={String(props.unoptimized)}
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

describe('TCGCardImage', () => {
  it('loads the TCG CDN image directly without the Next image proxy', () => {
    render(<TCGCardImage card={card} alt="Pikachu card" />);

    const image = screen.getByRole('img', { name: 'Pikachu card' });
    expect(image).toHaveAttribute(
      'data-src',
      'https://assets.tcgdex.net/en/base/basep/24/high.webp',
    );
    expect(image).toHaveAttribute('data-unoptimized', 'true');
  });
});
