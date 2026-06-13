import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TypeBadge from './TypeBadge';
import { TYPE_COLORS } from '@/types/pokemon';

describe('TypeBadge', () => {
  it('renders the type label', () => {
    render(<TypeBadge type="fire" />);
    expect(screen.getByText('fire')).toBeInTheDocument();
  });

  it('applies the type color to border and background', () => {
    render(<TypeBadge type="water" />);
    const badge = screen.getByText('water');
    expect(badge).toHaveStyle({ borderColor: TYPE_COLORS.water });
  });

  it('falls back to the default color for an unknown type', () => {
    render(<TypeBadge type="mystery" />);
    const badge = screen.getByText('mystery');
    expect(badge).toHaveStyle({ borderColor: '#A8A77A' });
  });

  it('applies size-specific classes', () => {
    const { rerender } = render(<TypeBadge type="grass" size="sm" />);
    expect(screen.getByText('grass').className).toContain('text-[10px]');

    rerender(<TypeBadge type="grass" size="lg" />);
    expect(screen.getByText('grass').className).toContain('px-4');
  });

  it('merges a custom className', () => {
    render(<TypeBadge type="electric" className="custom-cls" />);
    expect(screen.getByText('electric').className).toContain('custom-cls');
  });
});
