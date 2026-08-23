import { render, screen } from '@testing-library/react';
import { Circle } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('uses the standard variant by default and exposes shared landmarks', () => {
    render(<PageHeader icon={Circle} title="Team builder" description="Build a balanced team." />);

    const section = screen.getByRole('heading', { name: 'Team builder' }).closest('section');

    expect(section).toHaveClass('page-header', 'page-header-standard');
    expect(section?.querySelector('.page-header-surface')).toBeInTheDocument();
    expect(section?.querySelector('.page-header-icon')).toBeInTheDocument();
    expect(screen.getByText('Build a balanced team.')).toBeInTheDocument();
  });

  it.each(['hero', 'compact'] as const)('supports the %s variant', (variant) => {
    render(<PageHeader icon={Circle} title={`${variant} header`} variant={variant} />);

    expect(screen.getByRole('heading', { name: `${variant} header` }).closest('section')).toHaveClass(
      `page-header-${variant}`,
    );
  });
});
