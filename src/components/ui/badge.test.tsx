import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from './badge';

describe('Badge', () => {
  it('renders its children inside a span by default', () => {
    render(<Badge>New</Badge>);
    const el = screen.getByText('New');
    expect(el.tagName).toBe('SPAN');
  });

  it('forwards a custom className', () => {
    render(<Badge className="custom-cls">Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('custom-cls');
  });

  it('renders a custom element via the render prop', () => {
    render(<Badge render={<a href="/x" />}>Link</Badge>);
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toHaveAttribute('href', '/x');
  });

  it('produces different class strings per variant', () => {
    expect(badgeVariants({ variant: 'default' })).not.toBe(
      badgeVariants({ variant: 'outline' }),
    );
  });

  it('defaults to the default variant styling', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-primary/90');
  });
});
