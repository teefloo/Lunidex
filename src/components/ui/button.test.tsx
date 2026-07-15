import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';

describe('Button touch variants', () => {
  it('provides the public touch and icon-touch variants', () => {
    expect(buttonVariants({ size: 'touch' })).toContain('min-h-11');
    expect(buttonVariants({ size: 'icon-touch' })).toContain('size-11');
  });

  it('renders a touch target with a native button role', () => {
    render(<Button size="touch">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('touch-target');
  });
});
