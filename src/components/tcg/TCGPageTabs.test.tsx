import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TCGPageTabs } from './TCGPageTabs';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tcg',
}));

describe('TCGPageTabs mobile layout', () => {
  it('keeps the TCG and friends tabs touch-sized on mobile', () => {
    render(<TCGPageTabs />);
    const tabs = screen.getAllByRole('link');

    expect(tabs).toHaveLength(5);
    expect(tabs.every((tab) => tab.className.includes('min-h-11'))).toBe(true);
  });
});
