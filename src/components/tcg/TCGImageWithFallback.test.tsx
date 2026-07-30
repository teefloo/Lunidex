/* eslint-disable @next/next/no-img-element */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TCGImageWithFallback } from './TCGImageWithFallback';

vi.mock('next/image', () => ({
  default: (props: ComponentProps<'img'> & { fill?: boolean; unoptimized?: boolean }) => {
    const { fill, unoptimized, alt = '', ...imageProps } = props;
    void fill;
    void unoptimized;
    return <img {...imageProps} alt={alt} />;
  },
}));

describe('TCGImageWithFallback', () => {
  it('advances through candidates after image errors', () => {
    render(<TCGImageWithFallback candidates={['/first.png', '/second.png']} alt="Card" width={64} height={88} />);

    fireEvent.error(screen.getByRole('img', { name: 'Card' }));

    expect(screen.getByRole('img', { name: 'Card' })).toHaveAttribute('src', '/second.png');
  });

  it('returns to the first candidate when the image changes', () => {
    const { rerender } = render(
      <TCGImageWithFallback candidates={['/first.png', '/fallback.png']} alt="Card" width={64} height={88} />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Card' }));

    rerender(
      <TCGImageWithFallback candidates={['/next.png', '/next-fallback.png']} alt="Next card" width={64} height={88} />,
    );

    expect(screen.getByRole('img', { name: 'Next card' })).toHaveAttribute('src', '/next.png');
  });
});
