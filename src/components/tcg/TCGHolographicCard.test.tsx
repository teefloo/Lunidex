/* eslint-disable @next/next/no-img-element */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import { TCGHolographicCard } from './TCGHolographicCard';

vi.mock('next/image', () => ({
  default: (props: ComponentProps<'img'> & { priority?: boolean; unoptimized?: boolean }) => {
    const { priority, unoptimized, alt = '', ...imageProps } = props;
    void priority;
    void unoptimized;
    return <img {...imageProps} alt={alt} />;
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: { name?: string }) => `Open ${values?.name ?? 'card'}`,
  }),
}));

const card = (image: string, name: string): TCGCard => ({
  id: 'me05-001',
  localId: '001',
  name,
  image,
  set: { id: 'me05', name: 'Mega Evolution' },
});

describe('TCGHolographicCard', () => {
  it('restarts image fallbacks when a reused card receives new image candidates', () => {
    const { rerender } = render(
      <TCGHolographicCard card={card('https://assets.tcgdex.net/fr/me/me04/001', 'Previous Tropius')} />,
    );
    for (let index = 0; index < 6; index += 1) {
      fireEvent.error(screen.getByRole('img', { name: 'Previous Tropius' }));
    }
    expect(screen.getByRole('img', { name: 'Previous Tropius' })).toHaveAttribute('src', '/images/card-placeholder.svg');

    rerender(
      <TCGHolographicCard card={card('https://assets.tcgdex.net/fr/me/me05/001', 'Tropius')} />,
    );

    expect(screen.getByRole('img', { name: 'Tropius' })).toHaveAttribute(
      'src',
      'https://assets.tcgdex.net/fr/me/me05/001/high.webp',
    );
  });
});
