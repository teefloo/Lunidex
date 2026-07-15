import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TCGPageTabs } from './TCGPageTabs';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tcg',
}));

describe('TCGPageTabs mobile layout', () => {
  it('keeps four tabs in a two-column mobile grid with touch-sized links', () => {
    render(<TCGPageTabs />);
    const tabs = screen.getAllByRole('link');

    expect(tabs).toHaveLength(4);
    expect(tabs.every((tab) => tab.className.includes('min-h-11'))).toBe(true);
  });
});
