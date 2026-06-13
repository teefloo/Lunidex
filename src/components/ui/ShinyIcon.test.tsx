import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShinyIcon } from './ShinyIcon';

describe('ShinyIcon', () => {
  it('renders an accessible labelled SVG', () => {
    const { container, getByText } = render(<ShinyIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-labelledby', 'shiny-title');
    expect(getByText('Shiny')).toBeInTheDocument();
  });

  it('forwards SVG props such as className', () => {
    const { container } = render(<ShinyIcon className="size-4 text-amber-400" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('size-4');
  });
});
