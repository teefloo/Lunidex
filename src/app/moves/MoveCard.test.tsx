import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MoveListItem } from '@/types/pokemon';
import { MoveCard } from './MovesPageClient';

const move: MoveListItem = {
  id: 1,
  name: 'pound',
  power: 40,
  accuracy: 100,
  pp: 35,
  priority: 0,
  type: 'normal',
  damage_class: 'physical',
  localizedName: 'Pound',
  description: 'A basic attack.',
  generation_id: 1,
};

describe('MoveCard interactions', () => {
  it('uses separate preview and details controls without nesting them', () => {
    render(<MoveCard move={move} index={0} onClick={vi.fn()} t={(key) => key} />);
    const article = screen.getByRole('article');

    expect(screen.getByRole('button', { name: 'moves_page.preview' })).toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(article.querySelector('button a')).toBeNull();
    expect(article.querySelector('a button')).toBeNull();
  });
});
